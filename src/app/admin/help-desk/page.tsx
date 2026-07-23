import Link from "next/link";
import { AdminPage, EmptyState, MetricCard, Panel, StatusBadge, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function HelpDeskPage() {
  await requirePermission("customers.manage");
  const [rows, tasks] = await Promise.all([
    prisma.helpDeskTicket.findMany({ include: { assignee: { select: { name: true, email: true } }, _count: { select: { tasks: true } } }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 150 }),
    prisma.serviceTask.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] } } }),
  ]);
  return <AdminPage title="Service workspace" description="Track customer conversations, ownership, deadlines and the work required to resolve them." actions={<Link className="font-semibold text-sky-700" href="/admin/calendar">Open calendar →</Link>}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Open tickets" value={rows.filter(x=>x.status==="OPEN").length}/><MetricCard label="In progress" value={rows.filter(x=>x.status==="IN_PROGRESS").length}/><MetricCard label="Waiting for customer" value={rows.filter(x=>x.status==="WAITING_CUSTOMER").length}/><MetricCard label="Open tasks" value={tasks} detail="Across service operations"/></div>
    <Panel title="Support queue" description="Open a ticket to assign ownership, reply to the client and manage its task list.">
      <div className="-mx-4 overflow-x-auto">{rows.length?<table className={tableClass}><thead><tr><th>Ticket</th><th>Customer</th><th>Request</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><strong>{x.ticketNumber}</strong><br/><span className="text-xs text-slate-500">{x.category} · {x.priority}</span></td><td>{x.name}<br/><span className="text-xs text-slate-500">{x.email}</span></td><td className="max-w-xs"><strong>{x.subject}</strong><p className="line-clamp-1 text-xs text-slate-500">{x.message}</p></td><td>{x.assignee?.name??x.assignee?.email??"Unassigned"}<br/><span className="text-xs text-slate-500">{x._count.tasks} task(s)</span></td><td>{x.dueAt?.toLocaleString("en-ZA")??"Not set"}</td><td><StatusBadge value={x.status}/></td><td><Link className="font-semibold text-sky-700" href={`/admin/help-desk/${x.id}`}>View</Link></td></tr>)}</tbody></table>:<EmptyState title="No support tickets" description="New customer support conversations will appear here automatically."/>}</div>
    </Panel>
  </AdminPage>;
}
