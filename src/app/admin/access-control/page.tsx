import Link from "next/link";

import { AdminPage, Panel, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { ConfirmActionButton, PermanentDeleteButton } from "@/components/admin/confirm-action-button";
import {
  assignRole,
  createRole,
  deleteRole,
  deleteUser,
  permanentlyDeleteUser,
  removeRoleAssignment,
  restoreUser,
  saveRoleRules,
} from "@/domain/auth/admin-actions";
import { inviteUser } from "@/domain/auth/invitations";
import { PERMISSIONS } from "@/domain/auth/permissions";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const permissionGroups = [
  ["Catalogue", PERMISSIONS.filter((permission) => permission.startsWith("products.") || permission.startsWith("inventory."))],
  ["Sales and fulfilment", PERMISSIONS.filter((permission) => ["orders.", "payments.", "quotations.", "customers."].some((prefix) => permission.startsWith(prefix)))],
  ["RFQs and tenders", PERMISSIONS.filter((permission) => permission.startsWith("rfq."))],
  ["Returns and service", PERMISSIONS.filter((permission) => permission.startsWith("returns."))],
  ["Transport and logistics", PERMISSIONS.filter((permission) => permission.startsWith("transport."))],
  ["Partnerships", PERMISSIONS.filter((permission) => permission.startsWith("partnership."))],
  ["Marketing", PERMISSIONS.filter((permission) => permission.startsWith("marketing."))],
  ["Documents", PERMISSIONS.filter((permission) => permission.startsWith("documents."))],
  ["Reporting and system", PERMISSIONS.filter((permission) => ["reports.", "users.", "settings."].some((prefix) => permission.startsWith(prefix)))],
] as const;

type AccessControlPageProps = {
  searchParams: Promise<{ role?: string; tab?: string }>;
};

const tabKeys = ["users", "invite", "roles", "permissions"] as const;
type TabKey = (typeof tabKeys)[number];

export default async function AccessControlPage({ searchParams }: AccessControlPageProps) {
  const context = await requirePermission("users.manage");
  const params = await searchParams;
  const [roles, users, companies, departments] = await Promise.all([
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: [{ deletedAt: "asc" }, { email: "asc" }],
      take: 250,
    }),
    prisma.companyProfile.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
      take: 250,
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeTab: TabKey = tabKeys.includes(params.tab as TabKey) ? (params.tab as TabKey) : "users";
  const assignableRoles = roles.filter((role) => role.slug !== "super-administrator" || context.isSuperAdministrator);
  const selectedRole =
    roles.find((role) => role.id === params.role) ??
    roles.find((role) => role.slug !== "super-administrator") ??
    roles[0];
  const tabs = [
    { key: "users", label: "Users", count: users.length },
    { key: "invite", label: "Invite user" },
    { key: "roles", label: "Roles", count: roles.length },
    { key: "permissions", label: "Permission rules" },
  ] satisfies Array<{ key: TabKey; label: string; count?: number }>;

  return (
    <AdminPage
      title="Access control"
      description="Invite users, assign access and manage role permissions in focused workspaces."
    >
      <nav aria-label="Access control sections" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
              href={`/admin/access-control?tab=${tab.key}`}
              key={tab.key}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-sky-100" : "bg-slate-100"}`}>
                  {tab.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {activeTab === "users" ? (
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">User access</h2>
              <p className="mt-1 text-sm text-slate-500">
                Assign roles or revoke access while retaining business and audit history.
              </p>
            </div>
            <Link className={buttonClass} href="/admin/access-control?tab=invite">
              Invite user
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr><th>User</th><th>Assigned roles</th><th>Assign role</th><th>Account action</th></tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const assignedIds = new Set(user.roles.map((item) => item.roleId));
                  const available = assignableRoles.filter((role) => !assignedIds.has(role.id));
                  return (
                    <tr className={user.deletedAt ? "bg-slate-100 text-slate-500" : undefined} key={user.id}>
                      <td>
                        <strong>{user.name || "Unnamed user"}</strong><br />
                        <span className="text-slate-500">{user.email}</span>
                        {user.deletedAt ? <span className="mt-1 block text-xs font-bold uppercase text-rose-700">Deleted</span> : null}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {user.roles.length ? user.roles.map(({ role }) => (
                            <form action={removeRoleAssignment} key={role.id}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="roleId" value={role.id} />
                              <button
                                className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-red-400"
                                title={`Remove ${role.name}`}
                              >
                                {role.name} ×
                              </button>
                            </form>
                          )) : <span className="text-slate-500">No roles</span>}
                        </div>
                        {user.id === context.user.id ? <span className="mt-1 block text-xs text-sky-700">Your account</span> : null}
                      </td>
                      <td>
                        {!user.deletedAt && available.length ? (
                          <form action={assignRole} className="flex gap-2">
                            <input type="hidden" name="userId" value={user.id} />
                            <select className={inputClass} name="roleId" required>
                              {available.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                            <button className={buttonClass}>Assign</button>
                          </form>
                        ) : (
                          <span className="text-slate-500">{user.deletedAt ? "Access revoked" : "All roles assigned"}</span>
                        )}
                      </td>
                      <td>
                        {context.isSuperAdministrator && user.id !== context.user.id ? (
                          user.deletedAt ? (
                            <div className="flex flex-wrap gap-3">
                              <form action={restoreUser}>
                                <input type="hidden" name="userId" value={user.id} />
                                <ConfirmActionButton
                                  className="font-semibold text-sky-700 underline"
                                  label="Restore user"
                                  message={`Restore ${user.email}? They will need to verify or activate their account before signing in.`}
                                />
                              </form>
                              <form action={permanentlyDeleteUser}>
                                <input type="hidden" name="userId" value={user.id} />
                                <PermanentDeleteButton className="font-semibold text-rose-800 underline" email={user.email} />
                              </form>
                            </div>
                          ) : (
                            <form action={deleteUser}>
                              <input type="hidden" name="userId" value={user.id} />
                              <ConfirmActionButton
                                className="font-semibold text-rose-700 underline"
                                label="Delete user"
                                message={`Delete ${user.email}? Access will be revoked immediately. Business and audit history will be retained.`}
                              />
                            </form>
                          )
                        ) : <span className="text-slate-400">Protected</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {activeTab === "invite" ? (
        <Panel>
          <h2 className="font-semibold">Invite a user</h2>
          <p className="mt-1 text-sm text-slate-500">
            We will email a secure temporary password and activation link. Protected pages remain blocked until activation.
          </p>
          <form action={inviteUser} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Full name<input className={inputClass} name="name" required /></label>
            <label className="grid gap-1 text-sm font-medium">Email<input className={inputClass} name="email" type="email" required /></label>
            <label className="grid gap-1 text-sm font-medium">Phone <span className="font-normal text-slate-500">(optional)</span><input className={inputClass} name="phone" /></label>
            <label className="grid gap-1 text-sm font-medium">Account type<select className={inputClass} name="accountType" required><option value="INTERNAL_EMPLOYEE">Internal employee</option><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option><option value="EXTERNAL_COLLABORATOR">External collaborator</option></select></label>
            <label className="grid gap-1 text-sm font-medium">Role<select className={inputClass} name="roleId" required><option value="">Select role</option>{assignableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Company<select className={inputClass} name="companyId"><option value="">No company / Innozanzi</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Department<select className={inputClass} name="departmentId"><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <div className="flex items-end"><button className={buttonClass}>Send invitation</button></div>
          </form>
        </Panel>
      ) : null}

      {activeTab === "roles" ? (
        <div className="space-y-5">
          <Panel>
            <h2 className="font-semibold">Create role</h2>
            <p className="mt-1 text-sm text-slate-500">Create the role here, then configure its access under Permission rules.</p>
            <form action={createRole} className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <input className={inputClass} name="name" placeholder="Role name" required />
              <input className={inputClass} name="description" placeholder="Description" />
              <button className={buttonClass}>Create role</button>
            </form>
          </Panel>
          <Panel>
            <h2 className="font-semibold">Existing roles</h2>
            <div className="mt-4 overflow-x-auto">
              <table className={tableClass}>
                <thead><tr><th>Role</th><th>Users</th><th>Rules</th><th>Action</th></tr></thead>
                <tbody>{roles.map((role) => (
                  <tr key={role.id}>
                    <td><strong>{role.name}</strong><br /><span className="text-slate-500">{role.description || role.slug}{role.isSystem ? " · System role" : ""}</span></td>
                    <td>{role._count.users}</td>
                    <td><Link className="font-semibold text-sky-700 underline" href={`/admin/access-control?tab=permissions&role=${role.id}`}>Manage permissions</Link></td>
                    <td>{!role.isSystem ? <form action={deleteRole}><input type="hidden" name="roleId" value={role.id} /><ConfirmActionButton className="text-sm font-semibold text-red-700 underline" label="Delete role" message={`Delete the ${role.name} role? This cannot be undone.`} /></form> : <span className="text-slate-400">Protected</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "permissions" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Panel>
            <h2 className="font-semibold">Choose a role</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto lg:grid lg:overflow-visible">
              {roles.map((role) => {
                const active = selectedRole?.id === role.id;
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${
                      active ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 hover:border-slate-400"
                    }`}
                    href={`/admin/access-control?tab=permissions&role=${role.id}`}
                    key={role.id}
                  >
                    {role.name}
                    <span className="ml-2 text-xs text-slate-500">{role.permissions.length}</span>
                  </Link>
                );
              })}
            </div>
          </Panel>
          {selectedRole ? (
            <Panel>
              <div>
                <h2 className="font-semibold">{selectedRole.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRole.description || selectedRole.slug} · {selectedRole._count.users} user(s)
                  {selectedRole.isSystem ? " · System role" : ""}
                </p>
              </div>
              {selectedRole.slug === "super-administrator" ? (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Super Administrators always have every permission and cannot be restricted.
                </p>
              ) : (
                <RolePermissionForm role={selectedRole} />
              )}
            </Panel>
          ) : (
            <Panel><p className="text-sm text-slate-500">Create a role before configuring permission rules.</p></Panel>
          )}
        </div>
      ) : null}
    </AdminPage>
  );
}

type RoleWithPermissions = Awaited<ReturnType<typeof prisma.role.findMany<{
  include: { permissions: { include: { permission: true } }; _count: { select: { users: true } } };
}>>>[number];

function RolePermissionForm({ role }: { role: RoleWithPermissions }) {
  const configured = new Map(role.permissions.map((item) => [item.permission.key, item.effect]));
  return (
    <form action={saveRoleRules} className="mt-4">
      <input type="hidden" name="roleId" value={role.id} />
      <div className="space-y-2">
        {permissionGroups.map(([group, permissions], index) => (
          <details className="border border-slate-300" key={group} open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span>{group}</span>
              <span className="text-xs font-normal text-slate-500">
                {permissions.filter((permission) => configured.has(permission)).length} configured · expand
              </span>
            </summary>
            <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => (
                <label className="grid gap-1 text-sm" key={permission}>
                  <span className="font-medium">{permission.replaceAll(".", " · ").replaceAll("_", " ")}</span>
                  <select
                    className={inputClass}
                    name={`permission:${permission}`}
                    defaultValue={configured.get(permission) ?? "NONE"}
                  >
                    <option value="NONE">Not granted</option>
                    <option value="ALLOW">Allow</option>
                    <option value="DENY">Deny</option>
                  </select>
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="sticky bottom-0 mt-4 flex justify-end border-t border-slate-200 bg-white py-3">
        <button className={buttonClass}>Save role permissions</button>
      </div>
    </form>
  );
}
