# Sales Partner Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Admin a clear, reliable way to register a sales partner and let a newly invited partner securely choose a password and enter their workspace.

**Architecture:** Preserve the existing partnership records and partner workspace. Move registration and activation mutations to stable POST route handlers backed by focused domain services; activation uses the existing hashed, expiring `UserInvitation` token and never sends or requires a temporary password.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, Vitest, durable email outbox.

**Spec:** `docs/superpowers/specs/2026-09-22-partner-sales-channel-design.md`

## Global Constraints

- Innozanzi approves and owns partner access; public users can only apply.
- Invitation email contains a single-use expiring activation link and no password.
- Existing customers retain their existing credentials.
- Partner and customer records remain historically compatible.
- Mutating forms use stable POST endpoints and redirect-after-submit.
- Partner access remains scoped to the authenticated user's own partnership.

## Review Focus

- Expired, consumed, malformed, or mismatched activation tokens must reveal no account data and must not activate an account.
- Concurrent duplicate registration attempts must not produce two users or two active partnerships.
- Email queuing failure must not corrupt the committed partnership and must remain observable/retryable.
- Existing-customer registration must never reset or replace that customer's password.
- A newly activated partner must land in their own partner workspace without receiving Admin permissions.

---

### Task 1: Secure invitation primitives

**Files:**
- Modify: `src/integrations/email/templates.ts`
- Create: `src/domain/auth/partner-activation.ts`
- Test: `src/domain/auth/partner-activation.test.ts`

**Interfaces:**
- Produces: `partnerInvitationEmail(...)`, `inspectPartnerActivation(token, email)`, and `activatePartnerInvitation(input)`.
- Consumes: existing `UserInvitation`, password hashing, session creation, and email templates.

- [ ] Write failing tests proving invitation copy contains no password and token inspection rejects expired, consumed, and email-mismatched invitations.
- [ ] Run the focused tests and confirm the missing secure flow causes failure.
- [ ] Implement token hashing/inspection and password activation with atomic token consumption.
- [ ] Run the focused tests and confirm they pass.
- [ ] Commit the secure invitation primitives.

### Task 2: Stable Admin registration

**Files:**
- Create: `src/domain/partnerships/register-partner.ts`
- Create: `src/app/api/admin/partnerships/partners/register/route.ts`
- Modify: `src/app/admin/partnerships/partners/new/manual-partner-form.tsx`
- Test: `src/domain/partnerships/register-partner.test.ts`

**Interfaces:**
- Consumes: secure invitation email from Task 1.
- Produces: `registerSalesPartner(...)` and a stable POST endpoint returning a 303 to the created partner record.

- [ ] Write failing tests for new-account registration, existing-customer linking, duplicate prevention, and no credential mutation for existing customers.
- [ ] Run the focused tests and confirm failure for the missing service.
- [ ] Implement the transactional domain service and POST handler; queue notifications after the database transaction.
- [ ] Point the form at the stable endpoint and show returned validation failures safely.
- [ ] Run focused tests and confirm they pass.
- [ ] Commit stable Admin registration.

### Task 3: Token activation page and destination

**Files:**
- Modify: `src/app/(auth)/activate-account/page.tsx`
- Create: `src/app/api/auth/activate-partner/route.ts`
- Test: `tests/unit/partner-activation-route.test.ts`

**Interfaces:**
- Consumes: `inspectPartnerActivation` and `activatePartnerInvitation` from Task 1.
- Produces: public token-driven password setup and authenticated redirect to `/account/partner`.

- [ ] Write failing route/page tests for valid setup, mismatch, expiry, one-time use, password validation, session creation, and partner redirect.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement the token-aware page and POST route without requiring a pre-existing session.
- [ ] Run focused tests and confirm they pass.
- [ ] Commit token activation.

### Task 4: Admin discoverability and regression coverage

**Files:**
- Modify: `src/components/admin/admin-nav.tsx`
- Modify: `src/app/admin/partnerships/page.tsx`
- Modify: `src/app/admin/partnerships/partners/new/page.tsx`
- Test: `tests/unit/admin-navigation-permissions.test.ts`
- Test: `tests/unit/partner-registration-ui.test.ts`

**Interfaces:**
- Consumes: the stable registration page and existing application/partner queues.
- Produces: visible **Sales partners**, **Register sales partner**, **Review applications**, and **Manage partners** entry points.

- [ ] Write failing tests for the new Admin labels, routes, calls to action, and permission mapping.
- [ ] Run the focused tests and confirm the old labels fail expectations.
- [ ] Update navigation and page copy while retaining existing routes and permissions.
- [ ] Run focused tests and confirm they pass.
- [ ] Commit discoverability improvements.

### Task 5: End-to-end verification and cleanup

**Files:**
- Modify: `src/domain/partnerships/admin-actions.ts`
- Modify: relevant tests if obsolete Server Action imports remain.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: no duplicate legacy manual-registration path and a production-buildable implementation.

- [ ] Add a regression assertion that the partner registration form does not reference a Server Action or temporary password.
- [ ] Remove the obsolete `createManualPartner` path while retaining unrelated partnership actions.
- [ ] Run the focused tests, complete test suite, lint, TypeScript check, and production build.
- [ ] Review the complete diff for permission, token, email, and partner-scoping regressions.
- [ ] Commit the verified feature.
