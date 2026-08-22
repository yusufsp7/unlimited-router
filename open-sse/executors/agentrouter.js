import { DefaultExecutor } from "./default.js";

/**
 * AgentRouter executor — ports the mitigations from the battle-tested local
 * "Agent Router Proxy" (agentrouter-proxy.py) so the gateway behaves the same
 * as the setup the user already validated:
 *
 *   1. Request null-strip: AgentRouter 400s with "expected object, received
 *      null" when clients send null-valued fields — strip them recursively.
 *   2. Response scrubbing: AgentRouter injects `data: null` frames and
 *      `billing.summary` events that crash strict clients ("Type validation
 *      failed") — drop them from streams and JSON bodies.
 *   3. Content-type repair: AgentRouter sometimes labels a complete JSON
 *      chat.completion (or even an SSE stream) as `text/plain`, which breaks
 *      strict parsers downstream. Sniff the payload and re-label/normalize,
 *      exactly like the local proxy which never trusted the content type.
 *   4. Transient-status retry: 408/409/425/429/5xx/520/522/524 retry with
 *      backoff (config-driven, see registry retry block).
 *   5. Recognized client User-Agent (registry transport headers) — AgentRouter
 *      rejects unknown clients with "unauthorized client detected".
 */

const BILLING_MARKER = "billing";

function isBillingSummary(text) {
  if (!text.includes(BILLING_MARKER)) return false;
  try {
    const obj = JSON.parse(text);
    return obj?.object === "billing.summary";
  } catch {
    return false;
  }
}

// Recursively remove null-valued object fields. Null items INSIDE arrays are
// preserved — this mirrors the reference proxy's _strip_nulls exactly.
function stripNulls(value) {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}

// Recursively remove injected billing.summary objects from a parsed payload.
function stripBillingObjects(value) {
  if (Array.isArray(value)) {
    return value
      .filter((v) => !(v && typeof v === "object" && v.object === "billing.summary"))
      .map(stripBillingObjects);
  }
  if (value && typeof value === "object") {
    if (value.object === "billing.summary") return undefined;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripBillingObjects(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

// Split off any trailing junk (AgentRouter appends a literal SSE
// Returns { json, rest } or null when no JSON document is present.
function splitFirstJsonDoc(text) {
  const start = text.search(/[{\[]/);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), rest: text.slice(i + 1) };
    }
  }
  return null;
}

// Clean ONE SSE event (string incl. its separators). Returns null when the
// whole event should be dropped (its only payload was `data: null` or a
// billing.summary object).
function cleanSSEEvent(event) {
  if (!event.includes("data:") && !event.trimStart().startsWith("{") && !event.trimStart().startsWith("[")) {
    return event; // comments/keep-alives pass through untouched
  }
  const lines = event.split(/(?=\r?\n)/); // keep line endings attached
  const out = [];
  let hadData = false;
  let keptData = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped === "" || stripped.startsWith(":")) {
      out.push(line);
      continue;
    }
    if (stripped.startsWith("data:")) {
      hadData = true;
      const payload = stripped.slice(5).trim();
      if (payload === "" || payload === "null") continue; // crashy frame — drop
      if (isBillingSummary(payload)) continue;            // injected billing — drop
      keptData = true;
      out.push(line);
      continue;
    }
    // Raw JSON line without the data: prefix (another billing injection path)
    if ((stripped.startsWith("{") || stripped.startsWith("[")) && isBillingSummary(stripped)) {
      continue;
    }
    out.push(line);
  }
  if (hadData && !keptData) return null;
  return out.join("");
}

function findEventEnd(buffer) {
  const n = buffer.indexOf("\n\n");
  const rn = buffer.indexOf("\r\n\r\n");
  if (n === -1 && rn === -1) return -1;
  if (rn !== -1 && (n === -1 || rn < n)) return rn + 4;
  return n + 2;
}

// Filter a WHOLE SSE document (string) — same rules as the streaming path.
function filterSSEText(text) {
  let out = "";
  let buffer = text;
  let end;
  while ((end = findEventEnd(buffer)) !== -1) {
    const event = buffer.slice(0, end);
    buffer = buffer.slice(end);
    const cleaned = cleanSSEEvent(event);
    if (cleaned !== null) out += cleaned;
  }
  if (buffer) {
    const cleaned = cleanSSEEvent(buffer);
    if (cleaned !== null) out += cleaned;
  }
  return out;
}

