# Simple quotation-to-delivery workflow

This is the canonical Innozanzi sales workflow for online and staff-assisted customers.

## The seven customer stages

1. **Request received** — The customer selects products online, or an employee captures a telephone, email, WhatsApp or walk-in request. Staff-assisted intake matches an existing customer by email or creates a customer automatically.
2. **Provisional quotation** — The system records immutable product, supplier, cost, stock and pricing snapshots and shows the provisional amount. This is not a request for payment.
3. **Final review** — Staff confirm quantities, customer prices, delivery, discount, terms and approved banking details. The final PDF is emailed to the customer and copied to support.
4. **Customer decision** — The customer accepts or rejects the exact final version and amount. The customer and support receive confirmation.
5. **Payment verification** — The customer pays online or uploads EFT proof. No active order exists until payment is verified. Supplier and local availability are rechecked at this boundary.
6. **Fulfilment** — The active order moves through processing, sourcing where required, packing and delivery. Every customer-visible status change sends email to the customer and copies support.
7. **Delivered** — Delivery is recorded with the delivery note and evidence. The order is completed after delivery confirmation.

## Minimum information

Customer intake requires only name, email, optional phone/company, requested items and optional operational notes. Delivery address, commercial terms, payment information and fulfilment evidence are collected only when their stage requires them.

Innozanzi is currently treated as not VAT registered. Customer quotation screens do not expose VAT controls. This rule must change only after formal tax registration and configuration.

## Admin workspace

The primary menu contains only daily work, fulfilment, catalogue, business and settings. Specialist pages remain available from their relevant record or overview; they are not equal top-level tasks.

## Email rule

Operational email is mandatory for request receipt, provisional quotation, final quotation, customer decision, payment submission/decision, order activation, fulfilment status and delivery scheduling. Failed delivery is stored in the email outbox for retry and must not roll back an already completed business transaction.
