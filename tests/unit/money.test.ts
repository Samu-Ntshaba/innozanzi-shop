import { describe, expect, it } from "vitest";
import { calculateVatInclusive, formatZar, money } from "../../src/lib/money";

describe("money", () => {
  it("rounds financial values deterministically", () => {
    expect(money("10.005").toFixed(2)).toBe("10.01");
  });

  it("extracts 15% VAT from a VAT-inclusive amount", () => {
    const totals = calculateVatInclusive("115.00");
    expect(totals.net.toFixed(2)).toBe("100.00");
    expect(totals.vat.toFixed(2)).toBe("15.00");
    expect(totals.gross.toFixed(2)).toBe("115.00");
  });

  it("formats South African rand", () => {
    const formatted = formatZar("1234.50");
    expect(formatted).toContain("R");
    expect(formatted).toContain("234");
  });
});
