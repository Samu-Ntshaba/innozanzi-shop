import { describe, expect, it } from "vitest";
import { isProductionDeployment, mailDeliveryMode } from "../../src/integrations/email/provider";

describe("email provider environment safety", () => {
  it("allows Mailtrap Sandbox only in local development", () => {
    expect(mailDeliveryMode({ NODE_ENV: "development", MAILTRAP_SANDBOX: "true", MAILTRAP_API_TOKEN: "test" })).toBe("sandbox");
  });

  it("never uses Sandbox on a production Node runtime", () => {
    expect(mailDeliveryMode({ NODE_ENV: "production", MAILTRAP_SANDBOX: "true", MAILTRAP_API_TOKEN: "live" })).toBe("api");
  });

  it("never uses Sandbox on Railway even if NODE_ENV is misconfigured", () => {
    const env = { NODE_ENV: "development", RAILWAY_ENVIRONMENT: "production", MAILTRAP_SANDBOX: "true", MAILTRAP_API_TOKEN: "live" } as const;
    expect(isProductionDeployment(env)).toBe(true);
    expect(mailDeliveryMode(env)).toBe("api");
  });

  it("uses SMTP only when explicitly selected or no API token exists", () => {
    expect(mailDeliveryMode({ NODE_ENV: "production", MAILTRAP_DELIVERY_MODE: "smtp", MAILTRAP_SMTP_PASSWORD: "live" })).toBe("smtp");
    expect(mailDeliveryMode({ NODE_ENV: "production", MAILTRAP_API_TOKEN: "live", MAILTRAP_SMTP_PASSWORD: "live" })).toBe("api");
  });
});
