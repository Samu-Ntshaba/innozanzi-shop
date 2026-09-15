export const FULFILMENT_TRANSITIONS: Record<string, readonly string[]> = {
  PAYMENT_VERIFIED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SOURCING_ITEMS", "CANCELLED"],
  SOURCING_ITEMS: ["DISPATCHED", "CANCELLED"],
  ITEMS_RECEIVED: ["DISPATCHED", "CANCELLED"],
  PACKING: ["DISPATCHED", "CANCELLED"],
  READY_FOR_DELIVERY: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const activeOrderJourney = ["PAYMENT_VERIFIED", "PROCESSING", "SOURCING_ITEMS", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"] as const;

export function deriveOrderStatusFromSupplierGroups(statuses: readonly string[]) {
  if (!statuses.length || statuses.some(status => ["PENDING", "READY"].includes(status))) return "PROCESSING";
  if (statuses.every(status => status === "DELIVERED")) return "DELIVERED";
  if (statuses.some(status => status === "SHIPPED")) return "DISPATCHED";
  if (statuses.every(status => ["IN_TRANSIT", "DELIVERED"].includes(status))) return "IN_TRANSIT";
  if (statuses.every(status => ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status))) return "OUT_FOR_DELIVERY";
  return "PROCESSING";
}

const STAGE_COPY: Record<string, { phase: string; reason: string; next: string; owner: string; customer: string }> = {
  PAYMENT_VERIFIED: { phase: "Payment confirmed", reason: "Funds have been verified and the order is ready for review.", next: "Accept the order for processing", owner: "Order operations", customer: "Payment confirmed" },
  PROCESSING: { phase: "Order processing", reason: "The order snapshot, commercial checks and distributor selection are being confirmed.", next: "Place the order with the distributor", owner: "Order operations", customer: "Order processing" },
  SOURCING_ITEMS: { phase: "Supplier procurement", reason: "One or more products must be obtained from a supplier.", next: "Confirm every item has been received", owner: "Procurement", customer: "Products being prepared" },
  ITEMS_RECEIVED: { phase: "Historical fulfilment state", reason: "This order predates distributor-direct fulfilment.", next: "Record distributor dispatch", owner: "Order operations", customer: "Processing" },
  PACKING: { phase: "Historical fulfilment state", reason: "This order predates distributor-direct fulfilment.", next: "Record distributor dispatch", owner: "Order operations", customer: "Processing" },
  READY_FOR_DELIVERY: { phase: "Historical fulfilment state", reason: "This order predates distributor-direct fulfilment.", next: "Record distributor dispatch", owner: "Order operations", customer: "Processing" },
  DISPATCHED: { phase: "Dispatched", reason: "The distributor has handed the shipment to its courier.", next: "Record the next distributor or courier update", owner: "Order operations", customer: "On the way" },
  IN_TRANSIT: { phase: "In transit", reason: "The parcel is travelling to the customer.", next: "Confirm delivery", owner: "Logistics", customer: "On the way" },
  OUT_FOR_DELIVERY: { phase: "Out for delivery", reason: "The delivery provider has the parcel on its final delivery route.", next: "Confirm delivery", owner: "Logistics", customer: "Out for delivery" },
  DELIVERED: { phase: "Delivered", reason: "Delivery has been recorded and remains visible for after-sales support.", next: "Complete the order after confirmation", owner: "Customer service", customer: "Delivered" },
  COMPLETED: { phase: "Completed", reason: "The commercial order and distributor delivery lifecycle is complete.", next: "Monitor after-sales requests", owner: "Customer service", customer: "Completed" },
  CANCELLED: { phase: "Cancelled", reason: "The order was cancelled and cannot continue.", next: "Review the audit trail and refund record", owner: "Finance", customer: "Cancelled" },
};

export function orderStageContext(status: string) {
  return STAGE_COPY[status] ?? { phase: status.replaceAll("_", " "), reason: "This order is awaiting its next system event.", next: "Review the order", owner: "Operations", customer: "Order received" };
}

const CUSTOMER_STATUS_LABELS: Record<string,string> = { DRAFT:"Order started",PENDING:"Order placed",AWAITING_PAYMENT:"Awaiting payment",PAYMENT_UNDER_REVIEW:"Payment under review",PAID:"Order confirmed",PAYMENT_VERIFIED:"Order confirmed",PROCESSING:"Processing",SOURCING_ITEMS:"Processing",ITEMS_RECEIVED:"Processing",PACKING:"Processing",READY_FOR_DELIVERY:"Processing",DISPATCHED:"Shipped",IN_TRANSIT:"Shipped",OUT_FOR_DELIVERY:"Out for delivery",SHIPPED:"Shipped",DELIVERED:"Delivered",COMPLETED:"Delivered",CANCELLED:"Cancelled",REFUNDED:"Refunded",PARTIALLY_REFUNDED:"Partially refunded" };
export function customerOrderStatusLabel(status:string){return CUSTOMER_STATUS_LABELS[status]??"Order update"}

const CUSTOMER_EMAIL_STATUSES = new Set(["PROCESSING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]);
export function shouldEmailCustomerForOrderStatus(status:string){return CUSTOMER_EMAIL_STATUSES.has(status)}

export function allowedOrderTransitions(status: string) {
  return FULFILMENT_TRANSITIONS[status] ?? [];
}

export function assertOrderTransition(from: string, to: string) {
  if (!allowedOrderTransitions(from).includes(to)) {
    throw new Error(`Order cannot move from ${from.replaceAll("_", " ")} to ${to.replaceAll("_", " ")}.`);
  }
}

export function assertOrderTransitionRequirements(input: { from: string; to: string; hasSupplierItems: boolean; hasShipment: boolean }) {
  if (input.from === "PROCESSING" && input.to === "SOURCING_ITEMS" && !input.hasSupplierItems) throw new Error("Select an approved distributor for the order products first.");
  if (["DISPATCHED", "IN_TRANSIT", "DELIVERED"].includes(input.to) && !input.hasShipment) throw new Error("Plan and record the delivery provider before advancing this order.");
}

export function cancellationRequiresFinanceConfirmation(status: string) {
  return allowedOrderTransitions(status).includes("CANCELLED");
}

const DEFAULT_TRANSITION_NOTES: Record<string, string> = {
  PROCESSING: "Your order has been accepted and is being processed.",
  SOURCING_ITEMS: "Your products are being prepared.",
  ITEMS_RECEIVED: "Your products are ready for packing.",
  PACKING: "Your order is being packed.",
  READY_FOR_DELIVERY: "Your delivery is being arranged.",
  DISPATCHED: "Your order has been dispatched.",
  IN_TRANSIT: "Your order is in transit.",
  OUT_FOR_DELIVERY: "Your order is out for delivery.",
  DELIVERED: "Your order has been delivered.",
  COMPLETED: "Your order is complete.",
};
export function defaultOrderTransitionNote(status: string) { return DEFAULT_TRANSITION_NOTES[status] ?? "Your order has been updated."; }

export function currentOperationalTime() { return Date.now(); }

export function reservationAfterRelease(currentReserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0 || currentReserved < quantity) {
    throw new Error("Reserved inventory cannot be released safely.");
  }
  return currentReserved - quantity;
}

// Preserve historical records, but keep automated purchasing details off the customer tracker.
export function customerOrderPublicNote(note: string | null) {
  if (note === "The supplier order has been placed and your products are being prepared.") return "Your products are being prepared.";
  if (note === "The supplier has confirmed the product order. We will update you when the items are ready for delivery.") return "Your products have been confirmed. We will update you when they are ready for delivery.";
  return note;
}
