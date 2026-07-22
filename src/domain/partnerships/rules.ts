export const ACTIVE_APPLICATION_STATUSES = [
  "DRAFT", "SUBMITTED", "DOCUMENTS_REQUIRED", "UNDER_REVIEW", "DUE_DILIGENCE", "CHANGES_REQUESTED", "CONDITIONALLY_APPROVED",
] as const;

export const APPROVED_PARTNERSHIP_STATUSES = ["APPROVED", "CONDITIONALLY_APPROVED"] as const;

export function hasPartnerWorkspaceAccess(status: string) {
  return (APPROVED_PARTNERSHIP_STATUSES as readonly string[]).includes(status);
}

export function canRespondToOffer(status: string, validUntil: Date, now = new Date()) {
  return status === "SENT" && validUntil.getTime() >= now.getTime();
}

export function publicPartnerMessage<T extends { isInternal: boolean }>(message: T) {
  if (message.isInternal) return null;
  const { isInternal: _privateMarker, ...publicFields } = message;
  void _privateMarker;
  return publicFields;
}
