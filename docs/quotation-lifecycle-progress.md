# Quotation-to-delivery lifecycle

## Implemented lifecycle

The application is quotation-led, not checkout-led:

`Product selection → quotation request → provisional quotation → human review → final quotation → proof upload → payment verification → order activation → fulfilment tracking → completion`

Implemented controls:

- Authenticated multi-product quotation requests preserve requested quantities and delivery/customer notes.
- Availability is displayed and validated, but stock is not reserved for requests or provisional/final quotations.
- Provisional pricing is deterministic: private verified cost plus a default 5% administrator-configurable markup and applicable VAT.
- OpenAI is restricted to request summaries, clarity warnings and professional wording; it never supplies financial values.
- Provisional and final PDFs are versioned and clearly labelled. Bank details appear only on final PDFs.
- Final approval supports markup, line price/quantity overrides, discounts, delivery fees, terms and payment reference.
- Proof files are stored in the private Supabase bucket and served only by short-lived, ownership/permission-checked links.
- Proof upload creates `PaymentSubmission(PENDING_VERIFICATION)`; it never creates an order.
- Finance verification runs in a serializable transaction, verifies stock, reserves inventory, creates immutable order/payment snapshots, and prevents duplicate verification/order creation.
- Fulfilment updates append customer-visible tracking events while keeping internal notes private.
- The expiry endpoint marks unpaid final quotations expired after seven days.
- Authorised staff can create a complete manual quotation in Admin → Quotations. `Quotation.origin` permanently distinguishes customer, manual and partner sources for filtering and reporting.
- Manual and automated quotations use the same numbered, versioned review/finalisation lifecycle and branded PDF company identity.
- Accepted or payment-verified quotations can generate numbered invoice PDFs from Admin → Invoices.
- Every activated order has a downloadable delivery note; delivery provider, contact, planned date, tracking reference and customer instructions can be maintained by operations.
- Planned delivery dates appear on the operations calendar and customer tracking exposes only customer-safe shipment data.

## Company document identity

Commercial PDFs use `support@innozanzi.co.za` and:

`Ground Floor, Waterstone Building, Stonemill Office Park, 300 Acacia Rd, Darrenwood, Randburg, Johannesburg, 2195`

The document contact number is `071 238 4185`. Manual quotations automatically
use seven-day validity and the selected Procurement Officer as the responsible
staff contact. Fixed company identity fields are not re-entered on each quote.
Innozanzi is currently treated as not VAT registered, so manual quote VAT is
off by default and must not be presented as company VAT unless registration is
formally configured.

Final quotation bank details continue to come only from verified administrator input.

## Inventory decision

Stock is reserved only when payment is verified. This avoids blocking inventory for non-binding requests while ensuring a paid order cannot be activated beyond currently available stock. The finance reviewer receives an explicit stock exception instead of approving an oversold order. Cancellation release handling remains required before cancellation is enabled operationally.

## Operations still requiring environment setup

- Schedule authenticated `POST /api/cron/expire-quotations` daily with `CRON_SECRET`.
- Create/allow the private Supabase bucket configured by `SUPABASE_PRIVATE_BUCKET` (the application can create it on first proof upload).
- Verify the live Mailtrap sender domain; Sandbox captures do not reach customers.
- Configure and review approved company bank details during each final quotation.

## Verification status

- Prisma schema validates and Client generates.
- Unit coverage includes deterministic markup, VAT, totals, discounts and seven-day validity.
- Lint, typecheck, tests and the production build form the final release gate.