function filteredSSEResponse(response) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const filter = new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      let end;
      while ((end = findEventEnd(buffer)) !== -1) {
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end);
        const cleaned = cleanSSEEvent(event);
        if (cleaned !== null) controller.enqueue(encoder.encode(cleaned));
      }
    },
    flush(controller) {
      buffer += decoder.decode();
      if (buffer) {
        const cleaned = cleanSSEEvent(buffer);
        if (cleaned !== null) controller.enqueue(encoder.encode(cleaned));
      }
    },
  });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(response.body.pipeThrough(filter), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// AgentRouter ignores `stream:true` and answers with a COMPLETE JSON
// completion labeled text/plain. When the caller asked for a stream,
// synthesize a well-formed chat.completion.chunk SSE from that JSON.
function jsonCompletionToSSE(jsonText) {
  const obj = JSON.parse(jsonText);
  const id = obj.id || `chatcmpl-agentrouter-${Date.now()}`;
  const model = obj.model;
  const created = obj.created || Math.floor(Date.now() / 1000);
  const choice = obj.choices?.[0] || {};
  const content = choice.message?.content ?? "";
  const finish = choice.finish_reason;
  // Always emit OPENAI chunk frames: the gateway's forced-SSE-to-JSON
  // converter (sseToJsonHandler) parses this shape, then translates to
  // whatever format the client speaks. Anthropic events would NOT be parsed.
  const NL = String.fromCharCode(10);
  let sse = "";
  if (obj.type === "message" || obj.content?.[0]?.text !== undefined) {
    // Upstream answered an ANTHROPIC-format completion as JSON.
    const text = obj.content?.map((c) => c.text || "").join("") || "";
    const usageIn = obj.usage?.input_tokens ?? 0;
    const usageOut = obj.usage?.output_tokens ?? 0;
    sse += `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: obj.model, choices: [{ index: 0, delta: { role: "assistant", content: text }, logprobs: null, finish_reason: null }] })}${NL}${NL}`;
    sse += `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: obj.model, choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: usageIn, completion_tokens: usageOut, total_tokens: usageIn + usageOut } })}${NL}${NL}`;
  } else {
    sse += `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content }, logprobs: null, finish_reason: null }] })}${NL}${NL}`;
    if (finish !== undefined && finish !== null) {
      sse += `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: finish }], usage: obj.usage })}${NL}${NL}`;
    }
  }
  return sse + `data: [DONE]${NL}${NL}`;
}

function rebuildResponse(response, body, contentType) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  if (contentType) headers.set("content-type", contentType);
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export class AgentRouterExecutor extends DefaultExecutor {
  constructor() {
    super("agentrouter");
  }

  // Mitigation 1: drop null-valued fields before the request leaves.
  transformRequest(model, body, stream, credentials) {
    const transformed = super.transformRequest(model, body, stream, credentials);
    return stripNulls(transformed);
  }

  // Mitigations 2 + 3: normalize/scrub the response.
  async execute(params) {
    const result = await super.execute(params);
    const response = result?.response;
    if (!response || !response.ok || !response.body) return result;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    try {
      if (contentType.includes("text/plain")) {
        // AgentRouter mislabels payloads — sniff the actual shape.
        const text = await response.text();
        const trimmed = text.trimStart();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          // Complete JSON completion delivered as text/plain — possibly with
          // a stray `data: [DONE]` glued to the end (upstream quirk). Keep
          // only the first JSON document.
          const split = splitFirstJsonDoc(text);
          let body = split ? split.json : text;
          if (body.includes(BILLING_MARKER)) {
            try {
              const stripped = stripBillingObjects(JSON.parse(body));
              if (stripped !== undefined) body = JSON.stringify(stripped);
            } catch { /* not JSON after all — passthrough */ }
          }
          if (params.stream) {
            // Caller asked for a stream — wrap the full completion as SSE in
            // the SAME wire format we spoke to the provider with.
            // Deterministic: the upstream URL reveals which transport spoke.
            const wire = String(result.url || "").includes("/v1/messages") ? "claude" : "openai";
            result.response = rebuildResponse(response, jsonCompletionToSSE(body, wire), "text/event-stream");
          } else {
            result.response = rebuildResponse(response, body, "application/json");
          }
        } else if (trimmed.startsWith("data:") || trimmed.startsWith("event:") || trimmed.startsWith(":")) {
          // SSE stream mislabeled as text/plain — filter, then re-label.
          result.response = rebuildResponse(response, filterSSEText(text), "text/event-stream");
        } else {
          result.response = rebuildResponse(response, text, "text/plain; charset=utf-8");
        }
      } else if (contentType.includes("text/event-stream") || (params.stream && contentType.includes("stream"))) {
        result.response = filteredSSEResponse(response);
      } else if (contentType.includes("application/json")) {
        const text = await response.text();
        let body = text;
        if (text.includes(BILLING_MARKER)) {
          try {
            const stripped = stripBillingObjects(JSON.parse(text));
            if (stripped !== undefined) body = JSON.stringify(stripped);
          } catch { /* passthrough */ }
        }
        result.response = rebuildResponse(response, body, "application/json");
      }
    } catch {
      // Filtering must never break a working response — passthrough on error.
    }
    return result;
  }
}

export default AgentRouterExecutor;
