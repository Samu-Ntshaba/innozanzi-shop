# Current route and authorization map

## Public and authentication

| Route | Purpose/access |
| --- | --- |
| `/`, `/shop`, `/categories/[slug]`, `/products/[slug]` | Public catalogue and discovery |
| `/cart` | Anonymous or authenticated quotation list |
| `/quotations/request` | Authenticated multi-product quotation submission |
| `/partners`, `/partners/apply` | Public programme and authentication continuation |
| `/contact`, `/how-to`, `/policies/[slug]` | Support and managed content |
| `/newsletter/thank-you`, `/unsubscribe` | Subscription lifecycle |
| `/register`, `/sign-in`, `/verify-email`, `/forgot-password`, `/reset-password` | Customer identity lifecycle |

## Customer account

Every account page calls `requireUser`; record queries additionally scope by the authenticated user.

| Route | Purpose |
| --- | --- |
| `/account` | Customer operational overview |
| `/account/quotations` | Quotation status, PDFs and private proof upload |
| `/account/orders` | Customer-owned order history |
| `/account/orders/[orderNumber]` | Customer-owned fulfilment timeline |
| `/account/partnership`, `/account/partnership/apply` | Application/status and private evidence |
| `/account/partner` | Approval-gated partner workspace |
| `/account/partner/requests`, `/new`, `/[id]` | Owner-scoped partner sourcing requests/offers |

## Administration

All reads and mutations repeat server-side permissions; navigation visibility is not an authorization boundary.

| Route group | Required permission |
| --- | --- |
| `/admin` and reports/CSV | `reports.view` |
| products, categories, brands, suppliers, Syntech | `products.view` or `products.update` as appropriate |
| inventory | `inventory.manage` |
| quotations and invoices | `quotations.manage` |
| payments | `payments.approve` |
| orders and `/admin/orders/[id]` | `orders.view`; mutation `orders.update`; cancellation also `payments.approve` |
| customers, help desk, email marketing/delivery | `customers.manage` |
| promotions/content | `settings.manage` |
| reviews | `products.update` |
| access control/audit | `users.manage` |
| partnership dashboard/applications/partners/requests | dedicated `partnership.*` permissions |

## Route handlers

| Route | Security/contract |
| --- | --- |
| `GET /api/health` | Public dependency readiness; no-store |
| `POST /api/uploads` | `products.update`; image-only public catalogue assets |
| `GET /api/documents/[id]` | Owner or finance/partnership permission; five-minute private signed URL |
| `GET /api/quotations/[quotationNumber]/pdf` | Quotation owner or `quotations.manage` |
| `POST /api/cron/expire-quotations` | Timing-safe `CRON_SECRET` bearer validation |
| `POST /api/webhooks/[provider]` | Paystack/Yoco signature validation and idempotent processing |
| `POST /api/openai` | Timing-safe server secret; bounded input/output; no stored prompts |
| `GET /api/admin/reports/[report]/csv` | `reports.view` |
