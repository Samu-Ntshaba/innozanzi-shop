# Returns, complaints and refunds

## Operating model

A customer complaint, technical inspection, business resolution, refund payment,
distributor recovery claim and returned inventory unit are separate records. Moving
one stage does not silently complete another stage.

The normal lifecycle is:

1. A customer or authorised employee records a complaint against a paid order item.
2. The system snapshots the product, ordered quantity, price, warranty and policy
   version that applied when the case was opened.
3. A technician is assigned where an assessment is required. Only the assigned
   technician (or a super administrator) may submit that inspection.
4. An authorised manager records the resolution and customer-facing reason.
5. A refund decision creates an awaiting-payment refund record. It does not mean
   that money has been paid.
6. A different authorised finance user records and confirms the refund payment.
7. Distributor recovery and returned-unit handling continue independently until
   their own work is complete.

## Financial controls

- Refunds cannot exceed the affected quantity's snapshotted order-item value.
- The user approving a refund cannot confirm its payment.
- A payment confirmation must equal the approved refund value.
- Proof, bank references and transaction references are retained against the
  payment record.
- Internal cost, recovery and inspection data are never exposed in the customer
  portal.

## Evidence and documents

Customer and inspection uploads use private storage and short-lived signed URLs.
Customers can access only evidence marked customer-visible. Technician evidence,
finance proof and distributor documents require the matching administrative
permission.

## Returned-product resale

Returned products are never silently returned to normal inventory. A returned unit
must be classified, approved for resale, prepared as a draft listing, independently
reviewed and then published. A listing requires photographs of the actual unit and
discloses its condition, functional status, included and missing accessories, and
warranty.

## Policy versioning

Published policy versions are immutable historical snapshots. Publishing a new
version makes it current without changing the version attached to an existing
complaint.

## Test data

Return lifecycle records inherit the source order's test-data status. Test-mode
cleanup removes dependent refund, claim, inventory, inspection, evidence and case
records before deleting their uploaded-document records.
