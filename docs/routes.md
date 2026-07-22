# Route map

## Public storefront

| Route | Purpose |
| --- | --- |
| `/` | Homepage, featured catalogue, procurement CTA and newsletter |
| `/shop` | Searchable, filterable and sortable product catalogue |
| `/categories/[slug]` | SEO category landing and filtered catalogue |
| `/products/[slug]` | Product gallery, variants, stock, documents and reviews |
| `/cart` | Persistent quotation list with requested quantities and indicative values |
| `/quotations/request` | Multi-product quotation request |
| `/search` | Full catalogue search results |
| `/contact`, `/faq` | Support content |
| `/policies/[slug]` | Delivery, returns, privacy and legal pages |

## Authentication and customer account

| Route | Protection/purpose |
| --- | --- |
| `/sign-in`, `/register` | Public identity entry points |
| `/verify-email`, `/forgot-password`, `/reset-password` | Token-based identity workflows |
| `/account` | Authenticated customer dashboard |
| `/account/profile`, `/account/company`, `/account/addresses` | Customer records |
| `/account/orders`, `/account/orders/[orderNumber]` | Ownership-checked order history/details |
| `/account/quotations`, `/account/quotations/[quotationNumber]` | Ownership-checked requests and quotations |
| `/account/orders/[orderNumber]` | Ownership-checked fulfilment and delivery timeline |
| `/account/wishlist`, `/account/recently-viewed` | Customer product lists |
| `/account/security` | Password and active-session management |

## Administration

All `/admin` routes require an active authenticated user and the relevant server-side permission.

| Route | Permission |
| --- | --- |
| `/admin` | `reports.view` |
| `/admin/products` | `products.view` |
| `/admin/products/new` | `products.create` |
| `/admin/products/[id]` | `products.update` |
| `/admin/categories`, `/admin/brands` | `products.update` |
| `/admin/suppliers` | `products.update` |
| `/admin/inventory`, `/admin/inventory/movements` | `inventory.manage` |
| `/admin/orders`, `/admin/orders/[id]` | `orders.view`; mutation requires `orders.update` |
| `/admin/payments` | `payments.approve` for manual decisions |
| `/admin/customers`, `/admin/customers/[id]` | `customers.manage` |
| `/admin/quotations`, `/admin/quotations/[id]` | `quotations.manage` |
| `/admin/promotions` | dedicated promotion permission added during RBAC implementation |
| `/admin/reviews` | dedicated review permission added during RBAC implementation |
| `/admin/content` | dedicated content permission added during RBAC implementation |
| `/admin/reports` | `reports.view` |
| `/admin/users`, `/admin/roles` | `users.manage` |
| `/admin/settings` | `settings.manage` |
| `/admin/audit-log` | `users.manage` or a dedicated audit permission |

## Route Handlers

| Route | Contract/security |
| --- | --- |
| `POST /api/auth/[...nextauth]` | Auth.js handlers and CSRF/session protections |
| `POST /api/uploads` | Replaced by typed purpose-specific uploads; authenticated and authorized |
| `POST /api/uploads/product-image` | Image validation; product permission; public storage |
| `POST /api/uploads/payment-proof` | Ownership check; private storage |
| `GET /api/documents/[id]` | Ownership/permission check followed by short-lived signed URL |
| `POST /api/cron/expire-quotations` | `CRON_SECRET` authenticated expiry of unpaid final quotations |
| `POST /api/payments/[provider]/initialize` | Checkout-bound initialization and idempotency |
| `POST /api/webhooks/paystack` | Signature verification and idempotent payment transition |
| `POST /api/webhooks/yoco` | Signature verification and idempotent payment transition |
| `GET /api/invoices/[orderNumber]` | Ownership/permission check and generated PDF |
| `GET /api/quotations/[quotationNumber]/pdf` | Ownership/permission check and generated PDF |
| `GET /api/admin/reports/[report].csv` | Permission check and streamed CSV |
| `POST /api/openai` | Existing protected, server-to-server optional integration |

Server Actions are preferred for first-party forms such as cart updates, profile changes, catalogue editing, inventory adjustments, quotation editing, and order transitions. Actions use Zod, authentication, permission checks, domain services, and consistent typed results.
