import { CLAUDE_API_HEADERS } from "../shared.js";
/**
 * Z.AI — login-based (OAuth) provider, multi-account capable.
 *
 * Chain replicated from the ZCode desktop app (resources/app.asar):
 *   1) Authorization code: browser → https://chat.z.ai/api/oauth/authorize
 *      ?client_id=client_P8X5CMWmlaRO9gyO-KSqtg&response_type=code
 *      &redirect_uri=<our loopback /callback>&state=...
 *   2) Code exchange: POST https://zcode.z.ai/api/v1/oauth/token
 *      { provider: "zai", code, redirect_uri, state }
 *      → { code: 0, data: { token (zcode JWT), zai: { access_token }, expires_in?, user? } }
 *      (the nested zai.access_token is the chat.z.ai session token)
 *   3) Business token: POST https://api.z.ai/api/auth/z/login { token }
 *      → { success: true, data: { access_token, expires_in } }
 *      (this is the coding-API credential the /api/coding/paas/v4 endpoint accepts)
 *   4) Profile: GET https://chat.z.ai/api/oauth/userinfo (Bearer <session token>)
 *
 * Multi-account: the desktop binds ONE session globally; here every completed
 * login is stored as its OWN connection row, so several Z.AI identities can be
 * logged in side by side and rotated by the normal fallback strategies.
 *
 * The zai adapter in ZCode has NO refresh-token exchange — the durable secret
 * is the chat.z.ai session token, which can be re-swapped for a fresh business
 * token at any time (see executors/zai.js refreshCredentials).
 */
const zai = {
  id: "zai",
  priority: 46,
  alias: "zai",
  uiAlias: "zai",
  display: {
    name: "Z.AI",
    icon: "auto_awesome",
    color: "#0EA5E9",
    textIcon: "Z",
    website: "https://z.ai",
    notice: {
      signupUrl: "https://chat.z.ai",
      text: "Sign in with any Z.AI account (Google / Email / GitHub). Each login adds a SEPARATE account — repeat for every identity you want in the rotation. API quota requires an active plan subscription on the account (check z.ai -> subscription); without it, requests return 1113. Free-tier alternatives in this gateway: Freebuff, Kiro, Gemini CLI, NVIDIA NIM. You can also paste a chat.z.ai session token to import an account.",
    },
  },
  category: "oauth",
  authType: "oauth",
  authModes: ["oauth"],
  hasOAuth: true,
  transport: {
    // Verified working path for plan-entitled logins: the Anthropic wire with
    // the provisioned zcode-api-key (id.secret). GLM-5.x requires thinking.
    baseUrl: "https://api.z.ai/api/anthropic/v1/messages",
    format: "claude",
    urlSuffix: "?beta=true",
    headers: { ...CLAUDE_API_HEADERS },
    auth: {
      combined: true,
      header: "x-api-key",
      scheme: "raw",
    },
    timeoutMs: 120000,
    stallTimeoutMs: 120000,
    // Always speak streaming upstream so clients asking for JSON get a
    // converted body (sseToJsonHandler) instead of raw SSE.
    forceStream: true,
  },
  models: [
    { id: "glm-5.3", name: "GLM 5.3" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "glm-5.1", name: "GLM 5.1" },
    { id: "glm-5", name: "GLM 5" },
    { id: "glm-4.7", name: "GLM 4.7" },
    { id: "glm-4.6v", name: "GLM 4.6V (Vision)" },
  ],
  oauth: {
    // ZCode CLI device-flow base (oauth/cli/init + oauth/cli/poll) — the login
    // chain that carries plan/quota context, same as the ZCode desktop app.
    cliBaseUrl: "https://zcode.z.ai/api/v1",
    clientId: "client_P8X5CMWmlaRO9gyO-KSqtg",
    authorizeUrl: "https://chat.z.ai/api/oauth/authorize",
    tokenUrl: "https://zcode.z.ai/api/v1/oauth/token",
    userinfoUrl: "https://chat.z.ai/api/oauth/userinfo",
    businessLoginUrl: "https://api.z.ai/api/auth/z/login",
    // Re-swap the business token 30 minutes before it expires (the stored
    // session token outlives it — see services/tokenRefresh/providers.js).
    refreshLeadMs: 30 * 60 * 1000,
  },
  features: {
    usage: true,
  },
};

export default zai;
