import Decimal from "decimal.js";
import { calculateVatInclusive, money } from "@/lib/money";

type PriceSource = {
  regularPrice: { toString(): string };
  salePrice: { toString(): string } | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
};

type VariantPrice = {
  regularPrice: { toString(): string } | null;
  salePrice: { toString(): string } | null;
};

export function activeUnitPrice(product: PriceSource, variant?: VariantPrice | null) {
  const now = new Date();
  const productSaleActive =
    product.salePrice &&
    (!product.saleStartsAt || product.saleStartsAt <= now) &&
    (!product.saleEndsAt || product.saleEndsAt >= now);
  return money(
    variant?.salePrice?.toString() ??
      variant?.regularPrice?.toString() ??
      (productSaleActive ? product.salePrice!.toString() : product.regularPrice.toString()),
  );
}

export function calculateCart(
  items: Array<{ quantity: number; product: PriceSource; variant?: VariantPrice | null }>,
) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(activeUnitPrice(item.product, item.variant).mul(item.quantity)),
    new Decimal(0),
  );
  const totals = calculateVatInclusive(subtotal);
  return { ...totals, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}
