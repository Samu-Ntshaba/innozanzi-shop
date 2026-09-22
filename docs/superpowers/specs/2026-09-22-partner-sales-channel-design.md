# Partner Sales Channel Design

## Objective

Create a controlled, co-branded B2B sales channel for approved Innozanzi partners. A partner can showcase an Admin-approved catalogue to its own business clients, collect quotation requests, manage a sales pipeline, send an Innozanzi-approved client quotation, and follow the resulting order. The client pays Innozanzi through the existing PayFast or Ozow flow. Innozanzi remains merchant of record, controls the final client price, manages the order, and pays the partner an approved commission only after successful completion and financial reconciliation.

This is not a separate e-commerce platform or fulfilment system. It extends the existing Partnership, Quotation, Payment, Order, document, email, pricing, and audit systems. Orders remains the single operational workspace, and distributors continue to fulfil and deliver directly to customers.

## Confirmed Commercial Decisions

- Innozanzi approves every final client-facing price.
- A partner cannot add markup or alter an approved price.
- Admin may configure either a percentage commission or a fixed-rand commission as a partner default and may override it per quotation with an audit trail.
- Commission is not payable at payment time. It becomes payable only after delivery/completion and final financial reconciliation.
- Refunds, cancellations, chargebacks, disputes, and approved adjustments reduce, hold, reverse, or eliminate commission before payout.
- The partner is the primary salesperson and brand presence, while Innozanzi is clearly disclosed as merchant of record, quotation/document issuer, payment recipient, and order operator.
- Clients may pay immediately from a current, approved, unexpired quotation. No additional partner confirmation is required after the partner sends it.
- Each partner can present only products, combos, and campaigns explicitly approved by Innozanzi.
- Each partner receives a public branded catalogue path and may create private client-specific showcases using secure, expiring, revocable links.
- Commission settlement starts with finance-approved payout batches and EFT evidence. Payment-gateway splitting is out of scope.
- Client accounts are not required for enquiry, quotation acceptance, payment, or public tracking.

## Architecture

### Existing systems to reuse

The implementation reuses:

- `Partnership`, partnership agreements, applications, benefits, commercial terms, requests, activities, messages, and the partner portal;
- `QuotationRequest`, `Quotation`, `QuotationItem`, immutable versions, lifecycle history, PDFs, acceptance, and order conversion;
- the commerce pricing engine, protected floors, VAT, delivery, gateway cost, reserve, and profitability review;
- PayFast and Ozow hosted-payment verification and idempotent paid-order finalization;
- `Order`, supplier procurement groups, distributor shipments, customer tracking, invoices, delivery notes, and reconciliation;
- the notification outbox, email templates, uploaded documents, permissions, and audit log.

No duplicate partner payment, quotation, order, inventory, delivery, or fulfilment engine will be created.

### New bounded capabilities

The partner sales channel adds:

1. controlled partner branding and activation;
2. partner-specific catalogue approval;
3. anonymous client enquiry and client ownership records;
4. curated public/private showcases;
5. a partner quote case linking the complete sales journey;
6. two-audience quotation rendering from one approved commercial snapshot;
7. commission accrual, adjustment, eligibility, and payout records;
8. partner-scoped order and commission visibility.

## Data Model

All schema changes are additive. Existing partnership, quotation, order, payment, and historical records remain compatible.

### `PartnerSalesProfile`

One optional profile per approved partnership:

- partnership ID;
- unique public slug;
- activation/onboarding state;
- approved business display name, legal name, registration and VAT details where applicable;
- logo document/image reference;
- approved contact details and limited footer text;
- constrained theme values selected from safe options;
- default commission method (`PERCENTAGE` or `FIXED_AMOUNT`) and value;
- profile approval timestamps and actors;
- public catalogue enabled flag;
- suspension/revocation timestamps.

The profile does not replace the legal Partnership or agreement. The channel cannot activate unless the partnership is active, the agreement requirements are satisfied, and required profile fields are approved.

### `PartnerCatalogueAssignment`

An Admin-approved relationship between a sales profile and one product, supplier catalogue product, combo, or campaign:

- typed source identity;
- visibility start/end;
- active/withdrawn state;
- optional partner-specific presentation copy and media selected from approved assets;
- availability snapshot/fingerprint;
- approver and audit metadata.

Assignment never grants access to supplier costs, internal stock notes, pricing floors, or unpublished catalogue data. Effective availability and pricing are revalidated when a quotation is prepared and again before payment.

### `PartnerClient`

A lightweight client relationship owned by exactly one partnership:

- company, contact name, email, phone;
- VAT/registration details when supplied;
- billing and delivery information;
- communication consent and source;
- partner-visible notes separated from internal Innozanzi notes;
- created/updated timestamps.

No login is required. Deduplication is scoped to the partnership so one business may legitimately interact with more than one independent partner without cross-partner disclosure.

