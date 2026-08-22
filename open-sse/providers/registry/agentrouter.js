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
    headers: { ...CLAUDE_API_HEADERS },
    auth: {
      combined: true,
      header: "x-api-key",
      scheme: "raw",
    },
    retry: {
      429: { attempts: 2, delayMs: 2000 },
      503: { attempts: 2, delayMs: 2000 },
      500: { attempts: 2, delayMs: 2000 },
    },
  },
  transports: [
    {
      format: "openai",
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://agentrouter.org/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "gpt-5.6-sol", name: "GPT 5.6 Sol" },
  ],
};

export default agentrouter;
