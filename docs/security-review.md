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
