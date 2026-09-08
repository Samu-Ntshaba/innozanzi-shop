# Commerce activation and operating notes

## Scope and defaults

The founder confirmed on 8 September 2026 that Innozanzi is **not VAT registered**. Default customer output VAT is therefore zero; supplier VAT and VAT on fees are included in cost. Defaults are editable at `/admin/pricing`, with a simulator and atomic before/after audit records. The blueprint supplies planning assumptions, not verified merchant contracts or courier quotes.

The engine protects 18% / 12% / 8% contribution bands, with R120 / R350 / R750 minimum contribution, a 1.5% reserve and configurable delivery, surcharges, handling, fixed fees and payout allocation. Each unit conservatively carries the configured delivery/handling allocation and fixed fee; this protects split orders but can price multi-unit baskets above an optimised supplier route. The higher Ozow/PayFast floor sets one public price without a payment-method surcharge. No automated cheapest-route planner or below-floor exception approval is enabled. These can be added after Pinnacle supplies actual branch, stock and delivery data.

Published price changes take effect in new calculations. Checkout compares a server-calculated fingerprint with the reviewed quote before order creation. It saves commercial inputs, supplier identity, original offer details, protected floor and discount into order-line snapshots. Orders do not reprice after creation. Fees/reserve are contribution estimates, not realised net profit; the R1,000 platform assumption is kept separate.

Local manually priced products retain their displayed prices, and are blocked at checkout when below the new floor. Review them before launch. Supplier promotional costs are used only within their active date range. Random daily markdowns were removed.

## Gateways

New customer checkout offers only Ozow and PayFast. Historical Paystack/EFT database values and refund/review tools remain for existing transactions; deleting those records would compromise reconciliation. New manual proof submissions and legacy hosted payment initiation are retired.

Set local `.env` and the Railway application variables:

- Ozow: `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY`, `OZOW_API_KEY`, `OZOW_ENABLED=true`, `OZOW_TEST_MODE`.
- PayFast: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_ENABLED=true`, `PAYFAST_SANDBOX`.
- `NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS shop origin.

Keep private keys and passphrases server-only. Configure the same PayFast passphrase in the merchant dashboard. Hosted PayFast checkout is restricted to cards (`payment_method=cc`), matching the pricing assumption; do not enable expensive instalment methods without pricing them. Ozow uses its hosted bank payment integration. Confirm the enabled bank methods and contracted fees with Ozow.

Notification endpoints:

- `https://shop.innozanzi.co.za/api/webhooks/ozow`
- `https://shop.innozanzi.co.za/api/webhooks/payfast`

Browser returns only navigate back to orders; they never mark payment successful. Notifications require a valid provider signature, merchant reference, matching amount/currency and server verification (PayFast VALID endpoint; Ozow transaction lookup). Notifications are bounded and duplicate fields rejected. Provider event IDs are unique, payment rows are locked and processed idempotently. A verified payment with an inventory issue is recorded as paid and flagged for procurement review, rather than losing the financial event. `Payment.fundsAvailableAt` is separate and is never set by a success notification.

Missing credentials keep payment methods unavailable. Sandbox/test transactions cannot run on a production build unless it is explicitly an isolated `TEST_MODE_ENVIRONMENT=true` deployment. Before live activation, complete merchant onboarding and sandbox success, cancellation, repeated callback, tampered amount, delayed callback and reconciliation tests. Then set `OZOW_TEST_MODE=false` / `PAYFAST_SANDBOX=false` on the live deployment. No live charge or refund was performed during implementation. Gateway-specific automated refunds and settlement reconciliation require their own tested integrations; use the merchant dashboards and finance controls meanwhile. Never treat payment confirmation as settlement or auto-send a supplier purchase order.

## Supplier schedule and Pinnacle

The configured database was queried read-only on 8 September 2026. It reported Syntech's latest successful import at **2026-08-03 16:51:07 UTC**, with its latest full import at **16:31:12 UTC** that day. This does not demonstrate functioning daily imports. The repository's `railway.supplier-cron.json` specifies `0 2 * * *` (04:00 SAST). Railway must have a separate cron service using that configuration; an ordinary web deployment does not create it.

1. Deploy the additive commerce migration through the normal `npm start` migration step.
2. Create/verify the Railway supplier cron service, using `railway.supplier-cron.json`, the same database and private feed variables, and `npm run automation:suppliers -- --full`.
3. Run one full import and confirm fresh SUCCEEDED records in `/admin/feed-health`.
4. Verify a second scheduled run on the following day. Configure external monitoring for failures and missed runs.

Syntech currently uses its supported **JSON** feed, not XML. It continues using the existing private `SYNTECH_FULL_FEED_URL` and supplier ID. Import failures do not replace the catalogue with zero stock. Duplicate SKUs and severely incomplete full feeds are rejected. Feed enablement is preserved instead of being reset by every import. Supplier SKU uniqueness is scoped to each feed; identities use GTIN or exact brand + manufacturer part number and condition, never title alone. All offers remain stored and a preferred public offer prevents duplicate cards. Ambiguous identities remain separate and need human review.

Pinnacle is scaffolded as approved, COD, account INN038, with separate purchasing/feed flags and a shared scheduler entry. Set `PINNACLE_XML_FEED_URL`, `PINNACLE_FEED_USERNAME`, `PINNACLE_FEED_PASSWORD` only after receiving credentials. Its adapter deliberately refuses to import before the real XML schema is mapped and tested; a made-up parser could corrupt prices or stock. Pinnacle is not operationally activated by supplying a URL alone. Obtain a sample with SKU/MPN/GTIN, VAT basis, currency, branch stock, promotions and timestamps, then validate mapping and a test order before enabling it.

Freshness defaults to 30 hours. Stale/paused suppliers are blocked from new purchases and public sellable catalogue results. **Do not deploy without restoring the supplier job unless you intend stale supplier products to be hidden.** A fresh import is an operational launch requirement, not something this change assumes has happened.

## Promotions and coupons

At `/admin/promotions`, create named codes, percentage/fixed discounts, minimum spend, caps, overall/per-customer usage limits and validity dates. Check “Automatic promotion” for offers applied without entering a code. Offers do not stack; the best eligible automatic offer applies unless the customer enters an eligible named code. Current offers are basket-wide; SKU/category/customer targeting requires a future scoped-rule UI rather than accepting an unconfigured scope.

Check “Show storefront banner” to advertise an offer. No active advertised offer means no banner. The banner is a narrow strip using the existing colours. Eligibility and the protected floor are rechecked at checkout, including inside the locked coupon/order transaction. Discounts are allocated only into available margin above individual line floors. Usage is reserved when an order is placed; abandoned orders therefore consume uses until operations resolves them. Do not reset redemptions casually, because an outstanding hosted payment could still complete.

## Deployment and rollback

No secrets belong in git. The migration only adds enum values/columns and an idempotency table; legacy payment records remain unchanged. Test in an isolated database first, back up the live database, deploy, refresh the supplier feed, inspect representative prices and complete both gateway sandbox flows before enabling live payments. No new dependency or package-lock change is required.

To roll back application code, retain the additive schema and payment events. Disable Ozow/PayFast initiation first and reconcile all pending transactions; do not drop gateway enums, remove paid events, or enable old payment methods as an automatic fallback. Previously placed orders retain commercial snapshots. Restore a pricing configuration through the admin form with an audited reason instead of editing completed orders.

Official integration references:
- https://developers.payfast.co.za/
- https://ozow.com/integrations
- https://payfast.io/fees/
- https://ozow.com/pricing
