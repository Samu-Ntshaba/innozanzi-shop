import { describe, expect, it } from "vitest";
import {
  allowedTransportTransitions,
  assertTransportTransition,
} from "../../src/domain/logistics/lifecycle";

describe("transport lifecycle", () => {
  it("allows the normal collection and delivery path", () => {
    expect(allowedTransportTransitions("COLLECTED")).toEqual(["IN_TRANSIT", "RETURNED"]);
    expect(() => assertTransportTransition("IN_TRANSIT", "DELIVERED")).not.toThrow();
    expect(() => assertTransportTransition("DELIVERED", "COMPLETED")).not.toThrow();
  });

  it("prevents skipped and backward transitions", () => {
    expect(() => assertTransportTransition("SCHEDULED", "DELIVERED")).toThrow("cannot move");
    expect(() => assertTransportTransition("IN_TRANSIT", "COLLECTED")).toThrow("cannot move");
  });

  it("makes cancelled and completed records terminal", () => {
    expect(allowedTransportTransitions("CANCELLED")).toEqual([]);
    expect(allowedTransportTransitions("COMPLETED")).toEqual([]);
    expect(() => assertTransportTransition("COMPLETED", "IN_TRANSIT")).toThrow();
  });

  it("supports a controlled failed-delivery retry", () => {
    expect(allowedTransportTransitions("FAILED_DELIVERY")).toEqual([
      "SCHEDULED",
      "DRIVER_ASSIGNED",
      "RETURNED",
      "CANCELLED",
    ]);
  });
});

