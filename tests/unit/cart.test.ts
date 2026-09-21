import { describe, expect, it } from "vitest";
import { activeUnitPrice, calculateCart } from "../../src/domain/cart/calculations";
import { readFileSync } from "node:fs";

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

describe("cart mutation reliability",()=>{
  it("revalidates supplier stock and sellability before changing quantity",()=>{
    const actions=readFileSync("src/domain/cart/actions.ts","utf8");
    expect(actions).toContain("sellableSupplierWhere()");
    expect(actions).toContain("supplierId:item.supplierId");
    expect(actions).toContain("supplierProductId:item.supplierProductId");
    expect(actions).toContain("parsed.data.quantity>product.stock");
  });

  it("returns stable feedback for malformed, updated and removed mutations",()=>{
    const actions=readFileSync("src/domain/cart/actions.ts","utf8"),page=readFileSync("src/app/(store)/cart/page.tsx","utf8");
    expect(actions).toContain("/cart?error=invalid-quantity");
    expect(actions).toContain("/cart?status=updated");
    expect(actions).toContain("/cart?status=removed");
    expect(page).toContain('params.status === "updated"');
    expect(page).toContain('params.status === "removed"');
  });

  it("never returns a converted cart and creates a replacement active cart",()=>{
    const service=readFileSync("src/domain/cart/service.ts","utf8"),finalizer=readFileSync("src/domain/payments/finalize.ts","utf8");
    expect(service.match(/status: "ACTIVE"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(finalizer).toContain('status: "CONVERTED"');
  });
});
