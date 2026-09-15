# Order Operations Architecture

## Decision

Innozanzi manages the commercial order; approved distributors fulfil and deliver directly to the customer. The Order is the only customer-order operations workspace on desktop and mobile. Standalone transport data remains readable for compatibility, but Innozanzi warehouse, driver, packing, and delivery operations are not part of the active order journey.

## Lifecycle

The active order path is `PAYMENT_VERIFIED -> PROCESSING -> SOURCING_ITEMS -> DISPATCHED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED`. `SOURCING_ITEMS` means supplier order activity. Historical `ITEMS_RECEIVED`, `PACKING`, and `READY_FOR_DELIVERY` values remain in the database enum and are mapped forward to a safe next action, but no new order is intentionally advanced into them. Cancellation remains visually and logically separate from normal progression.

Customer labels remain `Order confirmed -> Processing -> Shipped -> Out for delivery -> Delivered`. Only meaningful customer milestones create status emails, using idempotent outbox keys.

## Supplier fulfilment groups

An `OrderProcurement` is the supplier fulfilment group for one distributor in an Order. It owns placement, confirmation, supplier reference/invoice, expected dispatch/delivery, and private supplier notes. A `Shipment` may be linked to that procurement and records courier/tracking/delivery facts supplied by the distributor. Nullable links preserve existing shipments and historical orders.

Order-level delivery milestones may advance only when they honestly represent all active supplier groups: an order is not delivered while any group remains outstanding. Staff can record supplier confirmation and shipment details in one operation without clicking artificial intermediate stages.

## Workspace

The desktop Order page provides a status/next-action summary followed by Customer, Products, Payment, Supplier fulfilment, Delivery & tracking, Communications, Timeline, Documents, and Risk/exception sections. Supplier-order PDFs use immutable OrderItem and OrderAddress snapshots and explicitly instruct direct delivery to the named recipient.

Mobile Admin gets a dedicated order detail route with the same server actions and permissions, prioritising status, next action, supplier groups, tracking, exceptions, then expandable detail. No second mobile application is introduced.

## Compatibility and navigation

The Fulfilment navigation group and customer-order Delivery/Logistics links are removed. Returns and Inventory remain available under business-appropriate navigation because they are independent after-sales/catalogue concerns. Old logistics routes and models are retained for historical compatibility and unrelated records, but are not required by the customer-order workflow.

## Safety and verification

All mutations re-authorise on the server, validate supplier membership in the immutable order snapshot, lock the order during lifecycle changes, create timeline/audit records, and revalidate desktop, mobile, and customer routes. Tests cover the active lifecycle, legacy-state escape paths, simple customer labels, navigation removal, supplier document privacy/content, and multi-supplier aggregate delivery rules.
