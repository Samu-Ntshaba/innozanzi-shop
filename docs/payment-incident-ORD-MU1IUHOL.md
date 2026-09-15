# ORD-MU1IUHOL payment incident

Status: unresolved; not a go-live acceptance pass. No payment was manually marked paid.

## Evidence collected

All timestamps below are UTC. Order created 2026-09-14 17:33:22.054 with an administrator live-test payment of ZAR 5.00 through PayFast. Payment attempt and merchant reference: `82db45b6-4f27-4dd5-9b49-1018a0203d75`. Order ID: `2cb87608-9856-4319-a9e9-6390b8413a37`.

The database held payment PENDING and order AWAITING_PAYMENT/PENDING, with no paid timestamp or committed GatewayEvent. Hosted-form construction sends the payment amount as `5.00`; the historical submitted HTTP body was not retained, so its exact transmission cannot be independently proven.

Railway logs contain PayFast signature-rejection entries at 17:35:19.668 (two entries), 17:36:49.732, 17:37:50.053, 17:39:00.087 and 17:49:01.774. Old logs did not include payment references, so timing associates these with the incident but does not prove every entry belongs to this order. The old route returns HTTP 400 for these failures; historical per-request HTTP logs were unavailable. Verification failed before merchant/amount/order processing could complete. No evidence demonstrates a subsequent transaction rollback or notification job failure for this order.

Historical browser returns were not recorded. A browser success URL or the customer's debit report is not authoritative payment evidence. The old page only refreshed database state every three seconds while visible, then stopped after 90 seconds. That timer alone produced “Automatic checks have paused”; it did not query a payment provider.

Production PayFast credentials and live/sandbox flags were compared with the diagnostic environment without exposing values. They match; PayFast is live and both PayFast and Ozow are enabled. Authenticated PayFast daily-history queries for the creation date and the current date returned no matching payment. This does not prove failure, reversal, or absence of a debit.

## Fix and recovery limits

PayFast ITN signing incorrectly reused checkout signing, omitting empty fields. The official [PayFast notification SDK](https://github.com/Payfast/payfast-php-sdk/blob/master/lib/PaymentIntegrations/Notification.php) includes them. A failing regression test reproduced that rejection and passes with the correction. Historical signed payloads were not retained, so this is a demonstrated systemic defect, not proof that it was the only incident cause.

Verified events now enter a durable recovery queue before financial processing. Payment and order changes remain transactional; retries are idempotent. The existing ten-minute email worker calls a protected web-service endpoint to retry the queue and inspect unresolved attempts independently of browser activity. Ozow uses its documented authenticated [reference lookup](https://ozow.com/integrations); an exact merchant/reference/currency/amount and successful status are required. PayFast history is diagnostic only: a ledger row does not replace a signed, server-validated COMPLETE ITN. A matching PayFast transaction is flagged for ITN resend and finance review.

Desktop and mobile admin surface unresolved payments and state mismatches. Browser observations, callback receipt/verification failures and reconciliation attempts have safe audit records. No secrets or raw signed notification bodies are logged. New payment attempts are blocked while a hosted payment remains pending. A verified capture on an already-paid or closed order remains a finance exception, without restarting fulfilment.

## Outstanding acceptance evidence

An operator must obtain this order's PayFast transaction ID and request an ITN resend, or establish the provider's final outcome. The application must then independently validate the exact reference and amount before fulfilment. No new charge, refund, supplier purchase, or fabricated confirmation was performed during diagnosis.

Automated tests cover signature validation, duplicates, retry persistence, amount rejection, state repair, later success after failure and provider lookup. Production successful/cancelled/failed journeys for both enabled gateways, customer email receipt, invoice, authenticated admin/mobile display and browser-closed fulfilment still require observed acceptance evidence. Test and build results alone do not establish production readiness. Email retry deduplication does not eliminate the external-send/database-commit crash window; the existing email provider must support idempotent sends to guarantee exactly-once delivery across that failure.
