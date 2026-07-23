import { describe, expect, it } from "vitest";
import { assertRfqTransition } from "./rules";

describe("RFQ workflow", () => {
  it("allows controlled progression", () => {
    expect(() => assertRfqTransition("PRICING_IN_PROGRESS", "AWAITING_APPROVAL")).not.toThrow();
  });

  it("blocks skipping approval", () => {
    expect(() => assertRfqTransition("PRICING_IN_PROGRESS", "SUBMITTED")).toThrow();
  });
});
