# Payment and Order Reliability Design

## Objective

PayFast and Ozow must produce the same reliable business outcome: a provider-verified payment becomes one traceable paid order, activates the configured order automation, reserves internal inventory once, converts the originating cart, and queues meaningful customer and staff communication once. A missed or delayed webhook must be recoverable without relying on browser claims or manual database edits.

This work also repairs cart quantity and removal behaviour and supplies evidence-based acceptance tests from checkout through completed delivery. It does not automate refunds, settlement accounting, or distributor API ordering.

## Incident Finding

Checkout already persists an awaiting-payment order before redirecting to either gateway. Paid-order visibility, cart conversion, inventory reservation, automation, and email all happen later in the verified-payment finalizer.

The Ozow Payments API integration currently compares `IsTest` with lowercase `true` or `false`, while Ozow notifications use the posted values `True` or `False`. This rejects valid notifications. The transaction lookup also assumes only the historical array response shape, while the current Ozow endpoint documents a single transaction object. A rejected notification plus failed reconciliation leaves the existing order pending and hidden from the paid-order Admin list, with an active cart and no confirmation email.

The repair must retain strict signature, merchant, amount, currency, reference, and provider-status verification. A successful browser redirect is never proof of payment.

## Architecture

### 1. Provider adapters

PayFast and Ozow remain responsible only for:

- constructing hosted-payment requests;
- authenticating notifications;
- querying authoritative provider status;
- returning a normalized `PaymentEvent`.

Ozow parsing will accept the provider’s documented boolean representation without weakening the hash comparison. Amounts will be normalized to two decimals for hash construction, and hash comparison will be case-insensitive. Lookup parsing will safely accept the documented single object and the historical array response, then validate site, reference, currency, amount, status, and test mode.

PayFast retains signature verification and remote `VALID` confirmation. Its normalized event must pass the same local reference, amount, and currency validation as Ozow.

### 2. One authoritative finalizer

Every authoritative path calls the existing payment finalization boundary:

- verified PayFast webhook;
- verified Ozow notification;
- provider-confirmed scheduled reconciliation;
- finance-controlled provider reconciliation;
- server-side recovery after a successful browser return.

The finalizer locks the payment and order, rejects mismatches, records the provider event idempotently, and performs one atomic database transition. Replayed notifications return success without duplicating stock reservations, order events, invoices, emails, cart conversion, or automation.

For a newly verified paid event the transaction will:

1. mark the payment `PAID` with provider evidence;
2. mark the order paid and set its paid timestamp;
3. reserve internal inventory exactly once or flag a stock exception;
4. preserve supplier stock as an order-time snapshot without decrementing the external feed locally;
5. convert the originating cart;
6. set `PAYMENT_VERIFIED`, or `PROCESSING` when automatic paid-order processing is enabled and commercial/stock checks are healthy;
7. create status history, customer tracking, audit, staff notification, and durable communication jobs;
8. update linked quotation, PC project, and recommendation records where applicable.

External email delivery and invoice generation remain outside the financial transaction, driven by durable retryable jobs created inside it.

### 3. Webhook and return recovery

Webhook endpoints acknowledge only after verified evidence is durably recorded or finalized. Processing failures return a retryable response and retain a recovery job.

Browser returns remain untrusted navigation signals. On a `success` return, the server will query the named payment’s configured provider using the saved merchant reference. If the provider confirms payment, the same finalizer runs before redirect. If the provider reports pending or is unavailable, the customer sees “payment confirmation in progress”; no payment is fabricated.

The scheduled reconciliation route remains the backstop and must run in production on a documented schedule. It retries stored verified events first, then provider-lookups pending PayFast/Ozow attempts fairly. Diagnostics record correlation id, provider result, failure category, and provider transaction id without storing secrets or signed payloads.

### 4. Order visibility and operational traceability

Admin Payments and Orders will expose hosted-payment attempts that are pending, failed, or paid but not finalized. Operators must be able to find an order by order number, customer, payment reference, or provider transaction id.

Pending orders will be labelled as payment reconciliation—not silently absent. No fulfilment action is enabled until authoritative payment confirmation. After confirmation, the order uses the single Order workspace through distributor assignment, supplier ordering, dispatch, tracking, delivery, and completion.

Automation setting `orders.automaticPaidProcessing` has one meaning for both gateways: a healthy paid order enters `PROCESSING`; an unhealthy paid order remains `PAYMENT_VERIFIED` with an explicit stock or commercial blocker. Gateway choice does not change this behaviour.

### 5. Communication semantics

Meaningful customer events are:

- order/payment confirmed;
- processing;
- shipped;
- out for delivery;
- delivered;
- cancelled;
- refunded or partially refunded where applicable.

