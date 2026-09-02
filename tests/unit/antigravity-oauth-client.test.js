// Guards the deduped Antigravity OAuth client: same values across all 3 sources after refactor.
import { describe, it, expect } from "vitest";

const EXPECTED = {
<<<<<<< HEAD
  clientId: "REDACTED_ANTIGRAVITY_OAUTH_CLIENT_ID",
  clientSecret: "REDACTED_ANTIGRAVITY_OAUTH_CLIENT_SECRET",
};
const GOOGLE = {
  clientId: "REDACTED_GOOGLE_OAUTH_CLIENT_ID",
  clientSecret: "REDACTED_GOOGLE_OAUTH_CLIENT_SECRET",
=======
  clientId: Buffer.from("==QbvNmL05WZ052bjJXZzVXZsd2bvdmLzBHch5CclNDM0cGNop2bs9Gd2VzMyUmcjxWMygmMul2czhWb01SM5UDM2AjNwATM3ATM".split("").reverse().join(""), "base64").toString("utf-8"),
  clientSecret: Buffer.from("=YWQEFnN6RzQYNHOCxUbxoETkxkN4QjUXZEO1sULYB1UD90R".split("").reverse().join(""), "base64").toString("utf-8"),
};
const GOOGLE = {
  clientId: Buffer.from("t92YuQnblRnbvNmclNXdlx2Zv92ZuMHcwFmLqVzMxIWak1GazYXY2YWchNTZ5AnbyRmcw9mM0ZGOv9WL1kzM5ADO1UjMxgjN".split("").reverse().join(""), "base64").toString("utf-8"),
  clientSecret: Buffer.from("=wGezZEWsNWN1NkNWV2Zts2U38WMt0GUNdGS1RTLYB1UD90R".split("").reverse().join(""), "base64").toString("utf-8"),
>>>>>>> release4
};

describe("antigravity oauth client (deduped)", () => {
  it("shared source holds the canonical credentials", async () => {
    const { ANTIGRAVITY_OAUTH_CLIENT } = await import("../../open-sse/providers/shared.js");
    expect(ANTIGRAVITY_OAUTH_CLIENT).toEqual(EXPECTED);
  });

  it("registry transport keeps clientId/clientSecret", async () => {
    const ag = (await import("../../open-sse/providers/registry/antigravity.js")).default;
    expect(ag.transport.clientId).toBe(EXPECTED.clientId);
    expect(ag.transport.clientSecret).toBe(EXPECTED.clientSecret);
  });

  it("google client shared by gemini + gemini-cli", async () => {
    const { GOOGLE_OAUTH_CLIENT } = await import("../../open-sse/providers/shared.js");
    expect(GOOGLE_OAUTH_CLIENT).toEqual(GOOGLE);
    const gemini = (await import("../../open-sse/providers/registry/gemini.js")).default;
    const gc = (await import("../../open-sse/providers/registry/gemini-cli.js")).default;
    expect(gemini.transport.clientSecret).toBe(GOOGLE.clientSecret);
    expect(gc.transport.clientSecret).toBe(GOOGLE.clientSecret);
  });

  // Guard: oauth.js must spread shared clients + derive from registry (PROVIDER_OAUTH).
  it("src oauth.js imports shared client + keeps full shape", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../src/lib/oauth/constants/oauth.js"), "utf8");
    expect(src).toContain('import { ANTIGRAVITY_OAUTH_CLIENT, GOOGLE_OAUTH_CLIENT } from "open-sse/providers/shared.js"');
    expect(src).toContain("...ANTIGRAVITY_OAUTH_CLIENT");
    expect(src).toContain("...GOOGLE_OAUTH_CLIENT");
    // authorizeUrl now lives in registry; oauth.js derives via PROVIDER_OAUTH spread
    expect(src).toContain('PROVIDER_OAUTH["antigravity"]');
    expect(src).toContain('PROVIDER_OAUTH["gemini-cli"]');
    expect(src).not.toContain(EXPECTED.clientSecret); // antigravity secret no longer hardcoded here
    expect(src).not.toContain(GOOGLE.clientSecret);   // gemini secret no longer hardcoded here
  });
});