### `PartnerShowcase` and items

A curated collection created by the partner from its approved catalogue:

- partnership/profile and optional client relationship;
- title and partner-authored introduction subject to length/content validation;
- state (`DRAFT`, `ACTIVE`, `EXPIRED`, `REVOKED`);
- public or client-specific visibility;
- hashed random access token for private showcases;
- expiry and revocation timestamps;
- immutable item snapshots covering identity, title, approved media, and presentation copy.

Public catalogue URLs use `/p/{partnerSlug}`. Public showcase URLs may use `/p/{partnerSlug}/s/{publicId}`. Private access secrets must not be stored in plaintext and must not appear in analytics or application logs.

### `PartnerQuoteCase`

The controlling sales-pipeline record:

- case number;
- partnership and partner client;
- originating showcase/link where applicable;
- assigned partner user and Innozanzi owner;
- pipeline status;
- linked `QuotationRequest`, active `Quotation`, accepted quotation/version, converted `Order`, and commission;
- client-visible notes, partner notes, and internal notes stored separately;
- enquiry, qualification, pricing, sent, accepted, paid, completed, lost, and closed timestamps.

Only one active approved quotation version may accept payment for a case.

### Existing quotation extensions

`QuotationRequest` and `Quotation` gain optional partner case/profile relationships. An approved partner quotation stores immutable snapshots of:

- partner identity and approved branding;
- end client identity and destination;
- product identities, SKUs, quantities, descriptions, and availability evidence;
- supplier cost and protected commercial inputs visible only internally;
- approved client unit prices, discounts, delivery, VAT, and total;
- commission method, rate/value, calculated commission, and override reason;
- expected Innozanzi contribution after commission;
- validity, terms, approver, and approval timestamp.

The Innozanzi commercial quotation and the partner/client quotation are two document views of the same approved version, not separately editable financial records. Innozanzi documents show the internal relationship; client documents show the approved selling values and co-branding without costs or internal economics.

### `PartnerCommission`

One commission obligation per accepted partner quotation/order:

- partnership, case, quotation/version, order;
- method and approved basis;
- quoted and current commission amount;
- status;
- eligibility and reconciliation timestamps;
- held/reversed/adjusted amount and reason;
- Admin actors and immutable calculation snapshot;
- optional payout batch relationship.

Statuses are `ESTIMATED`, `LOCKED_ON_PAYMENT`, `PENDING_COMPLETION`, `PAYABLE`, `HELD`, `ADJUSTED`, `REVERSED`, `INCLUDED_IN_BATCH`, and `PAID`. Transition functions enforce allowed forward and exception paths.

### `PartnerPayoutBatch` and items

A finance-controlled settlement record:

- batch number and period;
- status (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `CANCELLED`);
- included payable commissions;
- total, payment reference, payment date, proof document, and statement document;
- preparer and independent approver;
- approval and payment timestamps;
- exception notes and audit history.

A commission may belong to at most one non-cancelled payout item. Marking a batch paid is idempotent and requires payment evidence.

## Workflows and State Machines

### Partner channel activation

`INVITED → PROFILE_INCOMPLETE → ADMIN_REVIEW → ACTIVE`

Exceptions are `CHANGES_REQUIRED`, `SUSPENDED`, and `CLOSED`. An inactive partnership, expired mandatory agreement, or Admin suspension immediately disables public publishing and new quotation/payment activity while preserving historical access according to policy.

### Client sales pipeline

Normal path:

`NEW_ENQUIRY → QUALIFIED → PRICING_REQUESTED → INNOZANZI_REVIEW → PARTNER_REVIEW → SENT_TO_CLIENT → ACCEPTED → PAYMENT_PENDING → PAID → ORDER_IN_PROGRESS → COMPLETED`

Exceptions are `REVISION_REQUESTED`, `DECLINED`, `EXPIRED`, `CANCELLED`, `REFUNDED`, and `DISPUTED`.

The partner may edit requirements, client details, requested quantities, and client-facing contextual notes before approval. The partner cannot set or alter prices, discounts, delivery charges, VAT, payment terms, commission, or validity.

### Pricing, approval, and revision

1. The client or partner submits requirements.
2. The system resolves current products, costs, availability, protected floors, delivery, VAT, gateway costs, reserve, and required contribution.
3. Admin edits and approves the final client price and commission.
4. Approval freezes a numbered quotation version and all commercial snapshots.
5. The partner may send it, request revision with comments, or decline the opportunity.
6. Any commercial change creates a new version and requires fresh Admin approval.
7. Default validity is 48 hours; Admin may explicitly choose another expiry.
8. Expired quotations cannot accept payment and must be repriced into a new version.

### Client acceptance and payment

The secure quotation page displays the current approved version, co-branding, merchant disclosure, terms, expiry, and exact total. Acceptance records the version, amount, timestamp, safe request metadata, and consent. The client then pays Innozanzi through PayFast or Ozow.

