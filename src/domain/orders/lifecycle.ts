export const FULFILMENT_TRANSITIONS: Record<string, readonly string[]> = {
  PAYMENT_VERIFIED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SOURCING_ITEMS", "ITEMS_RECEIVED", "PACKING", "CANCELLED"],
  SOURCING_ITEMS: ["ITEMS_RECEIVED", "CANCELLED"],
  ITEMS_RECEIVED: ["PACKING", "CANCELLED"],
  PACKING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELIVERED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedOrderTransitions(status: string) {
  return FULFILMENT_TRANSITIONS[status] ?? [];
}

export function assertOrderTransition(from: string, to: string) {
  if (!allowedOrderTransitions(from).includes(to)) {
    throw new Error(`Order cannot move from ${from.replaceAll("_", " ")} to ${to.replaceAll("_", " ")}.`);
  }
}

export function cancellationRequiresFinanceConfirmation(status: string) {
  return allowedOrderTransitions(status).includes("CANCELLED");
}

export function reservationAfterRelease(currentReserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0 || currentReserved < quantity) {
    throw new Error("Reserved inventory cannot be released safely.");
  }
  return currentReserved - quantity;
}
