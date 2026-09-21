# Payment and Order Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PayFast and Ozow converge on one idempotent paid-order outcome with recovery, communication, cart, inventory, Admin traceability, and end-to-end acceptance evidence.

**Architecture:** Provider adapters authenticate and normalize external evidence into `PaymentEvent`; one locked finalizer owns all financial and order side effects. Webhooks, provider reconciliation, and success-return recovery call that same finalizer, while durable jobs handle emails and invoices after commit.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/PostgreSQL, Zod, Vitest, PayFast ITN API, Ozow Payments API, existing email outbox.

**Spec:** `docs/superpowers/specs/2026-09-21-payment-order-reliability-design.md`

## Global Constraints

- Never authorize payment from browser query parameters, redirect text, email, or an unchecked dashboard claim.
- Preserve all historical orders, payments, gateway events, audit records, and communication jobs.
- A verified financial event is recorded even when stock or commercial review blocks fulfilment.
- Do not automatically retry charges or perform real refunds.
- Supplier stock remains externally owned and refreshed from feeds; only internal inventory is reserved locally.
- Provider fixtures do not count as proof of live credentials, webhook reachability, scheduler operation, or email delivery.
- Use no new runtime dependency unless the existing platform cannot implement the verified contract safely.

## Review Focus

- Ozow posts `IsTest=True`/`False` and mixed-case hashes; valid evidence must verify without accepting a mismatched environment.
- Provider lookup may return one object or a historical array; exactly one matching completed transaction may authorize payment.
- A success return can race a webhook; concurrent paths must reserve stock, convert the cart, and queue messages only once.
- A paid event with unavailable stock must remain paid and traceable while fulfilment shows a blocker.
- A converted cart must not reappear, and supplier quantity changes must never exceed current sellable stock.

---

### Task 1: Normalize and verify the Ozow contract

**Files:**
- Create: `src/integrations/payments/ozow-contract.ts`
- Modify: `src/integrations/payments/approved-gateways.ts`
- Modify: `src/integrations/payments/lookup.ts`
- Test: `tests/approved-payment-events.test.ts`
- Test: `tests/payment-recovery.test.ts`

**Interfaces:**
- Produces: `normalizeOzowBoolean(value: string): "true" | "false"`, `ozowTransactionRows(value: unknown): OzowTransaction[]`, and `selectVerifiedOzowTransaction(...)`.
- Consumed by: notification verification, reference lookup, transaction-id reconciliation, and later return recovery.

- [ ] **Step 1: Write failing contract tests**

Add tests proving `IsTest=False` verifies against production mode, `IsTest=True` verifies against test mode, amount hashing uses two decimals, hash comparison ignores hexadecimal case, both object and array lookup responses normalize, and multiple completed rows return `MULTIPLE_PROVIDER_TRANSACTIONS` rather than choosing silently.

```ts
expect(normalizeOzowBoolean("False")).toBe("false");
expect(normalizeOzowBoolean("TRUE")).toBe("true");
expect(ozowTransactionRows(single)).toEqual([single]);
expect(() => selectVerifiedOzowTransaction([first, second], expected)).toThrow(/multiple/i);
```

- [ ] **Step 2: Run the focused tests and verify the expected failures**

Run: `npx vitest run tests/approved-payment-events.test.ts tests/payment-recovery.test.ts`

Expected: FAIL because the normalization helpers do not exist and the current verifier rejects title-case `IsTest`.

- [ ] **Step 3: Implement the focused Ozow adapter**

Create strict schemas for the provider fields and normalize only representation, never identity or outcome:

```ts
export function normalizeOzowBoolean(value:string){
  const normalized=value.trim().toLowerCase();
  if(normalized!=="true"&&normalized!=="false") throw new Error("Invalid Ozow test mode");
  return normalized;
}

export function ozowTransactionRows(value:unknown){
  return z.array(ozowTransactionSchema).parse(Array.isArray(value)?value:[value]);
}
```