Browser success is never payment evidence. Only the existing verified webhook, provider lookup, reconciliation, or approved finance path can mark payment paid. The paid finalizer idempotently converts the exact accepted quotation snapshot into one order and links the partner case and commission.

### Order lifecycle

The resulting order follows the existing distributor-direct flow:

`Payment Confirmed → Processing → Supplier Selection → Supplier Order → Supplier Confirmation → Dispatch → Tracking → Out for Delivery → Delivered → Completed`

The partner sees a redacted customer-oriented status view. Supplier cost, internal notes, pricing floors, commercial review, and unrelated fulfilment groups remain private. Desktop and Mobile Admin continue to operate the order inside Orders.

### Commission lifecycle

On quotation approval the commission is `ESTIMATED`. Verified payment locks the accepted amount and moves it to `LOCKED_ON_PAYMENT`, then `PENDING_COMPLETION`. It becomes `PAYABLE` only after:

- the order is delivered/completed;
- final supplier, delivery, gateway, refund, and other relevant costs are reconciled;
- no unresolved cancellation, refund, chargeback, dispute, or return hold applies;
- the commission still satisfies the approved commercial snapshot and policy.

Finance may hold or adjust a commission with a mandatory reason and audit entry. Refunds or cancellations before payout reverse it. Post-payout corrections create compensating ledger entries; paid history is never edited or deleted.

## User Experiences

### Partner workspace

Extend the existing authenticated partner area with:

- onboarding checklist and approved sales profile;
- dashboard counts for enquiries, quotations, orders, commissions, and payouts;
- approved catalogue and campaign browser;
- showcase/link builder;
- partner-scoped client directory;
- quote-case pipeline and revision messaging;
- co-branded quotation preview, send action, and PDF;
- redacted order tracking;
- estimated, pending, payable, held, and paid commission views;
- payout statements and evidence.

The partner portal is not an Admin surface and receives purpose-built redacted queries.

### Public client experience

- `/p/{partnerSlug}` presents the approved partner identity and catalogue.
- Clients can browse, share, select quantities, and request a quotation without creating an account.
- Required fields include business/contact identity, email, phone, requested items/quantities, destination, timing, and legitimate delivery instructions.
- Private showcases and quotations require independent unguessable tokens with expiry/revocation checks.
- The quotation page supports acceptance and PayFast/Ozow payment only while the exact version remains eligible.
- Tracking uses the existing simple customer milestones.

### Admin workspace

Add a Sales Channels area within Partnerships and connect it to existing Quotations, Pricing, Payments, Orders, and Reports:

- activation/profile approval;
- catalogue assignments and withdrawals;
- enquiry and quote-case queue;
- protected pricing and commission editor;
- quotation version approval;
- order and payment linkage;
- commission eligibility/exception review;
- payout batch preparation, independent approval, payment evidence, and statements;
- audit and operational exception reporting.

## Branding and Legal Presentation

Partner branding is constrained to an approved logo, business/display name, contact details, limited footer copy, and safe theme presets. Partners cannot upload arbitrary executable content, styles, scripts, document templates, or tracking tags.

Client-facing documents and pages prominently show the partner as salesperson while clearly stating that the quotation is issued by Innozanzi on behalf of the partner, payment is collected by Innozanzi, and fulfilment/order communication is managed by Innozanzi. Invoices and tax documents are issued by Innozanzi. Exact legal and tax wording remains configurable content subject to business/legal review before activation.

## Permissions and Data Isolation

Add focused permissions for sales-profile approval, catalogue management, quote pricing, commission management, and payout preparation/approval. Existing super-administrator behavior remains, but ordinary Admin roles receive only explicit grants.

Every partner query must scope by the authenticated user's active `partnershipId`; hiding navigation is not authorization. Partners cannot access:

- other partnerships or clients;
- supplier identity where commercially sensitive, supplier cost, or supplier notes;
- protected floors, profitability, commercial rules, or internal pricing snapshots;
- payment credentials or raw gateway evidence;
- internal Admin notes, audit details, or payout controls.

Public tokens are generated from cryptographically secure randomness, stored hashed, compared safely, scoped to one resource, expiring, and revocable. Rate limits, bounded request bodies, same-origin controls where applicable, bot/spam protection, and audit-safe logging apply to public mutation endpoints.

Pricing approval and payout approval are separate permissions. Where separation of duties is enabled, the preparer cannot approve their own commission override or payout batch.

## Communications

One domain event may create separate partner, client, and internal messages. Required events include:

- enquiry received;
- pricing/quotation ready for partner review;
- revision requested or resolved;
- quotation sent and expiring soon;
- quotation accepted;
- payment confirmed or payment exception;
- processing, shipped, out for delivery, delivered, cancelled, and refunded;
- commission held, payable, included in payout, and paid.

