import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { AdminPage, EmptyState, Pagination, Panel, buttonClass, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Query = {
  search?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: string;
};

const pageSize = 50;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = (value?: string, endOfDay = false) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+02:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requirePermission("users.manage");
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const search = query.search?.trim().slice(0, 200);
  const from = date(query.from);
  const to = date(query.to, true);
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.actor === "system" ? { actorId: null } : query.actor && uuid.test(query.actor) ? { actorId: query.actor } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(search ? { OR: [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
      { actor: { email: { contains: search, mode: "insensitive" } } },
      { actor: { name: { contains: search, mode: "insensitive" } } },
    ] } : {}),
  };
  const [rows, total, actionRows, entityRows, actors] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, email: true, name: true }, orderBy: [{ name: "asc" }, { email: "asc" }], take: 250 }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return <AdminPage title="Audit log" description="Immutable record of privileged and integration activity, with server-side filtering and pagination.">
    <Panel title="Filter activity">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold xl:col-span-2">Search<input className={`${inputClass} mt-1 w-full`} name="search" defaultValue={query.search} placeholder="Action, entity, record ID or administrator"/></label>
        <label className="text-sm font-semibold">Action<select className={`${inputClass} mt-1 w-full`} name="action" defaultValue={query.action ?? ""}><option value="">All actions</option>{actionRows.map(row => <option key={row.action} value={row.action}>{row.action}</option>)}</select></label>
        <label className="text-sm font-semibold">Entity type<select className={`${inputClass} mt-1 w-full`} name="entityType" defaultValue={query.entityType ?? ""}><option value="">All entity types</option>{entityRows.map(row => <option key={row.entityType} value={row.entityType}>{row.entityType}</option>)}</select></label>
        <label className="text-sm font-semibold">Actor<select className={`${inputClass} mt-1 w-full`} name="actor" defaultValue={query.actor ?? ""}><option value="">All actors</option><option value="system">System</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name ? `${actor.name} · ` : ""}{actor.email}</option>)}</select></label>
        <label className="text-sm font-semibold">From<input className={`${inputClass} mt-1 w-full`} name="from" type="date" defaultValue={query.from}/></label>
        <label className="text-sm font-semibold">To<input className={`${inputClass} mt-1 w-full`} name="to" type="date" defaultValue={query.to}/></label>
        <div className="flex items-end gap-2"><button className={buttonClass}>Apply filters</button><Link className={secondaryButtonClass} href="/admin/audit-log">Clear</Link></div>
      </form>
    </Panel>
    <Panel title="Activity" description={`${total.toLocaleString("en-ZA")} matching record${total === 1 ? "" : "s"}`}>
      {rows.length ? <>
        <table className={tableClass}><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Record ID</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="whitespace-nowrap">{row.createdAt.toLocaleString("en-ZA")}</td><td><p className="font-medium">{row.actor?.name ?? (row.actor ? "Administrator" : "System")}</p>{row.actor ? <p className="text-xs text-slate-500">{row.actor.email}</p> : null}</td><td className="font-medium">{row.action}</td><td>{row.entityType}</td><td className="max-w-56 truncate font-mono text-xs" title={row.entityId ?? undefined}>{row.entityId ?? "—"}</td></tr>)}</tbody></table>
        <div className="mt-4"><Pagination page={Math.min(page, pageCount)} pageCount={pageCount} total={total} query={{ search: query.search, action: query.action, entityType: query.entityType, actor: query.actor, from: query.from, to: query.to }}/></div>
      </> : <EmptyState title="No activity found" description="Adjust or clear the filters to view other audit records."/>}
    </Panel>
  </AdminPage>;
}