Use the raw posted `IsTest` and two-decimal `Amount` when recomputing the notification hash, then compare the normalized boolean with configured mode. Accept object/array lookup responses, require one matching row, and validate site, reference, currency, amount, status, and test mode before returning a `PaymentEvent`.

- [ ] **Step 4: Run focused tests and type checking**

Run: `npx vitest run tests/approved-payment-events.test.ts tests/payment-recovery.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit the adapter repair**

```bash
git add src/integrations/payments/ozow-contract.ts src/integrations/payments/approved-gateways.ts src/integrations/payments/lookup.ts tests/approved-payment-events.test.ts tests/payment-recovery.test.ts
git commit -m "fix: normalize verified Ozow payment evidence"
```

### Task 2: Prove one authoritative payment finalizer

**Files:**
- Create: `src/domain/payments/finalize.ts`
- Modify: `src/domain/payments/webhooks.ts`
- Modify: `src/domain/payments/recovery.ts`
- Test: `tests/payment-finalization.test.ts`
- Test: `tests/order-notification-timing.test.ts`

**Interfaces:**
- Consumes: normalized `PaymentEvent` from Task 1 and existing `assertPaymentEventMatches`.
- Produces: `finalizeVerifiedPayment(provider: ApprovedGateway, event: PaymentEvent): Promise<{duplicate:boolean;paymentId:string}>`.

- [ ] **Step 1: Write failing finalizer tests**

Use the repository’s Prisma test strategy to exercise a newly paid order and replay. Assert one payment transition, order transition, gateway event, inventory reservation movement, cart conversion, communication job, tracking event, and audit record. Add a stock-shortage case that records payment while leaving an explicit blocker, plus a test where automation enabled yields `PROCESSING` and disabled yields `PAYMENT_VERIFIED` for both gateways.

```ts
await Promise.all([finalizeVerifiedPayment("OZOW", event), finalizeVerifiedPayment("OZOW", event)]);
expect(await movementCount(order.id)).toBe(1);
expect(await communicationJobCount(order.id)).toBe(1);
expect((await cart(cartId)).status).toBe("CONVERTED");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/payment-finalization.test.ts tests/order-notification-timing.test.ts`

Expected: FAIL because `finalizeVerifiedPayment` is not exported and existing side effects live directly in `processPaymentEvent`.

- [ ] **Step 3: Extract the locked finalizer without changing security checks**

Move the transactional body from `processPaymentEvent` into `finalizeVerifiedPayment`. Keep payment/order row locks, `GatewayEvent` uniqueness, amount/reference/currency checks, duplicate-capture handling, internal inventory reservation, cart conversion, automation setting, durable jobs, order history, tracking, quotation/PC updates, and audit logging in this boundary.

Retain `processPaymentEvent` as a compatibility wrapper for legacy hosted providers if required:

```ts
export async function processPaymentEvent(provider:PaymentProvider,event:PaymentEvent){
  return finalizeVerifiedPayment(provider,event);
}
```

- [ ] **Step 4: Verify idempotency and all existing payment tests**

Run: `npx vitest run tests/payment-finalization.test.ts tests/payment-webhook-route.test.ts tests/payment-recovery.test.ts tests/order-notification-timing.test.ts tests/payment-orchestration.test.ts && npx tsc --noEmit`

Expected: PASS with no duplicate business side effects.

- [ ] **Step 5: Commit the finalizer**

```bash
git add src/domain/payments/finalize.ts src/domain/payments/webhooks.ts src/domain/payments/recovery.ts tests/payment-finalization.test.ts tests/order-notification-timing.test.ts
git commit -m "refactor: centralize verified payment finalization"
```

### Task 3: Recover successful browser returns safely

**Files:**
- Create: `src/domain/payments/return-recovery.ts`
- Modify: `src/app/api/payments/return/[paymentId]/route.ts`
- Modify: `src/integrations/payments/lookup.ts`
- Test: `tests/payment-return.test.ts`

**Interfaces:**
- Consumes: `lookupPendingPayment` and `acceptVerifiedPayment`/the Task 2 finalizer.
- Produces: `recoverPaymentAfterReturn(paymentId: string): Promise<"paid"|"processing"|"failed">`.

- [ ] **Step 1: Write failing return-race tests**

Cover success-return with provider-confirmed paid evidence, provider pending, provider unavailable, invalid payment id, and a webhook racing the return. Assert that query parameters alone never mutate state and that the paid case redirects to `?payment=success` only after authoritative finalization.

```ts
expect(finalize).not.toHaveBeenCalledWith(expect.objectContaining({rawBrowserResult:"success"}));
expect(response.headers.get("location")).toContain("payment=processing");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/payment-return.test.ts`

Expected: FAIL because the route currently records only a diagnostic and always returns `processing` for success.

- [ ] **Step 3: Implement bounded server-side lookup recovery**

On `result=success`, load the saved payment, require provider `PAYFAST` or `OZOW`, and call provider lookup. Ozow may return a verified event immediately. PayFast lookup may only request ITN resend/reconciliation and must remain processing unless signed evidence exists. Catch provider availability errors, record sanitized diagnostics, and redirect without converting the browser claim into evidence.

- [ ] **Step 4: Run return and security tests**

Run: `npx vitest run tests/payment-return.test.ts tests/payment-webhook-route.test.ts tests/approved-payment-events.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit return recovery**

