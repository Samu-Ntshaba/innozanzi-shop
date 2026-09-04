export const businessFacts = {
  businessName: "Innozanzi Shop",
  channel: "online store",
  market: "South Africa",
  deliveryScope: "national delivery within South Africa",
  prohibitedClaims: [
    "physical walk-in store or branch",
    "visit us in store or come in-store",
    "worldwide or international delivery",
    "unsupported services, guarantees, discounts, stock or delivery promises",
  ],
} as const;

export const marketingBusinessRules = `Business facts that must always be respected:
- Innozanzi Shop is an online store, not a physical walk-in shop or branch.
- Customers shop online; never invite them to visit a store, branch or in-store location.
- Delivery is national within South Africa only. Never claim worldwide or international delivery.
- Never invent services, delivery areas, guarantees, discounts, prices, stock, specifications or availability.
- Product-specific content must rely only on the supplied catalogue facts.`;
