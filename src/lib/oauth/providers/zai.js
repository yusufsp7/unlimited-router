import crypto from "node:crypto";
import { ZAI_CONFIG } from "../constants/oauth.js";

/**
 * Z.AI login — the ZCode CLI device flow (zcode.z.ai/api/v1/oauth/cli/*),
 * which is the exact chain the ZCode desktop/CLI uses when a browser login
 * grants the account its free GLM quota:
 *
 *   1) POST /oauth/cli/init  {provider:"zai"}  + Bearer <client pollToken>
 *      → { flow_id, authorize_url, expires_at, poll_interval_sec }
 *   2) User opens authorize_url (chat.z.ai consent; redirect lands on the
 *      server-registered zcode.z.ai callback — nothing to capture locally)
 *   3) GET  /oauth/cli/poll/{flow_id} until status:"ready"
 *      → { token (zcode JWT), user, zai: { access_token } }
 *   4) access_token (rich session JWT) → api.z.ai/api/auth/z/login
 *      → business token → provision "zcode-api-key" (id.secret, the model
 *      credential ZCode itself writes into its config)
 *
 * Paste-import path: exchangeWithSessionToken() still accepts a raw
 * chat.z.ai session token (e.g. copied from ZCode credentials).
 */
const zai = {
  config: ZAI_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const pollToken = crypto.randomBytes(32).toString("hex");
    const res = await fetch(`${config.cliBaseUrl}/oauth/cli/init`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pollToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "zai" }),
    });
    let payload;
    try {
      payload = await res.json();
    } catch {
      throw new Error(`Z.AI login init failed (HTTP ${res.status})`);
    }
    if (!res.ok || payload.code !== 0 || !payload.data?.flow_id) {
      throw new Error(payload?.msg?.trim() || `Z.AI login init failed (HTTP ${res.status})`);
    }
    const d = payload.data;
    const expiresIn = Math.max(60, Math.floor((d.expires_at * 1000 - Date.now()) / 1000));
    return {
      // flowId + pollToken ride inside device_code; pollToken() decodes them.
      device_code: JSON.stringify({ flowId: d.flow_id, pollToken }),
      user_code: "",
      verification_uri: d.authorize_url,
      verification_uri_complete: d.authorize_url,
      expires_in: Math.min(expiresIn, 600),
      interval: Math.max(1, d.poll_interval_sec || 2),
    };
  },
  pollToken: async (config, deviceCode) => {
    let parsed = {};
    try {
      parsed = JSON.parse(deviceCode) || {};
    } catch {
      parsed = {};
    }
    if (!parsed.flowId || !parsed.pollToken) {
      return { ok: true, data: { error: "access_denied" } };
    }
    const res = await fetch(
      `${config.cliBaseUrl}/oauth/cli/poll/${encodeURIComponent(parsed.flowId)}`,
      { headers: { Authorization: `Bearer ${parsed.pollToken}` } },
    );
    let payload;
    try {
      payload = await res.json();
    } catch {
      return { ok: true, data: { error: "authorization_pending" } };
    }
    const status = payload?.data?.status;
    if (status === "failed") return { ok: true, data: { error: "access_denied" } };
    if (status !== "ready") return { ok: true, data: { error: "authorization_pending" } };

    const sessionToken = payload.data?.zai?.access_token;
    if (!sessionToken) return { ok: true, data: { error: "access_denied" } };

    // Same tail as ZCode: business swap → provisioned zcode-api-key → profile.
    const out = await exchangeWithSessionToken(config, sessionToken);
    return {
      ok: true,
      data: {
        // access_token gates pollForToken's success check; apiKey is the
        // preferred model credential, business token the fallback.
        access_token: out.apiKey || out.accessToken,
        apiKey: out.apiKey || undefined,
        businessToken: out.accessToken,
        sessionToken,
        zcodeJwt: payload.data.token || null,
        expiresIn: out.expiresIn,
        email: out.email,
        displayName: out.displayName,
        userId: out.userId,
        avatarUrl: out.avatarUrl,
      },
    };
  },
  exchangeToken: async (config, code, redirectUri, _codeVerifier, state, meta) => {
    // Import path only: the route pre-computes the session-token chain.
    if (meta?._zaiPrecomputed) return { ...meta._zaiPrecomputed };
    throw new Error("Z.AI login uses the device flow — open the login URL and authorize");
  },
  mapTokens: (tokens) => ({
    apiKey: tokens.apiKey || undefined,
    accessToken: tokens.businessToken || tokens.access_token,
    refreshToken: null,
    expiresIn: tokens.expiresIn,
    email: tokens.email || undefined,
    displayName: tokens.displayName || undefined,
    providerSpecificData: {
      authMethod: "zai_cli_oauth",
      sessionToken: tokens.sessionToken || null,
      zcodeJwtToken: tokens.zcodeJwt || null,
      userId: tokens.userId || null,
      avatarUrl: tokens.avatarUrl || null,
    },
  }),
};

/**
 * Shared tail of the chain: session token → business token (+ provisioned
 * zcode-api-key) + profile. Also used for paste-importing a session token.
 */
export async function exchangeWithSessionToken(config, sessionToken) {
  const bizRes = await fetch(config.businessLoginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: sessionToken }),
  });
  let bizPayload;
  try {
    bizPayload = await bizRes.json();
  } catch {
    bizPayload = {};
  }
  const bizCodeOk =
    bizPayload.code == null || bizPayload.code === 0 || bizPayload.code === 200 ||
    bizPayload.code === "0" || bizPayload.code === "200";
  const accessToken = (bizPayload.data?.access_token || bizPayload.data?.accessToken || "").trim();
  if (!bizRes.ok || bizPayload.success === false || !bizCodeOk || !accessToken) {
    throw new Error("Z.AI session rejected by api.z.ai — token invalid or expired");
  }
  const expiresIn = Number.isFinite(bizPayload.data.expires_in)
    ? bizPayload.data.expires_in
    : 6 * 3600; // assume a conservative lifetime so proactive re-swap keeps it fresh

  // Provision the model credential ZCode itself uses (id.secret project key).
  // Best-effort: accounts without any entitlement may not expose one — the
  // business token stays as the fallback credential.
  let provisionedApiKey = null;
  try {
    const { provisionZaiApiKey } = await import("open-sse/executors/zai.js");
    provisionedApiKey = await provisionZaiApiKey(accessToken);
  } catch {
    provisionedApiKey = null;
  }

  let email, displayName, userId, avatarUrl;
  try {
    const uiRes = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${sessionToken}`, Accept: "application/json" },
    });
    if (uiRes.ok) {
      const ui = await uiRes.json();
      const profile = ui?.data ?? ui;
      userId = profile?.sub ?? profile?.id ?? undefined;
      displayName = profile?.name ?? profile?.preferred_username ?? profile?.email ?? undefined;
      email = profile?.email ?? undefined;
      avatarUrl = profile?.picture ?? undefined;
    }
  } catch {
    // profile is cosmetic — ignore failures
  }

  return { accessToken, apiKey: provisionedApiKey || undefined, expiresIn, sessionToken, email, displayName, userId, avatarUrl };
}

export default zai;
