import { afterEach, describe, expect, it } from "vitest";
import { authorisedSocialAutomation, socialRequestSchema, socialResultSchema } from "@/domain/marketing/social-automation";

const previous = process.env.N8N_SOCIAL_WEBHOOK_SECRET;
afterEach(() => {
  if (previous === undefined) delete process.env.N8N_SOCIAL_WEBHOOK_SECRET;
  else process.env.N8N_SOCIAL_WEBHOOK_SECRET = previous;
});

describe("social automation boundary", () => {
  it("requires the configured bearer token", () => {
    process.env.N8N_SOCIAL_WEBHOOK_SECRET = "social-test-secret";
    expect(authorisedSocialAutomation(new Request("https://example.test", { headers: { authorization: "Bearer social-test-secret" } }))).toBe(true);
    expect(authorisedSocialAutomation(new Request("https://example.test", { headers: { authorization: "Bearer wrong" } }))).toBe(false);
  });

  it("validates a stable n8n delivery request", () => {
    expect(socialRequestSchema.parse({ stream: "EVERGREEN", channel: "LINKEDIN", slot: "2026-09-02:AM" })).toMatchObject({ format: "SINGLE" });
    expect(() => socialRequestSchema.parse({ stream: "UNKNOWN", slot: "bad slot" })).toThrow();
  });

  it("validates write-back statuses", () => {
    expect(socialResultSchema.parse({ deliveryId: "729a5865-0c91-4c3f-b92d-5bb7292470a2", status: "PUBLISHED", externalUrl: "https://linkedin.com/feed/update/1" }).status).toBe("PUBLISHED");
    expect(() => socialResultSchema.parse({ deliveryId: "not-an-id", status: "PUBLISHED" })).toThrow();
  });
});
