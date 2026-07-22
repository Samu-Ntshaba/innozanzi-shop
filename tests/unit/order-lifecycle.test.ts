import { describe, expect, it } from "vitest";
import { allowedOrderTransitions, assertOrderTransition, cancellationRequiresFinanceConfirmation, reservationAfterRelease } from "../../src/domain/orders/lifecycle";

describe("paid order fulfilment lifecycle", () => {
  it("allows only controlled forward transitions", () => {
    expect(allowedOrderTransitions("PAYMENT_VERIFIED")).toEqual(["PROCESSING", "CANCELLED"]);
    expect(() => assertOrderTransition("PAYMENT_VERIFIED", "DELIVERED")).toThrow("cannot move");
    expect(() => assertOrderTransition("PROCESSING", "PACKING")).not.toThrow();
  });

  it("makes completed and cancelled orders terminal", () => {
    expect(allowedOrderTransitions("COMPLETED")).toEqual([]);
    expect(allowedOrderTransitions("CANCELLED")).toEqual([]);
    expect(() => assertOrderTransition("COMPLETED", "PROCESSING")).toThrow();
  });

  it("permits cancellation only before dispatch and requires finance confirmation", () => {
    expect(cancellationRequiresFinanceConfirmation("PACKING")).toBe(true);
    expect(cancellationRequiresFinanceConfirmation("DISPATCHED")).toBe(false);
    expect(cancellationRequiresFinanceConfirmation("DELIVERED")).toBe(false);
  });

  it("releases only inventory that is actually reserved", () => {
    expect(reservationAfterRelease(10, 4)).toBe(6);
    expect(() => reservationAfterRelease(2, 3)).toThrow("cannot be released safely");
    expect(() => reservationAfterRelease(2, 0)).toThrow();
  });
});
