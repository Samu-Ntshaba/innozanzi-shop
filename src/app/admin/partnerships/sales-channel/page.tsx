import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPage, EmptyState, MetricCard, Panel, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const queue = (label: string, value: number, href: string, detail: string) => ({ label, value, href, detail });

/** Admin-only operational counts. No business rows or internal economics are sent to the RSC. */
export default async function PartnerSalesChannelPage() {
  await requirePermission("partnership.report.view");
  if (!(await partnerSalesSettings()).enabled) redirect("/unauthorized");

  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
  const [activeProfiles, enquiries, pricing, expiring, paymentExceptions, failedEmail, heldCommissions, payoutExceptions] = await Promise.all([
    prisma.partnerSalesProfile.count({ where: { status: "ACTIVE" } }),
    prisma.partnerQuoteCase.count({ where: { status: "NEW_ENQUIRY" } }),
    prisma.partnerQuoteCase.count({ where: { status: { in: ["PRICING_REQUESTED", "INNOZANZI_REVIEW"] } } }),
    prisma.partnerQuoteCase.count({ where: { status: "SENT_TO_CLIENT", activeQuotation: { validUntil: { gt: now, lte: soon } } } }),
    prisma.notification.count({ where: { type: "PAYMENT_EXCEPTION", status: { in: ["PENDING", "SENT", "FAILED"] } } }),
    prisma.notification.count({ where: { type: "EMAIL_OUTBOX", status: "FAILED", data: { path: ["idempotencyKey"], string_starts_with: "partner-sales:" } } }),
    prisma.partnerCommission.count({ where: { status: "HELD" } }),
    prisma.partnerPayoutBatch.count({ where: { status: "CANCELLED", exceptionNotes: { not: null } } }),
  ]);

  const queues = [
    queue("New enquiries", enquiries, "/admin/partnerships/sales-cases?status=NEW_ENQUIRY", "Awaiting qualification"),
    queue("Pricing and approval", pricing, "/admin/partnerships/sales-cases?status=INNOZANZI_REVIEW", "Needs an approved quotation"),
    queue("Quotes expiring soon", expiring, "/admin/partnerships/sales-cases?status=EXPIRING", "Next 48 hours"),
    queue("Payment exceptions", paymentExceptions, "/admin/payments?source=partner-sales", "Finance review required"),
    queue("Failed partner email", failedEmail, "/admin/email-marketing?category=partner-sales", "Retryable outbox work"),
    queue("Commission holds", heldCommissions, "/admin/partnerships/commissions?status=HELD", "Exception decision required"),
    queue("Payout exceptions", payoutExceptions, "/admin/partnerships/payouts?status=CANCELLED", "Review and re-prepare"),
  ];

  return <AdminPage title="Partner sales channel" description="Operate approved partner sales activity, message delivery, and financial exception queues. External audiences receive only approved customer-facing information." actions={<Link className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white" href="/admin/partnerships">Partnerships</Link>}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Active profiles" value={activeProfiles} detail="Feature-enabled partner profiles" />
      <MetricCard label="New enquiries" value={enquiries} detail="Awaiting qualification" />
      <MetricCard label="Expiring quotes" value={expiring} detail="Within 48 hours" />
      <MetricCard label="Failed messages" value={failedEmail} detail="Retryable transactional email" />
    </div>
    <Panel title="Operational queues" description="Counts are intentionally aggregate; costs, floors, supplier data, gateway evidence, and internal notes stay inside their authorised workspaces.">
      {queues.every((item) => item.value === 0) ? <EmptyState title="No partner sales exceptions" description="The channel is enabled and there is no queued partner sales work right now." /> : <div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Queue</th><th>Count</th><th>What it means</th><th /></tr></thead><tbody>{queues.map((item) => <tr key={item.label}><td className="font-semibold">{item.label}</td><td className="font-black tabular-nums">{item.value}</td><td className="text-slate-600">{item.detail}</td><td><Link className="font-semibold text-sky-700 underline" href={item.href}>Open queue</Link></td></tr>)}</tbody></table></div>}
    </Panel>
  </AdminPage>;
}
