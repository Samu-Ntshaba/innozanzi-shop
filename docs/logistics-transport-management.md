# Logistics and transport management

Transportation is a shared operational and financial aggregate. A `TransportRecord`
describes movement; provider quotations, cost components, expenses, payments,
reimbursements, allocations and collection/delivery proofs remain separate connected
records.

## Controls

- Transport and payment statuses are independent.
- The requester cannot approve their own cost unless acting as Super Administrator.
- The cost approver cannot confirm the related payment.
- Actual cost, customer charge, recoveries and margin are retained separately.
- Quoted, approved and actual costs are never overwritten into one value.
- Uploaded quotes, invoices, receipts and proofs use private storage and authorised
  signed downloads.
- Every lifecycle and financial change appends a transport event; approvals and
  payments also write the global audit log.

## Relationships

Transport may link to an order, delivery note, supplier, return case, distributor
claim, technician, customer, partnership or purchase-order reference. One related
record may therefore have multiple transport activities.

## Configuration and permissions

Categories, providers and cost-component types are configurable. Logistics Manager,
Driver, Finance, Technician and existing operational roles receive deliberately
different permissions. Drivers and technicians do not receive profitability or
payment-confirmation access.

## Cost reporting

The record preserves estimated cost, selected quote, approved budget, actual cost,
VAT, customer charge, amount paid and recoveries. Cost components distinguish
estimates from actuals, while allocations support order/product landed-cost and
profitability reporting without adding one overloaded delivery-fee field to orders.
