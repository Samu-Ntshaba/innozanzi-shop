import { AdminPage, Panel, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { assignRole, createRole, deleteRole, removeRoleAssignment, saveRoleRules } from "@/domain/auth/admin-actions";
import { PERMISSIONS } from "@/domain/auth/permissions";
import { requirePermission } from "@/domain/auth/session";
import { inviteUser } from "@/domain/auth/invitations";
import { prisma } from "@/lib/prisma";

export default async function AccessControlPage() {
  const context = await requirePermission("users.manage");
  const [roles, users, companies, departments] = await Promise.all([
    prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null }, include: { roles: { include: { role: true } } }, orderBy: { email: "asc" }, take: 250 }),
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
        {locked ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Super Administrators always have every permission and cannot be restricted.</p> : <form action={saveRoleRules} className="mt-4"><input type="hidden" name="roleId" value={role.id} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PERMISSIONS.map((permission) => <label className="grid gap-1 text-sm" key={permission}><span className="font-medium">{permission}</span><select className={inputClass} name={`permission:${permission}`} defaultValue={configured.get(permission) ?? "NONE"}><option value="NONE">Not granted</option><option value="ALLOW">Allow</option><option value="DENY">Deny</option></select></label>)}</div><button className={`${buttonClass} mt-4`}>Save rules</button></form>}
      </Panel>;
    })}</div>

    <Panel><h2 className="font-semibold">User role assignments</h2><table className={`${tableClass} mt-4`}><thead><tr><th>User</th><th>Assigned roles</th><th>Assign role</th></tr></thead><tbody>{users.map((user) => {
      const assignedIds = new Set(user.roles.map((item) => item.roleId));
      const available = roles.filter((role) => !assignedIds.has(role.id));
      return <tr key={user.id}><td><strong>{user.name || "Unnamed user"}</strong><br /><span className="text-slate-500">{user.email}</span></td><td><div className="flex flex-wrap gap-2">{user.roles.length ? user.roles.map(({ role }) => <form action={removeRoleAssignment} key={role.id}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="roleId" value={role.id} /><button className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-red-400" title={`Remove ${role.name}`}>{role.name} ×</button></form>) : <span className="text-slate-500">No roles</span>}</div>{user.id === context.user.id && <span className="mt-1 block text-xs text-sky-700">Your account</span>}</td><td>{available.length ? <form action={assignRole} className="flex gap-2"><input type="hidden" name="userId" value={user.id} /><select className={inputClass} name="roleId" required>{available.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button className={buttonClass}>Assign</button></form> : <span className="text-slate-500">All roles assigned</span>}</td></tr>;
    })}</tbody></table></Panel>
  </AdminPage>;
}
