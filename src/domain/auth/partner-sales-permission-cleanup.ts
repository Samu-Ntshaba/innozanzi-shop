import { shouldRemoveAutoManagedPartnerSalesGrant } from "./permissions";

type CleanupRole = {
  id: string;
  slug: string;
};

type CleanupPermission = {
  id: string;
  key: string;
};

type CleanupClient = {
  rolePermission: {
    deleteMany(args: {
      where: {
        roleId: string;
        permissionId: string | { in: string[] };
      };
    }): PromiseLike<{ count: number }>;
  };
};

export async function cleanupSeedAutoManagedPartnerSalesGrants(
  client: CleanupClient,
  roles: readonly CleanupRole[],
  permissions: readonly CleanupPermission[],
) {
  let deleted = 0;
  for (const role of roles) {
    const permissionIds = permissions
      .filter(({ key }) =>
        shouldRemoveAutoManagedPartnerSalesGrant(role.slug, key),
      )
      .map(({ id }) => id);
    if (!permissionIds.length) continue;
    const result = await client.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: permissionIds } },
    });
    deleted += result.count;
  }
  return deleted;
}

async function cleanupSingleRoleGrant(
  client: CleanupClient,
  expectedRoleSlug: string,
  role: CleanupRole,
  permission: CleanupPermission,
) {
  if (
    role.slug !== expectedRoleSlug ||
    !shouldRemoveAutoManagedPartnerSalesGrant(role.slug, permission.key)
  ) {
    return 0;
  }
  const result = await client.rolePermission.deleteMany({
    where: { roleId: role.id, permissionId: permission.id },
  });
  return result.count;
}

export function cleanupRepairAdministratorPartnerSalesGrant(
  client: CleanupClient,
  role: CleanupRole,
  permission: CleanupPermission,
) {
  return cleanupSingleRoleGrant(
    client,
    "administrator",
    role,
    permission,
  );
}

export function cleanupUpsertSuperAdministratorPartnerSalesGrant(
  client: CleanupClient,
  role: CleanupRole,
  permission: CleanupPermission,
) {
  return cleanupSingleRoleGrant(
    client,
    "super-administrator",
    role,
    permission,
  );
}