```bash
git add src/domain/payments/return-recovery.ts src/app/api/payments/return/[paymentId]/route.ts src/integrations/payments/lookup.ts tests/payment-return.test.ts
git commit -m "fix: recover verified payments after gateway return"
```

### Task 4: Make payment exceptions traceable in Admin

**Files:**
- Modify: `src/domain/admin/queries.ts`
- Modify: `src/app/admin/orders/page.tsx`
- Modify: `src/app/admin/orders/[id]/page.tsx`
- Modify: `src/app/mobile-admin/orders/page.tsx`
- Modify: `src/components/admin/payment-attention.tsx`
- Test: `tests/order-operations-readiness.test.ts`
- Test: `tests/payment-admin-readiness.test.ts`

**Interfaces:**
- Consumes: existing payment diagnostics and order/payment states.
- Produces: searchable pending/failed/paid-unfinalized rows and direct reconciliation links.

- [ ] **Step 1: Write failing Admin visibility tests**

Assert that default order queries include recent hosted-payment attempts in `AWAITING_PAYMENT`, payment/provider references are searchable, and UI copy labels these rows “Payment confirmation pending” instead of presenting fulfilment actions.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/order-operations-readiness.test.ts tests/payment-admin-readiness.test.ts`

Expected: FAIL because default `getAdminOrders` filters to paid/refunded states.

- [ ] **Step 3: Implement traceable exception views**

Extend the default query to include hosted attempts requiring reconciliation while retaining the 100-row bound. Select the latest payment regardless of paid state, display provider/status/reference, and link to Admin Payments evidence. In the order detail, suppress fulfilment controls until paid and show diagnostics/reconciliation guidance.

- [ ] **Step 4: Verify Admin tests and type checking**

Run: `npx vitest run tests/order-operations-readiness.test.ts tests/payment-admin-readiness.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit traceability changes**

```bash
git add src/domain/admin/queries.ts src/app/admin/orders/page.tsx src/app/admin/orders/[id]/page.tsx src/app/mobile-admin/orders/page.tsx src/components/admin/payment-attention.tsx tests/order-operations-readiness.test.ts tests/payment-admin-readiness.test.ts
git commit -m "feat: surface hosted payment exceptions in orders"
```

### Task 5: Make communication and automatic processing observably reliable

