import { useMemo } from "react";
import { useAdmin } from "../context/AdminContext";
import { loadRoles, hasPermission } from "../services/rolesConfig";

export function usePermissions() {
  const { adminUser } = useAdmin();
  const roles = loadRoles();

  const userRole = useMemo(() => {
    if (!adminUser) return null;
    return roles.find((r) => r.key === adminUser.role) || null;
  }, [adminUser, roles]);

  const can = (permission: string): boolean => {
    if (!userRole) return false;
    return hasPermission(userRole, permission);
  };

  const canAll = (permissions: string[]): boolean => {
    return permissions.every((p) => can(p));
  };

  const canAny = (permissions: string[]): boolean => {
    return permissions.some((p) => can(p));
  };

  return { can, canAll, canAny, userRole };
}
