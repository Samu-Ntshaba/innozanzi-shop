import { randomBytes } from "node:crypto";

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(18);
  const generated = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `Az9!${generated}`;
}

export function invitationExpiry(hours = Number(process.env.USER_INVITATION_EXPIRY_HOURS ?? "48")) {
  return new Date(Date.now() + Math.max(1, Math.min(hours, 168)) * 60 * 60 * 1_000);
}
