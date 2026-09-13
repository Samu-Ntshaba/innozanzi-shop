import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("requires sign-in for unlimited AI shopping requests", () => {
  const layout = readFileSync("src/app/(store)/layout.tsx", "utf8");
  const assistant = readFileSync(
    "src/components/store/ai-shopping-assistant.tsx",
    "utf8",
  );
  const route = readFileSync("src/app/api/ai-shopping/route.ts", "utf8");
  const service = readFileSync("src/domain/ai-shopping/service.ts", "utf8");

  expect(layout).toContain("authenticated={authenticated}");
  expect(assistant).toContain('location.assign("/sign-in")');
  expect(route).toContain('code==="AUTH_REQUIRED"?401');
  expect(service).toContain('throw new Error("AUTH_REQUIRED")');
  expect(service).not.toContain("consumeRateLimit");
  expect(service).not.toContain("AI_USER_DAILY_LIMIT");
});

it("removes new EFT payments while preserving guidance for existing EFT orders", () => {
  const selector = readFileSync(
    "src/components/store/payment-method-selector.tsx",
    "utf8",
  );
  const paymentPanel = readFileSync(
    "src/components/account/order-payment-panel.tsx",
    "utf8",
  );

  expect(selector).not.toContain("Pay by EFT");
  expect(selector).not.toContain("Continue with EFT");
  expect(paymentPanel).toContain("Please make payment immediately");
  expect(paymentPanel).toContain("funds have reflected in our bank account");
});
