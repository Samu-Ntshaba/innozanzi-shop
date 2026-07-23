# Commercial document lifecycle

## Test data

Test Mode runs only when `TEST_MODE=true` and the deployment uses a disposable database. The live deployment refuses generation and deletion. Generated users, products, quotation requests, quotations, orders, invoices, invoice lines, delivery notes and uploaded evidence carry `isTestData=true`.

The generator uses deterministic records so regression checks remain repeatable. Product artwork is uploaded once to the public Supabase `test-assets` bucket and reused. If storage is temporarily unavailable, generation continues with deterministic placeholder URLs; this does not disable the rest of Test Mode.

Cleanup deletes the isolated business dataset while preserving staff accounts, roles, permissions, departments and system configuration. Live reporting and integrations cannot see these records because the test deployment has a separate database.

## Invoice architecture

Both automated and manual invoices use `Invoice` and `InvoiceItem`. `origin` distinguishes the source. Automated creation copies approved quotation or order values into invoice-line snapshots; later catalogue price changes cannot change an issued invoice. Manual creation is reserved for work that does not already exist in the platform.

The invoice register supports draft, issue, sent, overdue, part-paid, paid, void, cancelled and credited states. `InvoicePayment` retains every recorded payment while `amountPaid` and `balanceDue` provide fast reconciliation. Payments that exceed the balance are rejected server-side. SKU is not included in the invoice UI or PDF.

## Delivery-note architecture

Both automated and manual delivery notes use `DeliveryNote` and `DeliveryNoteItem`. An automated note copies the customer, address and item quantities from an eligible order. A manual note captures only information that cannot be reused.

Statuses are draft, ready for delivery, partially delivered, delivered, acknowledged and cancelled. Each change creates `DeliveryNoteHistory` and an application audit record. Responsible staff, dates, delivery method, internal/customer notes and recipient confirmation are retained.

Proof of delivery, signatures, photos and supporting PDFs are stored in the private Supabase document bucket. Access is through a short-lived signed URL and is limited to the customer or authorised operations staff.

## Safety decisions

- Manual and automated flows share the same records, PDFs and history.
- Server actions perform all calculations and lifecycle validation.
- Source records are linked but financial/item snapshots remain permanent.
- Delivery evidence is private by default.
- Test data is both explicitly flagged and physically isolated from live data.
