import { describe, expect, it } from "vitest";
import { uniqueEmailRecipients } from "../../src/domain/notifications/recipients";

describe("staff email recipients", () => {
  it("keeps support and administrators while removing duplicate addresses", () => {
    expect(uniqueEmailRecipients(
      [{ id: "", email: "support@example.com" }],
      [{ id: "admin-1", email: "admin@example.com" }, { id: "admin-2", email: "SUPPORT@example.com" }],
      [{ id: "subscriber", email: "alerts@example.com" }],
    )).toEqual([
      { id: "", email: "support@example.com" },
      { id: "admin-1", email: "admin@example.com" },
      { id: "subscriber", email: "alerts@example.com" },
    ]);
  });
});
