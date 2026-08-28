import { describe, expect, it } from "vitest";
import { deliveryFee } from "../../src/domain/checkout/delivery";

describe("retail delivery fee", () => {
  it("charges R100 below R1,500", () => expect(deliveryFee("1499.99").toFixed(2)).toBe("100.00"));
  it("is free from R1,500", () => expect(deliveryFee("1500").toFixed(2)).toBe("0.00"));
  it("does not charge an empty cart", () => expect(deliveryFee(0).toFixed(2)).toBe("0.00"));
});
