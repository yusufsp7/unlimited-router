import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

const BUSINESS_LOGIN_URL = "https://api.z.ai/api/auth/z/login";

function isBusinessOk(payload) {
  if (!payload) return false;
  const code = payload.code;
  const codeOk = code == null || code === 0 || code === 200 || code === "0" || code === "200";
  return codeOk && payload.success !== false && !!(payload.data?.access_token || payload.data?.accessToken);
}

/**
 * Swap a chat.z.ai session token for a fresh coding-API business token
 * (ZCode desktop "ZaiBusinessTokenResolver" parity). Throws when the session
 * itself is dead — the caller then falls back to the next account.
 */
export async function exchangeBusinessToken(sessionToken, proxyOptions = null) {
  const response = await proxyAwareFetch(BUSINESS_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: sessionToken }),
  }, proxyOptions);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !isBusinessOk(payload)) {
    throw new Error(`zai_business_exchange_failed (${response.status})`);
  }
  const data = payload.data || {};
  const accessToken = (data.access_token || data.accessToken || "").trim();
  const expiresIn = Number.isFinite(data.expires_in) ? data.expires_in : undefined;
  return { accessToken, expiresIn };
}

/**
 * Provision (or reuse) the "zcode-api-key" project API key — the exact
 * credential ZCode mints after login (getCustomerInfo → default org/project →
 * find-or-create key → copy secret). Returns "id.secret" or null when the
 * account/portal doesn't allow it (e.g. no entitlement yet).
 */
export async function provisionZaiApiKey(bizToken) {
  try {
    const h = { Authorization: `Bearer ${bizToken}`, "Content-Type": "application/json" };
    const cust = (await (await fetch("https://api.z.ai/api/biz/customer/getCustomerInfo", { headers: h })).json())?.data;
    const orgs = cust?.organizations || [];
    const org = orgs.find((o) => (o.organizationName || "").includes("默认")) || orgs[0];
    const proj = (org?.projects || []).find((p2) => (p2.projectName || "").includes("默认")) || org?.projects?.[0];
    if (!org?.organizationId || !proj?.projectId) return null;
    const keysUrl = `https://api.z.ai/api/biz/v1/organization/${org.organizationId}/projects/${proj.projectId}/api_keys`;
    let list = (await (await fetch(keysUrl, { headers: h })).json())?.data;
    if (!Array.isArray(list)) list = [];
    let key = list.find((k) => k.name === "zcode-api-key");
    if (!key) {
      key = (await (await fetch(keysUrl, { method: "POST", headers: h, body: JSON.stringify({ name: "zcode-api-key" }) })).json())?.data;
    }
    if (!key?.apiKey) return null;
    const secret = (await (await fetch(`${keysUrl}/copy/${encodeURIComponent(key.apiKey)}`, { headers: h })).json())?.data?.secretKey;
    if (!secret) return null;
    return `${key.apiKey}.${secret}`;
  } catch {
    return null;
  }
}

export class ZaiExecutor extends BaseExecutor {
  // GLM-5.x on the Anthropic wire ALWAYS thinks — upstream 400 (1210) when
  // the field is missing. Inject a sane default when the client sent none.
  transformRequest(model, body, stream, credentials) {
    const transformed = { ...(super.transformRequest(model, body, stream, credentials) || {}) };
    if (!transformed.thinking) {
      const maxTokens = Number(transformed.max_tokens) || 4096;
      transformed.thinking = {
        type: "enabled",
        budget_tokens: Math.max(256, Math.min(2048, Math.floor(maxTokens / 2))),
      };
    }
    return transformed;
  }

  // Z.AI answers 1113 ("Insufficient balance or no resource package") when the
  // logged-in account has no GLM Coding Plan — translate to an actionable
  // message instead of the raw upstream JSON.
  parseError(response, bodyText) {
    const text = typeof bodyText === "string" ? bodyText : "";
    if (text.includes("1113") || text.toLowerCase().includes("insufficient balance")) {
      return {
        status: 429,
        message: "This Z.AI account has no plan quota yet (upstream 1113). Log the account in via Add Connection (CLI device flow) so its free GLM quota attaches, or use a plan account.",
      };
    }
    const weekly = text.match(/1310.*?reset at ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]{8})/);
    if (weekly) {
      return {
        status: 429,
        resetsAtMs: new Date(weekly[1] + "Z").getTime(),
        message: `Weekly GLM quota exhausted on this Z.AI account — resets at ${weekly[1]} UTC. Add another account (Providers -> Z.AI -> Add Connection) to keep going.`,
      };
    }
    return super.parseError(response, bodyText);
  }

  constructor() {
    // Registry config (transport/models) comes from open-sse/providers/registry/zai.js
    super("zai", PROVIDERS.zai);
  }

  // The stored accessToken is the SHORT-LIVED business token; the durable
  // secret is the chat.z.ai session token in providerSpecificData.sessionToken.
  // Re-swap it whenever the business token nears expiry (oauth.refreshLeadMs)
  // — upstream offers no refresh-token grant.
  async refreshCredentials(credentials, log, proxyOptions = null) {
    const sessionToken =
      credentials?.providerSpecificData?.sessionToken ||
      credentials?.providerSpecificData?.zaiSessionToken;
    if (!sessionToken) return null;
    try {
      const { accessToken, expiresIn } = await exchangeBusinessToken(sessionToken, proxyOptions);
      const apiKey = await provisionZaiApiKey(accessToken);
      log?.info?.("TOKEN", `zai re-swapped business token (expires_in=${expiresIn ?? "?"}) key=${apiKey ? "ok" : "none"}`);
      return {
        apiKey: apiKey || undefined,
        accessToken,
        refreshToken: credentials.refreshToken,
        expiresIn,
        providerSpecificData: {
          ...(credentials.providerSpecificData || {}),
          lastBusinessSwapAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      log?.error?.("TOKEN", `zai business swap failed: ${error.message}`);
      return null;
    }
  }
}

export default ZaiExecutor;
