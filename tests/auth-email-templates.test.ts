import { describe, expect, it } from "vitest";
import { emailTemplates } from "../src/integrations/email/templates";

describe("customer authentication emails", () => {
  it("creates a branded verification email with a safe shop link", () => {
    const message=emailTemplates.verifyEmail("buyer+test@example.com","Nomsa <Shopper>","token-value-12345678901234567890123456789012");
    expect(message.subject).toBe("Verify your Innozanzi Shop account");
    expect(message.html).toContain("Innozanzi Shop registration");
    expect(message.html).toContain("buyer%2Btest%40example.com");
    expect(message.html).toContain("/verify-email?");
    expect(message.html).toContain("Nomsa &lt;Shopper&gt;");
    expect(message.html).toContain("/policies/privacy");
  });

  it("creates a one-hour password reset message that does not claim a password changed", () => {
    const message=emailTemplates.passwordReset("buyer@example.com","token-value-12345678901234567890123456789012");
    expect(message.subject).toBe("Reset your Innozanzi Shop password");
    expect(message.html).toContain("/reset-password?");
    expect(message.html).toContain("expires in one hour");
    expect(message.html).toContain("your password remains unchanged");
  });

  it("uses e-commerce language in the welcome email", () => {
    const message=emailTemplates.welcome("buyer@example.com","Nomsa");
    expect(message.subject).toBe("Welcome to Innozanzi Shop");
    expect(message.text).toContain("secure checkout");
    expect(message.html).toContain("save PC builds");
    expect(message.html).not.toContain("quote requests");
  });

  it("confirms a completed password change and provides support details", () => {
    const message=emailTemplates.passwordChanged("buyer@example.com");
    expect(message.subject).toContain("password was changed");
    expect(message.html).toContain("support@innozanzi.co.za");
    expect(message.html).toContain("My account");
  });

  it("does not contain broken invitation punctuation", () => {
    const message=emailTemplates.userInvitation("staff@example.com","Staff","Temporary123","Sales","STAFF","Innozanzi","token-value-12345678901234567890123456789012",new Date("2026-09-01T12:00:00Z"));
    expect(message.html).toContain("You’re invited");
    expect(message.html).not.toContain("â€™");
  });
});
