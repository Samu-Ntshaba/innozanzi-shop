# Partner sales channel operations runbook

This channel is an additive, controlled extension of Partnerships, Quotations, Payments, Orders, Communications, and Finance. Innozanzi remains the merchant of record. The global setting `partner_sales.channel.v1` is disabled by default and must remain disabled until the acceptance matrix is complete and a pilot partner is explicitly approved.

## Activation

1. Confirm the additive migration is applied in the intended non-production environment first, then in the release environment. Run `npx prisma migrate status` and `npx prisma migrate deploy`; never point rehearsal commands at production.
2. Run the explicit, idempotent operational backfill only after reviewing its dry-run counts: `npx tsx scripts/backfill-partner-sales-release.ts`. This clears legacy supplier media snapshots and stale broad-role partner grants; it is intentionally separate from the forward-only additive migration.
3. Run `npx tsx scripts/audit-commerce-launch.ts`. Resolve every partner blocker: orphan cases, quotation/payment/order mismatches, duplicate commissions, ineligible payable commissions, duplicate payout membership, and failed partner communications.
4. Confirm PayFast and Ozow configuration, notification workers, Orders ownership, trusted ingress headers, and the required Admin permissions. Do not print secrets or private client/financial fields in evidence.
5. Create one pilot profile for an approved partnership. Verify legal/display details, logo, contact details, catalogue assignments, commission default, merchant disclosure, and agreement expiry. Admin approval moves the profile to `ACTIVE`; a partner cannot self-activate it.
6. Complete the acceptance journeys for both gateways with an explicitly authorised isolated/sandbox transaction. Record provider reference, application payment, order, invoice, communication, and reconciliation evidence in the readiness matrix. Browser success pages are not payment evidence.
7. Obtain written approval from the selected pilot owner, then enable the setting. Roll out to one partner, monitor, and expand only after the pilot remains healthy.

## Suspension and rollback

To stop new partner activity, set `partner_sales.channel.v1` to `{ "enabled": false }` and/or move the profile to `SUSPENDED`. Existing orders, payments, commissions, and payout history remain available to authorised Admin and partner views according to their scopes; do not delete historical records. Public catalogues, showcases, enquiry submission, quotation acceptance, and new hosted-payment intents must stop while the setting is off.

If a migration or deployment must be rolled back, stop activation first, preserve the database records, restore the prior application version only when its Prisma schema is compatible, and follow the normal backup/restore change process. Do not manually drop the partner tables or columns. The safe rollback is forward-only: force `partner_sales.channel.v1` to `{ "enabled": false }`, disable affected profiles, and retain all cases, snapshots, orders, commissions, payouts, statements, and audits. Escalate any incompatible schema issue to the release owner and database owner.

## Quote exception handling

- **Expired quote:** do not extend it in place. Ask Admin to reprice and approve a new immutable version.
- **Cost or stock drift:** treat `REPRICE_REQUIRED` as a hard stop. Recheck supplier/product availability and protected floor, then issue a fresh approved version.
- **Amount/version mismatch:** stop payment and reconcile the accepted quotation version, payment intent, and case before retrying.
- **Client revision:** use the case revision action; never edit an accepted immutable snapshot.
- **Injection or unsafe branding:** reject the profile/catalogue copy, remove executable content, and record the Admin decision.

## Payment reconciliation

Only verified PayFast/Ozow evidence may mark a payment paid. Replayed callbacks and provider lookups must converge on the same payment and one partner order. Check the case, accepted quotation version, payment amount/currency, order, invoice, inventory reservation, audit event, and outbox entries. If a payment is paid but the order is not finalised, leave fulfilment blocked and use the existing payment recovery process; do not create a second order manually.

For an unresolved gateway discrepancy, record the provider reference and application IDs in the restricted incident record, run the read-only launch audit, and escalate to Finance and the payment owner. Never put provider payloads, credentials, or customer contact data into public tickets or logs.

## Commission holds and reversals

Commission is estimated at approval, locked on verified payment, and payable only after delivery/completion plus final economics reconciliation. Use a hold with a mandatory reason for a dispute, chargeback, return, cancellation, refund, or reconciliation exception. A pre-payout partial/full refund reverses only the permitted unpaid balance; a post-payout correction is a compensating ledger entry and must not rewrite the paid history. Re-run eligibility after the underlying order/finance record is resolved.

## Payout approval and payment

1. Finance prepares a batch from payable commissions belonging to one partnership and currency.
2. A different authorised Finance user approves it; the preparer cannot approve their own batch.
3. Upload and verify EFT proof before marking the batch paid. Record the payment reference and date, then generate/store the partner statement.
4. Confirm every commission has one active payout membership and a `PAYMENT` ledger entry. Retrying a paid operation is idempotent. A paid batch cannot be cancelled; use a compensating commission correction for a later refund or adjustment.

## Monitoring

Run the read-only audit after deployment, after each gateway reconciliation cycle, and at least daily during the pilot. Watch:

- feature flag state and active profiles;
- orphan cases and quotation/payment/order mismatches;
- duplicate commissions and payout membership;
- payable commissions that lack completion or reconciliation evidence;
- pending/failed partner email outbox rows and retry attempts;
- provider pending payments, paid-unfinalised orders, inventory reservation duplicates, and failed recovery jobs.

Use the desktop and Mobile Admin Orders workspaces for operational fulfilment. Partner views are redacted: they may show customer milestones, shipment tracking, approved selling values, and commission status, but never supplier costs, margins, floors, gateway evidence, internal notes, or other partnerships.

## Evidence and incident notes

Record command, timestamp, environment name, aggregate audit output, provider/application references, actor, decision, and follow-up owner. Redact secrets, tokens, private links, emails, phone numbers, addresses, raw provider payloads, and internal economics. If a live or sandbox acceptance journey was not observed, record it as `PARTIAL` or `BLOCKED`; automated tests do not substitute for provider evidence.
