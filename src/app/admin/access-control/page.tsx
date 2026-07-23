import { AdminPage, Panel, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { assignRole, createRole, deleteRole, deleteUser, removeRoleAssignment, restoreUser, saveRoleRules } from "@/domain/auth/admin-actions";
import { PERMISSIONS } from "@/domain/auth/permissions";
import { requirePermission } from "@/domain/auth/session";
import { inviteUser } from "@/domain/auth/invitations";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";

const permissionGroups = [
  ["Catalogue", PERMISSIONS.filter((permission) => permission.startsWith("products.") || permission.startsWith("inventory."))],
  ["Sales and fulfilment", PERMISSIONS.filter((permission) => ["orders.", "payments.", "quotations.", "customers."].some((prefix) => permission.startsWith(prefix)))],
  ["RFQs and tenders", PERMISSIONS.filter((permission) => permission.startsWith("rfq."))],
  ["Partnerships", PERMISSIONS.filter((permission) => permission.startsWith("partnership."))],
  ["Reporting and system", PERMISSIONS.filter((permission) => ["reports.", "users.", "settings."].some((prefix) => permission.startsWith(prefix)))],
] as const;

export default async function AccessControlPage() {
  const context = await requirePermission("users.manage");
  const [roles, users, companies, departments] = await Promise.all([
    prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { roles: { include: { role: true } } }, orderBy: [{ deletedAt: "asc" }, { email: "asc" }], take: 250 }),
    prisma.companyProfile.findMany({ select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 250 }),
    prisma.department.findMany({ where: { isActive: true }, select: { id: true, name: true, companyId: true }, orderBy: { name: "asc" } }),
  ]);
  const assignableRoles = roles.filter((role) => role.slug !== "super-administrator" || context.isSuperAdministrator);

  return <AdminPage title="Access control" description="Create roles, define allow/deny rules, and assign roles to staff accounts.">
    <Panel><h2 className="font-semibold">Invite user</h2><p className="mt-1 text-sm text-slate-500">A secure temporary password and activation link will be emailed. The invited user is blocked from protected pages until activation.</p><form action={inviteUser} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><input className={inputClass} name="name" placeholder="Full name" required /><input className={inputClass} name="email" type="email" placeholder="Email" required /><input className={inputClass} name="phone" placeholder="Phone (optional)" /><select className={inputClass} name="accountType" required><option value="INTERNAL_EMPLOYEE">Internal employee</option><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option><option value="EXTERNAL_COLLABORATOR">External collaborator</option></select><select className={inputClass} name="roleId" required><option value="">Select role</option>{assignableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><select className={inputClass} name="companyId"><option value="">No company / Innozanzi</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select><select className={inputClass} name="departmentId"><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button className={buttonClass}>Send invitation</button></form></Panel>
    <Panel><h2 className="font-semibold">Create role</h2><form action={createRole} className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]"><input className={inputClass} name="name" placeholder="Role name" required /><input className={inputClass} name="description" placeholder="Description" /><button className={buttonClass}>Create role</button></form></Panel>

    <div className="space-y-5">{roles.map((role) => {
      const configured = new Map(role.permissions.map((item) => [item.permission.key, item.effect]));
      const locked = role.slug === "super-administrator";
      return <Panel key={role.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{role.name}</h2><p className="text-sm text-slate-500">{role.description || role.slug} · {role._count.users} user(s){role.isSystem ? " · System role" : ""}</p></div>{!role.isSystem && <form action={deleteRole}><input type="hidden" name="roleId" value={role.id} /><button className="text-sm text-red-700 underline">Delete role</button></form>}</div>
        {locked ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Super Administrators always have every permission and cannot be restricted.</p> : <form action={saveRoleRules} className="mt-4"><input type="hidden" name="roleId" value={role.id} /><div className="space-y-2">{permissionGroups.map(([group, permissions], index) => <details className="border border-slate-300" key={group} open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span>{group}</span><span className="text-xs font-normal text-slate-500">{permissions.filter((permission) => configured.has(permission)).length} configured · expand</span></summary><div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">{permissions.map((permission) => <label className="grid gap-1 text-sm" key={permission}><span className="font-medium">{permission.replaceAll(".", " · ").replaceAll("_", " ")}</span><select className={inputClass} name={`permission:${permission}`} defaultValue={configured.get(permission) ?? "NONE"}><option value="NONE">Not granted</option><option value="ALLOW">Allow</option><option value="DENY">Deny</option></select></label>)}</div></details>)}</div><div className="sticky bottom-0 mt-4 flex justify-end border-t border-slate-200 bg-white py-3"><button className={buttonClass}>Save role permissions</button></div></form>}
      </Panel>;
    })}</div>

    <Panel><h2 className="font-semibold">User access and role assignments</h2><p className="mt-1 text-sm text-slate-500">Deleting a user immediately revokes access while retaining quotations, orders, payments and audit history.</p><table className={`${tableClass} mt-4`}><thead><tr><th>User</th><th>Assigned roles</th><th>Assign role</th><th>Account action</th></tr></thead><tbody>{users.map((user) => {
      const assignedIds = new Set(user.roles.map((item) => item.roleId));
      const available = roles.filter((role) => !assignedIds.has(role.id));
      return <tr className={user.deletedAt?"bg-slate-100 text-slate-500":undefined} key={user.id}><td><strong>{user.name || "Unnamed user"}</strong><br /><span className="text-slate-500">{user.email}</span>{user.deletedAt?<span className="mt-1 block text-xs font-bold uppercase text-rose-700">Deleted</span>:null}</td><td><div className="flex flex-wrap gap-2">{user.roles.length ? user.roles.map(({ role }) => <form action={removeRoleAssignment} key={role.id}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="roleId" value={role.id} /><button className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-red-400" title={`Remove ${role.name}`}>{role.name} ×</button></form>) : <span className="text-slate-500">No roles</span>}</div>{user.id === context.user.id && <span className="mt-1 block text-xs text-sky-700">Your account</span>}</td><td>{!user.deletedAt&&available.length ? <form action={assignRole} className="flex gap-2"><input type="hidden" name="userId" value={user.id} /><select className={inputClass} name="roleId" required>{available.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button className={buttonClass}>Assign</button></form> : <span className="text-slate-500">{user.deletedAt?"Access revoked":"All roles assigned"}</span>}</td><td>{context.isSuperAdministrator&&user.id!==context.user.id?(user.deletedAt?<form action={restoreUser}><input type="hidden" name="userId" value={user.id}/><ConfirmActionButton className="font-semibold text-sky-700 underline" label="Restore user" message={`Restore ${user.email}? They will need to verify or activate their account before signing in.`}/></form>:<form action={deleteUser}><input type="hidden" name="userId" value={user.id}/><ConfirmActionButton className="font-semibold text-rose-700 underline" label="Delete user" message={`Delete ${user.email}? Access will be revoked immediately. Business and audit history will be retained.`}/></form>):<span className="text-slate-400">Protected</span>}</td></tr>;
    })}</tbody></table></Panel>
  </AdminPage>;
}
