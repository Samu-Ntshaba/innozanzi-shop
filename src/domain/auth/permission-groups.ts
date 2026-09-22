import { PARTNER_SALES_PERMISSIONS, PERMISSIONS } from "./permissions";

export const PERMISSION_GROUPS = [
  [
    "Catalogue",
    PERMISSIONS.filter(
      (permission) =>
        permission.startsWith("products.") ||
        permission.startsWith("inventory."),
    ),
  ],
  [
    "Sales and fulfilment",
    PERMISSIONS.filter((permission) =>
      ["orders.", "payments.", "quotations.", "customers."].some((prefix) =>
        permission.startsWith(prefix),
      ),
    ),
  ],
  ["RFQs and tenders", PERMISSIONS.filter((permission) => permission.startsWith("rfq."))],
  ["Returns and service", PERMISSIONS.filter((permission) => permission.startsWith("returns."))],
  ["Transport and logistics", PERMISSIONS.filter((permission) => permission.startsWith("transport."))],
  ["Partnerships", PERMISSIONS.filter((permission) => permission.startsWith("partnership."))],
  ["Partner Sales", PARTNER_SALES_PERMISSIONS],
  ["Pricing and trading", PERMISSIONS.filter((permission) => permission.startsWith("trading."))],
  ["Product combos", PERMISSIONS.filter((permission) => permission.startsWith("combos."))],
  ["Marketing", PERMISSIONS.filter((permission) => permission.startsWith("marketing."))],
  ["Documents", PERMISSIONS.filter((permission) => permission.startsWith("documents."))],
  [
    "Reporting and system",
    PERMISSIONS.filter((permission) =>
      ["reports.", "users.", "settings."].some((prefix) =>
        permission.startsWith(prefix),
      ),
    ),
  ],
] as const;
