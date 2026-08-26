import { CLAUDE_API_HEADERS } from "../shared.js";

/**
 * AgentRouter — PAT-gateway at agentrouter.org (New API-style).
 *
 * Ported from the standalone "Agent Router Proxy" project: one base URL serves
 * both wire formats, so the multi-endpoint transports let each client speak
 * its native protocol without translation:
 *   - OpenAI Chat Completions: POST /v1/chat/completions  (Authorization: Bearer sk-...)
 *   - Anthropic Messages:      POST /v1/messages          (x-api-key: sk-...)
 *
 * Auth is a Personal Access Token created in the AgentRouter dashboard.
 * Multiple keys = multiple connections; the normal fallback strategies rotate
 * them like any other apikey provider.
 */
const agentrouter = {
  id: "agentrouter",
  priority: 47,
  alias: "ar",
  uiAlias: "ar",
  display: {
    name: "AgentRouter",
    icon: "alt_route",
    color: "#14B8A6",
    textIcon: "AR",
    website: "https://agentrouter.org",
    notice: {
      apiKeyUrl: "https://agentrouter.org",
      text: "Create a Personal Access Token (sk-...) in your AgentRouter dashboard and paste it here. Add one key per account — requests rotate across them automatically.",
    },
  },
  category: "apikey",
  authType: "apikey",
  authModes: ["apikey"],
  authHint: "Personal Access Token (sk-...) from agentrouter.org",
  transport: {
    baseUrl: "https://agentrouter.org/v1/messages",
    format: "claude",
    // AgentRouter ignores `stream:true` and answers with a complete JSON
    // completion mislabeled text/plain. Force streaming internally so the
    // executor can normalize the shape (JSON→synthesized SSE) and the
    // gateway converts back to whatever the client actually asked for.
    forceStream: true,
    // AgentRouter validates the client User-Agent — send the same recognized
    // UA the battle-tested local proxy uses (opencode), not our default.
    headers: { ...CLAUDE_API_HEADERS, "User-Agent": "opencode/1.17.12" },
    auth: {
      combined: true,
      header: "x-api-key",
      scheme: "raw",
    },
    // Transient statuses the upstream is known to throw (mirrors the local
    // AgentRouter proxy's RETRIABLE_STATUS set) — retry with backoff.
    retry: {
      408: { attempts: 2, delayMs: 2000 },
      409: { attempts: 2, delayMs: 2000 },
      425: { attempts: 2, delayMs: 2000 },
      429: { attempts: 2, delayMs: 2000 },
      500: { attempts: 2, delayMs: 2000 },
      502: { attempts: 2, delayMs: 2000 },
      503: { attempts: 2, delayMs: 2000 },
      504: { attempts: 2, delayMs: 2000 },
      520: { attempts: 2, delayMs: 2000 },
      522: { attempts: 2, delayMs: 2000 },
      524: { attempts: 2, delayMs: 2000 },
    },
  },
  transports: [
    {
      format: "openai",
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      headers: { "User-Agent": "opencode/1.17.12" },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://agentrouter.org/v1/messages",
      headers: { ...CLAUDE_API_HEADERS, "User-Agent": "opencode/1.17.12" },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "gpt-5.6-sol", name: "GPT 5.6 Sol" },
    { id: "glm-5.3", name: "GLM 5.3" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
  ],
};

export default agentrouter;