**Files:**
- Modify: `src/domain/notifications/order-alerts.ts`
- Modify: `src/domain/notifications/customer-order.ts`
- Modify: `scripts/process-email-automation.ts`
- Modify: `src/app/admin/orders/[id]/page.tsx`
- Test: `tests/order-notification-timing.test.ts`
- Test: `tests/order-notification-templates.test.ts`
- Test: `tests/payment-finalization.test.ts`

**Interfaces:**
- Consumes: durable `PAID_ORDER_COMMUNICATION` job from Task 2.
- Produces: stable confirmation/processing idempotency and visible retry evidence.

- [ ] **Step 1: Write failing communication tests**

Assert confirmation is queued once for both gateways, retry after an injected email failure succeeds without a second confirmation, automatic processing produces a distinct processing event/message once, and Admin exposes pending/failed/sent states.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/order-notification-timing.test.ts tests/order-notification-templates.test.ts tests/payment-finalization.test.ts`

Expected: FAIL on missing failure-state persistence or processing-event idempotency evidence.

- [ ] **Step 3: Harden the durable worker**

Mark failed jobs `FAILED` with sanitized error details, retain them for retry, and mark `SENT` only after customer confirmation, staff alert, and invoice creation finish. Use existing stable email idempotency keys. Ensure the automation setting generates the `PROCESSING` customer event through the same status-email semantics and not gateway-specific code.

- [ ] **Step 4: Verify communication tests**

Run: `npx vitest run tests/order-notification-timing.test.ts tests/order-notification-templates.test.ts tests/payment-finalization.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit communication reliability**

```bash
git add src/domain/notifications/order-alerts.ts src/domain/notifications/customer-order.ts scripts/process-email-automation.ts src/app/admin/orders/[id]/page.tsx tests/order-notification-timing.test.ts tests/order-notification-templates.test.ts tests/payment-finalization.test.ts
git commit -m "fix: make paid order communication retryable"
```

### Task 6: Repair cart conversion and cart controls

**Files:**
- Modify: `src/domain/cart/actions.ts`
- Modify: `src/domain/cart/service.ts`
- Modify: `src/app/(store)/cart/page.tsx`
- Modify: `src/domain/payments/finalize.ts`
- Test: `tests/unit/cart.test.ts`
- Test: `tests/payment-finalization.test.ts`

**Interfaces:**
- Consumes: retail payment idempotency key and `sellableSupplierWhere`.
- Produces: consistent cart mutations and a new empty active cart after verified payment.

- [ ] **Step 1: Write failing cart tests**

Test local and supplier quantity increase/decrease, supplier stock ceiling, remove ownership, removal of the last line, converted-cart exclusion, and new-cart creation after payment. Include malformed quantity and stale supplier product cases.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/unit/cart.test.ts tests/payment-finalization.test.ts`

Expected: FAIL because supplier updates currently do not revalidate live stock and mutation feedback is inconsistent.

- [ ] **Step 3: Implement consistent mutation results**

Re-read the supplier product using `sellableSupplierWhere`, reject quantity above current stock, retain ownership checks, and redirect with stable `status`/`error` codes after update/remove. Keep cart conversion inside the verified-payment transaction. Ensure `getCurrentCart` excludes converted carts and `getOrCreateCart` creates the next active cart.

- [ ] **Step 4: Verify cart and checkout suites**

Run: `npx vitest run tests/unit/cart.test.ts tests/payment-finalization.test.ts tests/order-notification-timing.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit cart repair**

```bash
git add src/domain/cart/actions.ts src/domain/cart/service.ts src/app/(store)/cart/page.tsx src/domain/payments/finalize.ts tests/unit/cart.test.ts tests/payment-finalization.test.ts
git commit -m "fix: synchronize carts with verified payments"
```

### Task 7: Exercise the complete order journey

