import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/domain/auth/password";

describe("password hashing", () => {
  it("hashes with Argon2id and verifies the correct password", async () => {
    const password = "SecurePassword123";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, "WrongPassword123")).resolves.toBe(false);
  });
});
