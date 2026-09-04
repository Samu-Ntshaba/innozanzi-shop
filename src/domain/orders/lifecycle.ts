export const FULFILMENT_TRANSITIONS: Record<string, readonly string[]> = {
  PAYMENT_VERIFIED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SOURCING_ITEMS", "ITEMS_RECEIVED", "CANCELLED"],
  SOURCING_ITEMS: ["ITEMS_RECEIVED", "CANCELLED"],
  ITEMS_RECEIVED: ["PACKING", "CANCELLED"],
  PACKING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STAGE_COPY: Record<string, { phase: string; reason: string; next: string; owner: string; customer: string }> = {
  PAYMENT_VERIFIED: { phase: "Payment confirmed", reason: "Funds have been verified and the order is ready for fulfilment.", next: "Accept the order for processing", owner: "Fulfilment", customer: "Payment confirmed" },
  PROCESSING: { phase: "Order processing", reason: "The order snapshot is being checked and stock is being allocated.", next: "Start supplier sourcing or confirm local stock", owner: "Fulfilment", customer: "Order processing" },
  SOURCING_ITEMS: { phase: "Supplier procurement", reason: "One or more products must be obtained from a supplier.", next: "Confirm every item has been received", owner: "Procurement", customer: "Products being prepared" },
  ITEMS_RECEIVED: { phase: "Products received", reason: "All products required for this order are available for packing.", next: "Start packing", owner: "Warehouse", customer: "Products being prepared" },
  PACKING: { phase: "Packing", reason: "The products are being checked and packed for handover.", next: "Mark the order ready for delivery", owner: "Warehouse", customer: "Products being prepared" },
  READY_FOR_DELIVERY: { phase: "Ready for delivery", reason: "The parcel is packed and must be assigned to a delivery provider.", next: "Plan delivery before dispatch", owner: "Logistics", customer: "Ready for delivery" },
  DISPATCHED: { phase: "Dispatched", reason: "The parcel has left fulfilment and is with the delivery provider.", next: "Confirm the parcel is in transit", owner: "Logistics", customer: "On the way" },
  IN_TRANSIT: { phase: "In transit", reason: "The parcel is travelling to the customer.", next: "Confirm delivery", owner: "Logistics", customer: "On the way" },
  DELIVERED: { phase: "Delivered", reason: "Delivery has been recorded and remains visible for after-sales support.", next: "Complete the order after confirmation", owner: "Customer service", customer: "Delivered" },
  COMPLETED: { phase: "Completed", reason: "The commercial and fulfilment lifecycle is complete.", next: "Monitor after-sales requests", owner: "Customer service", customer: "Completed" },
  CANCELLED: { phase: "Cancelled", reason: "The order was cancelled and cannot continue through fulfilment.", next: "Review the audit trail and refund record", owner: "Finance", customer: "Cancelled" },
};

export function orderStageContext(status: string) {
  return STAGE_COPY[status] ?? { phase: status.replaceAll("_", " "), reason: "This order is awaiting its next system event.", next: "Review the order", owner: "Operations", customer: "Order received" };
}

const CUSTOMER_STATUS_LABELS: Record<string,string> = { DRAFT:"Order started",PENDING:"Order placed",AWAITING_PAYMENT:"Awaiting payment",PAYMENT_UNDER_REVIEW:"Payment under review",PAID:"Payment confirmed",PAYMENT_VERIFIED:"Payment confirmed",PROCESSING:"Order being processed",SOURCING_ITEMS:"Products being prepared",ITEMS_RECEIVED:"Products ready for packing",PACKING:"Order being packed",READY_FOR_DELIVERY:"Delivery being scheduled",DISPATCHED:"Out for delivery",IN_TRANSIT:"Out for delivery",SHIPPED:"Out for delivery",DELIVERED:"Delivered",COMPLETED:"Order completed",CANCELLED:"Order cancelled",REFUNDED:"Order refunded",PARTIALLY_REFUNDED:"Order partially refunded" };
export function customerOrderStatusLabel(status:string){return CUSTOMER_STATUS_LABELS[status]??"Order update"}

export function allowedOrderTransitions(status: string) {
  return FULFILMENT_TRANSITIONS[status] ?? [];
}

export function assertOrderTransition(from: string, to: string) {
  if (!allowedOrderTransitions(from).includes(to)) {
    throw new Error(`Order cannot move from ${from.replaceAll("_", " ")} to ${to.replaceAll("_", " ")}.`);
  }
}

export function assertOrderTransitionRequirements(input: { from: string; to: string; hasSupplierItems: boolean; hasShipment: boolean }) {
  if (input.from === "PROCESSING" && input.to === "ITEMS_RECEIVED" && input.hasSupplierItems) throw new Error("Supplier-sourced orders must pass through supplier procurement before products can be received.");
  if (input.from === "PROCESSING" && input.to === "SOURCING_ITEMS" && !input.hasSupplierItems) throw new Error("This order contains no supplier-sourced products. Confirm local stock instead.");
  if (["DISPATCHED", "IN_TRANSIT", "DELIVERED"].includes(input.to) && !input.hasShipment) throw new Error("Plan and record the delivery provider before advancing this order.");
}

export function cancellationRequiresFinanceConfirmation(status: string) {
  return allowedOrderTransitions(status).includes("CANCELLED");
}

export function currentOperationalTime() { return Date.now(); }

export function reservationAfterRelease(currentReserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0 || currentReserved < quantity) {
    throw new Error("Reserved inventory cannot be released safely.");
  }
  return currentReserved - quantity;
}
