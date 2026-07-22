# Security review

## Implemented controls

- Server-side RBAC with explicit permission checks and privileged-action audit records.
- Purpose-specific public/private storage access and signed private document retrieval.
- Proof-of-payment documents use a private bucket and five-minute ownership/permission-checked signed URLs.
- Payment verification and order activation are one serializable, duplicate-resistant transaction; internal cost and tracking notes are excluded from customer queries.
- Password hashing, session controls, authentication throttling, and quotation throttling.
- Payment webhook signature/idempotency boundaries and server-authoritative commerce totals.
- HSTS, clickjacking, MIME sniffing, referrer, permissions, and cross-origin opener headers.
- Non-indexed admin/auth areas, canonical metadata, and no-store operational/report responses.

## Pre-launch review

Rotate exposed secrets, configure provider secrets, test denied permissions, verify upload MIME/size enforcement, exercise replayed webhooks, and review dependencies. The in-memory limiter is suitable for a single instance; replace it with Redis or another shared store before horizontally scaling.

## Performance budget

Target p75 LCP under 2.5 seconds, INP under 200 ms, CLS under 0.1, initial JavaScript under 250 KB compressed per key storefront route, and database-backed page responses under 500 ms at normal load.
# Partnership security review

- Partners reuse customer authentication; there is no alternate login or privilege-bearing client flag.
- Workspace and request mutations verify an approved partnership server-side. Navigation visibility is not treated as authorization.
- Application, request, offer and document reads are scoped through the owning user or an explicit RBAC permission.
- Supplier costs, internal notes and internal messages are never selected into customer-facing views.
- Approval, rejection, suspension, pricing, document review and request management use separate least-privilege permissions.
- The database unique `activeKey` prevents concurrent active application creation, with serializable draft creation as an additional guard.
- Private files are stored in the private document bucket; the public database stores metadata and an opaque object path only.
- Offer acceptance snapshots verified offer values into the quotation domain and cannot directly create an active order.
- High-impact mutations preserve actor, before/after state, reason and timestamp in audit/history tables.

Operational follow-up: configure retention periods for declined application evidence, periodically expire documents/reviews, and include partnership permissions in quarterly access reviews.
