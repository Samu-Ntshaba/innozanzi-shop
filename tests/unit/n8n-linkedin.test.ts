import { afterEach, describe, expect, it } from "vitest";
import { authorisedN8n, linkedinResultSchema } from "@/domain/marketing/n8n-linkedin";

const previous = process.env.N8N_LINKEDIN_WEBHOOK_SECRET;
afterEach(() => {
  if (previous === undefined) delete process.env.N8N_LINKEDIN_WEBHOOK_SECRET;
  else process.env.N8N_LINKEDIN_WEBHOOK_SECRET = previous;
});

describe("n8n LinkedIn boundary", () => {
  it("requires the exact bearer secret", () => {
    process.env.N8N_LINKEDIN_WEBHOOK_SECRET = "a-long-test-secret";
    expect(authorisedN8n(new Request("https://example.test", { headers: { authorization: "Bearer a-long-test-secret" } }))).toBe(true);
    expect(authorisedN8n(new Request("https://example.test", { headers: { authorization: "Bearer incorrect-secret" } }))).toBe(false);
    expect(authorisedN8n(new Request("https://example.test"))).toBe(false);
  });

  it("accepts only known publishing outcomes", () => {
    const base = { candidateId: "10000000-0000-4000-8000-000000000001" };
    expect(linkedinResultSchema.safeParse({ ...base, status: "PUBLISHED", postUrl: "https://www.linkedin.com/feed/update/example" }).success).toBe(true);
    expect(linkedinResultSchema.safeParse({ ...base, status: "QUEUED" }).success).toBe(false);
    expect(linkedinResultSchema.safeParse({ ...base, status: "FAILED", error: "x".repeat(1_001) }).success).toBe(false);
  });
});
