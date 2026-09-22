type PermissionRow = {
  id: string;
  key: string;
};

type PermissionEffectReader = Pick<FormData, "get">;

type RolePermissionRule = {
  roleId: string;
  permissionId: string;
  effect: "ALLOW" | "DENY";
};

export function rolePermissionRulesFromForm(
  roleId: string,
  permissions: readonly PermissionRow[],
  formData: PermissionEffectReader,
): RolePermissionRule[] {
  return permissions.flatMap((permission) => {
    const effect = formData.get(`permission:${permission.key}`);
    return effect === "ALLOW" || effect === "DENY"
      ? [{ roleId, permissionId: permission.id, effect }]
      : [];
  });
}
