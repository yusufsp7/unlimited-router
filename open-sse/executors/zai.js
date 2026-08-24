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

export class ZaiExecutor extends BaseExecutor {
  // Z.AI answers 1113 ("Insufficient balance or no resource package") when the
  // logged-in account has no GLM Coding Plan — translate to an actionable
  // message instead of the raw upstream JSON.
  parseError(response, bodyText) {
    const text = typeof bodyText === "string" ? bodyText : "";
    if (text.includes("1113") || text.toLowerCase().includes("insufficient balance")) {
      return {
        status: 429,
        message: "This Z.AI account has no coding-plan quota (upstream 1113). Connect an account with a GLM Coding Plan — or recharge it at z.ai — then retry.",
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
      log?.info?.("TOKEN", `zai re-swapped business token (expires_in=${expiresIn ?? "?"})`);
      return {
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
