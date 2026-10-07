import "server-only";

/** Accept both multiline PEM values and escaped newlines from deployment settings. */
export function getClerkJwtKey(value = process.env.CLERK_JWT_KEY): string | undefined {
  const pem = value?.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  if (!pem) return undefined;
  if (!/^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+\n-----END PUBLIC KEY-----$/.test(pem)) {
    throw new Error("CLERK_JWT_KEY must contain the PEM public key from your Clerk instance's API Keys page.");
  }
  return pem;
}
