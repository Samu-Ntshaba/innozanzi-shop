import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("always alerts super administrators and records Mobile Admin account notifications", () => {
  const recipients = readFileSync("src/domain/notifications/role-email.ts", "utf8");
  expect(recipients).toContain('eventKey === "USER_CREATED"');
  expect(recipients).toContain('{ slug: "super-administrator" }');

  const notifications = readFileSync("src/domain/auth/user-notifications.ts", "utf8");
  expect(notifications).toContain('type:"USER_CREATED",channel:"IN_APP"');
  expect(notifications).toContain('["mobile-admin","super-administrator"]');

  const inbox = readFileSync("src/app/mobile-admin/inbox/page.tsx", "utf8");
  expect(inbox).toContain('type:"USER_CREATED",channel:"IN_APP"');
  expect(inbox).toContain('title="New accounts"');
});