Each uses a stable idempotency key. Payment confirmation creates a durable communication job inside the transaction; the worker retries customer confirmation, internal paid-order alert, and invoice generation. Admin shows queued, sent, and failed communication evidence. Provider acceptance means “sent to provider,” not guaranteed inbox delivery.

Automatic processing may legitimately queue both confirmation and processing messages, but each event is sent once and the wording must distinguish payment confirmation from operational processing.

### 6. Cart behaviour

An order’s originating cart remains active while payment is genuinely pending so a failed initiation can be recovered. It is converted atomically when payment is verified. Subsequent cart access creates a new empty active cart.

Local and supplier cart lines will both support update and remove with ownership checks, stock ceilings, clear success/error feedback, and consistent redirect/revalidation behaviour. Supplier quantity updates must re-read the current sellable supplier product and reject quantities above current supplier stock. Removing the last line produces the empty-cart view.

### 7. Inventory semantics

Internal inventory is reserved at verified payment, not browser return or checkout initiation. The reservation is guarded by row locking and recorded by an inventory movement tied to the order. Duplicate gateway events must not reserve twice.

Supplier catalogue stock is externally owned and refreshed from supplier feeds. A paid order records its required quantity and supplier snapshot; it does not decrement the feed cache as though Innozanzi owns that stock. Availability changes after payment become an explicit procurement exception without losing the captured payment.

## Error Handling and Safety

- Never mark payment paid from query parameters, redirect text, email, or an unchecked dashboard claim.
- Never discard a verified financial event because stock or margin checks fail; record payment and surface an operational blocker.
- Reject mismatched reference, amount, currency, site/merchant, test mode, signature/hash, or incomplete provider status.
- Store no gateway secrets, raw signed notification bodies, bank account data, or authentication headers in diagnostics.
- Preserve all historical orders, payments, gateway events, and audit records.
- Do not automatically retry a customer charge.
- Do not perform real refunds during testing.

## Test and Acceptance Strategy

### Automated contract and integration tests

For both PayFast and Ozow:

- valid completed notification;
- invalid signature/hash;
- incorrect merchant/site;
- mismatched reference, amount, or currency;
- pending, cancelled, abandoned, and error states;
- repeated notification and concurrent duplicate processing;
- return before webhook;
- missed webhook recovered by provider lookup;
- provider lookup unavailable and later retry;
- paid event with insufficient internal stock;
- paid event with stale/missing supplier availability;
- automatic processing enabled and disabled;
- durable customer/staff communication and retry;
- one invoice and one inventory reservation;
- cart conversion and creation of a new empty cart;
- Admin traceability of pending and paid attempts.

Cart tests cover local and supplier quantity increases, decreases, current-stock limits, removal, ownership rejection, and empty-cart state.

Order tests continue from paid status through distributor assignment, supplier placement/confirmation, shipment, out-for-delivery, delivered, and completed, including multi-supplier and legacy orders.

### Provider acceptance tests

Automated fixtures prove application behaviour but do not prove live credentials, dashboard configuration, public webhook reachability, DNS, or provider delivery. Before declaring gateway readiness:

1. run PayFast sandbox and Ozow test-mode success, cancellation, tampered notification, delayed notification, and repeated notification scenarios in an isolated test deployment;
2. confirm public notify URLs and exact site/merchant settings in both provider dashboards;
3. confirm customer confirmation, staff alert, invoice, Admin visibility, automatic-processing setting, cart conversion, and order completion for each successful test;
4. verify failed/cancelled attempts remain unpaid and do not reserve inventory or send confirmation;
5. after sandbox evidence passes, perform one authorised minimum-value live transaction per gateway using designated test products and recipients;
6. reconcile the merchant dashboard transaction against the application payment, order, gateway event, audit log, email outbox, and inventory movement;
7. do not claim full live readiness if either provider test, email-provider evidence, production scheduler, or webhook reachability cannot be observed.

## Deployment and Rollback

Deploy additive application changes without deleting payment data. Confirm the production reconciliation schedule and email worker before enabling checkout. Temporarily disable only the affected gateway if its verification path cannot be proven; keep the other verified gateway available.

Rollback application code without dropping gateway events, diagnostics, payment attempts, orders, or communication jobs. Reconcile all pending/paid attempts against provider evidence before changing gateway configuration. Any payment captured during an incident remains a finance-controlled exception until matched to its order.

## Completion Criteria

The work is complete only when:

- the full automated suite, type check, lint, and production build pass;
- both provider-specific acceptance matrices pass in their safe test environments;
- at least one explicitly authorised live minimum-value transaction per enabled gateway is reconciled end to end, or live testing is clearly reported as outstanding;
- every captured test payment is visible and traceable;
- emails and automation demonstrate stable idempotency;
- carts and inventory show the expected post-payment state;
- a paid order can be operated through completion from desktop and Mobile Admin;
- production monitoring exposes pending payment and communication exceptions.