The durable email outbox uses stable idempotency keys containing the business event and recipient audience. Failed email never rolls back a successful quotation, payment, order, commission, or payout transition. Admin and partner views show queued/sent/failed evidence appropriate to their permissions.

## Error Handling and Financial Integrity

- Critical form submissions use stable route handlers with bounded inputs, explicit authorization, actionable validation feedback, and canonical redirects.
- Quote approval, acceptance, payment finalization, order conversion, commission creation, eligibility, and payout posting are idempotent.
- Transactions lock quotation/payment/order/commission rows before financial transitions.
- Only one active payable quotation version exists per case.
- Payment amount, currency, reference, quotation version, and order total must match the accepted snapshot exactly.
- Verified payment evidence is retained even if stock or margin later produces an operational exception.
- Catalogue withdrawal or stock/cost changes block new acceptance/payment and require repricing; they do not rewrite historical approved or paid records.
- Payout posting never mutates paid history; corrections use compensating entries.
- Internal errors receive traceable references without exposing costs, stack traces, credentials, or private notes.

## Testing Strategy

### Unit and lifecycle coverage

- onboarding and channel activation transitions;
- partner/client/case isolation rules;
- catalogue and showcase eligibility;
- token hashing, expiry, revocation, and tampering;
- percentage and fixed-rand commission calculation and overrides;
- quote validity, versioning, approval, revision, acceptance, and expiry;
- commission eligibility, holds, adjustments, reversals, and payout constraints;
- redaction serializers and document-view separation.

### Integration coverage

- anonymous client enquiry through partner/Admin notification;
- partner request through Admin-approved quotation and client send;
- PayFast and Ozow accepted-quotation payment journeys;
- concurrent/replayed payment and conversion events;
- exact quotation-to-order/invoice/commission reconciliation;
- multi-supplier orders managed inside one Order;
- cancellation, refund, chargeback, dispute, and return holds;
- finance-approved payout batches and duplicate-payout prevention;
- email idempotency and retry;
- desktop, Mobile Admin, partner workspace, responsive public pages, PDFs, and data redaction.

### Security and production checks

- horizontal and vertical authorization attempts;
- public token enumeration and revoked-link behavior;
- request-size, rate-limit, spam, upload, and content-validation controls;
- absence of costs/floors/supplier data in HTML, RSC payloads, JSON, PDFs, email, and logs;
- migration compatibility and historical-data preservation;
- production build and route-manifest validation;
- load-sensitive public catalogue, showcase, enquiry, and quotation endpoints.

## Rollout

1. Apply additive schema and permission definitions with the feature disabled.
2. Deploy internal Admin and partner capabilities without public activation.
3. Configure legal copy, email templates, pricing/commission policies, payout controls, limits, and monitoring.
4. Activate one internal test partnership and approved test catalogue.
5. Complete the entire journey with PayFast in an isolated/test context.
6. Complete the same journey with Ozow.
7. Validate client, partner, Admin, quotation, payment, order, invoice, commission, refund, payout, document, and audit evidence.
8. Enable one selected real sales partner under monitored rollout.
9. Monitor enquiry abuse, expired quotes, payment reconciliation, emails, order exceptions, commission holds, and payout exceptions.
10. Expand partner activation only after acceptance evidence passes.

Rollback disables new channel activity and public links without deleting profiles, cases, quotations, payments, orders, commissions, payouts, or audit history. Existing accepted/paid business records remain operable through their normal Innozanzi workflows.

## Production Acceptance Criteria

The channel is production-ready only when:

- no partner can access another partner's clients, cases, documents, orders, or commissions;
- no public or partner response exposes internal costs, floors, supplier details, credentials, or internal notes;
- approved quotation, accepted version, collected payment, converted order, invoice, and commission snapshot agree exactly;
- PayFast and Ozow complete the same idempotent lifecycle;
- there are no duplicate orders, emails, commissions, ledger entries, or payouts;
- refunds, cancellations, disputes, and reconciliation exceptions correctly block or reverse commission;
- Admin retains final pricing, commission override, and payout authority;
- the partner can operate the sales pipeline without Admin access;
- Orders remains the sole fulfilment workspace on desktop and Mobile Admin;
- existing storefront, customer quotation, partnership, payment, and order journeys pass regression tests;
- the monitored pilot completes from client enquiry through paid partner payout with auditable evidence.

## Explicit Non-Goals for the First Release

- partner-controlled prices or discounts;
- automatic gateway payment splitting;
- partner-owned merchant accounts;
- arbitrary partner HTML/CSS/scripts or full storefront themes;
- separate partner inventory, checkout, order, warehouse, or delivery engines;
- client account registration requirements;
- automatic commission payout without finance approval;
- rewriting historical partnership, quotation, payment, or order records.
