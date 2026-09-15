# Order Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Orders the complete desktop and mobile workspace for distributor-fulfilled customer orders.

**Architecture:** Reuse OrderProcurement as the per-distributor fulfilment group and Shipment as distributor-provided tracking, with a nullable association for backward compatibility. Central lifecycle helpers control active transitions and aggregate multi-supplier truth; desktop and mobile pages invoke the same authorised Server Actions.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components/Actions, TypeScript, Prisma 7/PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-order-operations-design.md`

## Global Constraints

- Preserve existing data and historical enum values.
- Do not expose supplier economics or private notes to customers.
- Do not add warehouse, packing, driver, vehicle, or Innozanzi delivery concepts.
- Orders is the only active customer-order operations workspace on desktop and mobile.

---

### Task 1: Lifecycle contract

**Files:** Modify `tests/unit/order-lifecycle.test.ts`, `tests/order-customer-workflow.test.ts`, and `src/domain/orders/lifecycle.ts`.

**Interfaces:** Produce active transitions, legacy escape transitions, customer labels/email decisions, and `deriveOrderStatusFromSupplierGroups()`.

- [ ] Write tests proving Processing has supplier placement as a normal action, obsolete warehouse stages are absent from the active path, legacy orders can escape old states, and multiple shipments cannot prematurely mark an order delivered.
- [ ] Run the focused tests and confirm the old warehouse lifecycle fails them.
- [ ] Implement the lifecycle helpers and approved customer messages.
- [ ] Re-run the focused tests.

### Task 2: Supplier group persistence and actions

**Files:** Modify `prisma/schema.prisma`, create a safe additive migration, modify `src/domain/orders/procurement-actions.ts` and `src/domain/admin/actions.ts`.

**Interfaces:** Extend procurement with expected dispatch/delivery and delivery window; associate shipments to procurements; save supplier and shipment outcomes through order-scoped actions.

- [ ] Add schema assertions/tests before changing the schema.
- [ ] Add nullable fields and foreign keys without removing historical fields.
- [ ] Generate Prisma types.
- [ ] Implement transactionally validated supplier/shipment updates and aggregate order progression.
- [ ] Run focused tests.

### Task 3: Supplier order document

**Files:** Modify `tests/supplier-order-document.test.ts`, `src/domain/orders/supplier-order-document.ts`, and `src/app/api/admin/orders/[id]/supplier-order/route.ts`.

**Interfaces:** Consume only order snapshots and output distributor, recipient, phone, full delivery address, instructions, supplier SKU, quantity, and direct-to-customer instruction.

- [ ] Write failing PDF-content tests.
- [ ] Implement the expanded snapshot document.
- [ ] Run the document tests.

### Task 4: Desktop Order workspace and navigation

**Files:** Modify `tests/unit/admin-navigation-permissions.test.ts`, `src/components/admin/admin-nav.tsx`, `src/app/admin/orders/[id]/page.tsx`, and remove active links to `src/app/admin/orders/[id]/delivery/page.tsx`.

**Interfaces:** Present all order operations in one responsive page and separate normal from exception actions.

- [ ] Write failing navigation/workspace source-level regression tests.
- [ ] Remove Fulfilment/Delivery/Logistics menu entries while retaining Returns and Inventory.
- [ ] Integrate supplier, shipment, address, payments, documents, communications, timeline, and risks into the Order page.
- [ ] Run focused tests.

### Task 5: Mobile Order workspace

**Files:** Create `src/app/mobile-admin/orders/[id]/page.tsx`, modify `src/app/mobile-admin/orders/page.tsx`, and add mobile workflow tests.

**Interfaces:** Link mobile orders to a mobile-native detail route using the shared order actions.

- [ ] Write a failing route/source regression test.
- [ ] Build the compact mobile workflow with status/next action first.
- [ ] Run focused tests.

### Task 6: Customer tracking and production-readiness verification

**Files:** Modify `src/app/account/orders/[orderNumber]/page.tsx` as needed and add `tests/order-operations-readiness.test.ts`.

**Interfaces:** Render per-supplier shipments without exposing supplier economics and certify the full active route.

- [ ] Add regression coverage for stuck Processing, multi-supplier partial delivery, navigation, mobile parity, and customer-safe tracking.
- [ ] Run the full test suite, lint, Prisma validation, and production build.
- [ ] Review the diff against every spec section and record any remaining external-environment limitation.
