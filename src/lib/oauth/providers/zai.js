import { ZAI_CONFIG } from "../constants/oauth.js";

/**
 * Z.AI login (authorization-code via ZCode backend), replicated from the
 * ZCode desktop adapter (resources/app.asar, ZaiProviderAdapter):
 *
 *   1) buildAuthUrl  → https://chat.z.ai/api/oauth/authorize
 *      ?client_id=…&response_type=code&redirect_uri=<loopback>&state=…
 *   2) exchangeToken → POST https://zcode.z.ai/api/v1/oauth/token
 *      { provider: "zai", code, redirect_uri, state }
 *      → data.token (zcode JWT) + data.zai.access_token (chat session token)
 *   3) business swap → POST https://api.z.ai/api/auth/z/login {token}
 *      → data.access_token (the coding-API credential) + data.expires_in
 *   4) profile       → GET https://chat.z.ai/api/oauth/userinfo (Bearer session)
 *
 * Multi-account: each completed login becomes its own connection row; the
 * durable secret (chat session token) is kept in providerSpecificData so the
 * executor can re-swap business tokens without a new browser login.
 */
const zai = {
  config: ZAI_CONFIG,
  flowType: "authorization_code",
  buildAuthUrl: (config, redirectUri, state) => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `${config.authorizeUrl}?${params.toString()}`;
  },
  exchangeToken: async (config, code, redirectUri, _codeVerifier, state, meta) => {
    // Import path: the route pre-computed the session-token chain for us.
    if (meta?._zaiPrecomputed) {
      return { ...meta._zaiPrecomputed };
    }
    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ provider: "zai", code, redirect_uri: redirectUri, state }),
    });
    let tokenPayload;
    try {
      tokenPayload = await tokenRes.json();
    } catch {
      throw new Error(`Z.AI token exchange failed (HTTP ${tokenRes.status})`);
    }
    if (!tokenRes.ok || (tokenPayload.code !== undefined && tokenPayload.code !== 0)) {
      throw new Error(tokenPayload?.msg?.trim() || `Z.AI token exchange failed (HTTP ${tokenRes.status})`);
    }
    const sessionToken = (tokenPayload.data?.zai?.access_token || "").trim();
    if (!sessionToken) {
      throw new Error("Z.AI token exchange failed: response missing zai.access_token");
    }

    const result = await exchangeWithSessionToken(config, sessionToken);
    result.zcodeJwtToken = (tokenPayload.data?.token || "").trim() || null;
    const user = tokenPayload.data?.user;
    if (user && !result.displayName) {
      result.displayName = user.displayName || user.name || user.username || undefined;
    }
    return result;
  },
  mapTokens: (tokens) => ({
    accessToken: tokens.accessToken,
    apiKey: tokens.apiKey || undefined,
    refreshToken: null,
    expiresIn: tokens.expiresIn,
    email: tokens.email || undefined,
    displayName: tokens.displayName || undefined,
    providerSpecificData: {
      authMethod: "oauth_zai",
      sessionToken: tokens.sessionToken,
      zcodeJwtToken: tokens.zcodeJwtToken || null,
      userId: tokens.userId || null,
      avatarUrl: tokens.avatarUrl || null,
    },
  }),
};

/**
 * Shared tail of the chain: session token → business token (+ profile).
 * Also used directly for paste-importing a session token.
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
