import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";

vi.mock("server-only", () => ({}));

import { getClerkJwtKey } from "@/lib/clerk-config";
import { verifyToken } from "@clerk/nextjs/server";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = keys.publicKey.export({ type: "spki", format: "pem" }).toString();

function sessionToken(expiresIn = 60) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://example.clerk.accounts.dev", sub: "user_test", sid: "sess_test",
    azp: "https://example.com", iat: now, nbf: now - 10, exp: now + expiresIn, v: 2,
  })).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), keys.privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("Clerk public-key session verification", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("preserves the SDK's remote verification when no public key is configured", () => {
    expect(getClerkJwtKey("")).toBeUndefined();
  });

  it("accepts both actual and escaped PEM newlines", () => {
    expect(getClerkJwtKey(`  ${pem}  `)).toBe(pem.trim());
    expect(getClerkJwtKey(pem.replace(/\n/g, "\\n"))).toBe(pem.trim());
    expect(getClerkJwtKey(pem.replace(/\n/g, "\r\n"))).toBe(pem.trim());
  });

  it("rejects a secret key in place of the public key without printing it", () => {
    expect(() => getClerkJwtKey("sk_test_sensitive")).toThrow("CLERK_JWT_KEY must contain the PEM public key");
    expect(() => getClerkJwtKey("sk_test_sensitive")).not.toThrow("sk_test_sensitive");
  });

  it("verifies a signed session even when outbound requests are unavailable", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const result = await verifyToken(sessionToken(), {
      jwtKey: getClerkJwtKey(pem), authorizedParties: ["https://example.com"],
    });
    expect(result.sub).toBe("user_test");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("continues to reject expired sessions", async () => {
    await expect(verifyToken(sessionToken(-60), { jwtKey: getClerkJwtKey(pem) }))
      .rejects.toMatchObject({ reason: "token-expired" });
  });

  it("continues to reject sessions signed by another key", async () => {
    const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" }).toString();
    await expect(verifyToken(sessionToken(), { jwtKey: getClerkJwtKey(otherKey) }))
      .rejects.toMatchObject({ reason: "token-invalid-signature" });
  });
});
