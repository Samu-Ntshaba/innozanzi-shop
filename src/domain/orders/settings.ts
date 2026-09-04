export const DEFAULT_ORDER_COMPLETION_WINDOW_DAYS = 5;
export async function orderCompletionWindowDays() { const { prisma } = await import("@/lib/prisma"); const row = await prisma.marketingSetting.findUnique({ where: { key: "orders.completionWindowDays" } }); const value = typeof row?.value === "number" ? row.value : DEFAULT_ORDER_COMPLETION_WINDOW_DAYS; return Number.isInteger(value) && value >= 1 && value <= 90 ? value : DEFAULT_ORDER_COMPLETION_WINDOW_DAYS; }
export function returnWindowEnd(deliveredAt: Date, days: number) { return new Date(deliveredAt.getTime() + days * 86_400_000); }