**Files:**
- Create: `tests/payment-order-e2e.test.ts`
- Modify: `tests/unit/order-lifecycle.test.ts`
- Modify: `tests/order-operations-readiness.test.ts`
- Modify: `scripts/audit-commerce-launch.ts`

**Interfaces:**
- Consumes: Task 2 finalizer, order operation resolver, distributor assignment, procurement, shipment, and communication state.
- Produces: repeatable application-level acceptance evidence for both providers.

- [ ] **Step 1: Write the end-to-end tests**

For `PAYFAST` and `OZOW`, create a paid test order from an active cart, finalize verified evidence, assert order visibility/email/cart/inventory, assign a distributor, place and confirm supplier orders, record shipment/tracking/out-for-delivery/delivery, complete the order, and assert the five customer milestones. Add multi-supplier and legacy-state cases.

- [ ] **Step 2: Run and diagnose the full journey**

Run: `npx vitest run tests/payment-order-e2e.test.ts tests/unit/order-lifecycle.test.ts tests/order-operations-readiness.test.ts`

Expected: FAIL at any remaining integration gap; fix only the owning production boundary and retain the regression.

- [ ] **Step 3: Extend the launch audit**

Make `scripts/audit-commerce-launch.ts` fail readiness when it finds paid/unfinalized orders, stale pending hosted payments, failed verified-payment recovery jobs, failed paid-order communication jobs, duplicate inventory movements, or an absent active pricing configuration. Report test data separately from real orders.

- [ ] **Step 4: Run complete automated verification**

Run:

```bash
npx tsc --noEmit
npm test
npm run lint
npx next build --webpack
npx tsx scripts/audit-commerce-launch.ts
```

Expected: type check and tests pass; lint has no errors; build succeeds. The launch audit may report production-data blockers, which must be reconciled rather than hidden.

- [ ] **Step 5: Commit end-to-end coverage**

```bash
git add tests/payment-order-e2e.test.ts tests/unit/order-lifecycle.test.ts tests/order-operations-readiness.test.ts scripts/audit-commerce-launch.ts
git commit -m "test: cover payment through completed delivery"
```

### Task 8: Provider acceptance, production controls, and release

**Files:**
- Modify: `docs/commerce/activation.md`
- Create: `docs/commerce/payment-acceptance-2026-09-21.md`
- Modify only if evidence requires it: production scheduler/deployment configuration already used by this repository.

**Interfaces:**
- Consumes: all automated evidence and the real gateway/email/scheduler environments.
- Produces: signed-off provider matrix and release evidence; no fabricated “live ready” claim.

- [ ] **Step 1: Document exact environment and dashboard checks**

Record enabled flags, sandbox/test-mode flags, public notify URLs, merchant/site identifiers with secrets redacted, reconciliation schedule, email worker schedule, and last successful worker evidence.

- [ ] **Step 2: Run safe provider acceptance**

In an isolated test deployment, execute success, cancellation, delayed/repeated notification, return-before-webhook, and tampered-notification scenarios for both gateways. Record application order/payment ids, provider transaction ids, diagnostics, cart state, inventory movement, outbox evidence, and Admin visibility.

- [ ] **Step 3: Run authorized live minimum-value acceptance**

Only with the user’s explicit authorization for each real charge, run one designated test-product transaction per enabled gateway. Do not refund automatically. Reconcile provider dashboard evidence to the application and operate each order through completion.

- [ ] **Step 4: Resolve blockers and rerun verification**

Reconcile every pending captured payment using provider evidence. Disable a gateway if its verification path, webhook reachability, or recovery schedule cannot be proven. Then rerun Task 7’s complete verification commands and record their exact results.

- [ ] **Step 5: Commit documentation and push main**

```bash
git add docs/commerce/activation.md docs/commerce/payment-acceptance-2026-09-21.md
git commit -m "docs: record payment gateway acceptance"
git push origin main
```

Release only if the acceptance document distinguishes passed automated checks, passed provider checks, and any outstanding external/manual evidence.
