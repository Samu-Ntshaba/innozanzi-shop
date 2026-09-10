import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicPolicies } from "@/domain/content/public-policies";

describe("public delivery terms", () => {
  it("publishes a complete delivery policy", () => {
    const policy = publicPolicies.delivery;
    expect(policy.title).toBe("Delivery Policy");
    for (const subject of [
      "Delivery areas and charges",
      "When delivery preparation starts",
      "Delivery estimates and agreed dates",
      "Missed or unsuccessful delivery",
      "Risk, ownership and proof of delivery",
      "Cancellations, returns and damaged goods",
    ]) expect(policy.content).toContain(subject);
  });

  it("links the terms and delivery policy from checkout and the footer", () => {
    const payment = readFileSync(
      "src/components/store/payment-method-selector.tsx",
      "utf8",
    );
    const footer = readFileSync("src/components/store/footer.tsx", "utf8");
    expect(payment).toContain('href="/policies/terms"');
    expect(payment).toContain('href="/policies/delivery"');
    expect(footer).toContain('["Delivery policy", "/policies/delivery"]');
  });
});
