import { createHash, randomBytes } from "node:crypto";

export function hashPublicToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPublicToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString("base64url");
  return { plain, hash: hashPublicToken(plain) };
}
