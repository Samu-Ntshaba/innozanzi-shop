import { describe, expect, it } from "vitest";
import { registrationSchema } from "../../src/schemas/auth";

const validRegistration = {
  name: "Nomsa Dlamini",
  email: "NOMSA@example.com",
  phone: "+27821234567",
  password: "SecurePassword123",
  confirmPassword: "SecurePassword123",
};

describe("registrationSchema", () => {
  it("normalizes email and accepts South African phone numbers", () => {
    const result = registrationSchema.parse(validRegistration);
    expect(result.email).toBe("nomsa@example.com");
  });

  it("rejects weak or mismatched passwords", () => {
    expect(registrationSchema.safeParse({ ...validRegistration, password: "weak" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validRegistration, confirmPassword: "AnotherPassword123" }).success).toBe(false);
  });

  it("rejects invalid South African phone numbers", () => {
    expect(registrationSchema.safeParse({ ...validRegistration, phone: "+12025550123" }).success).toBe(false);
  });
});
