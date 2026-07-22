import { describe, expect, it } from "vitest";
import { activeUnitPrice, calculateCart } from "../../src/domain/cart/service";

const product = {
  regularPrice: { toString: () => "1000.00" },
  salePrice: { toString: () => "800.00" },
  saleStartsAt: new Date(Date.now() - 60_000),
  saleEndsAt: new Date(Date.now() + 60_000),
};

describe("cart pricing", () => {
  it("uses an active server-side sale price", () => {
    expect(activeUnitPrice(product).toFixed(2)).toBe("800.00");
  });

  it("uses a variant price before a product price", () => {
    expect(activeUnitPrice(product, { regularPrice: { toString: () => "900.00" }, salePrice: null }).toFixed(2)).toBe("900.00");
  });

  it("calculates quantity and VAT-inclusive totals", () => {
    const totals = calculateCart([{ quantity: 2, product }]);
    expect(totals.itemCount).toBe(2);
    expect(totals.gross.toFixed(2)).toBe("1600.00");
    expect(totals.net.plus(totals.vat).toFixed(2)).toBe("1600.00");
  });
});
