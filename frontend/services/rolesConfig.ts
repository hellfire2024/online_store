export type RoleKey = string;

export interface RoleConfig {
  key: RoleKey;
  label: string;
  description?: string;
  permissions: string[];
}

export const permissionsList: string[] = [
  "products",
  "orders",
  "customers",
  "galleries",
  "pages",
  "reviews",
  "services",
  "settings",
  "staff",
  "reports",
  "security",
];

const DEFAULT_ROLES: RoleConfig[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Full access to all features and settings.",
    permissions: ["*"],
  },
  {
    key: "admin",
    label: "Admin",
    description: "Manage content, products, customers; limited settings.",
    permissions: [
      "products",
      "orders",
      "customers",
      "galleries",
      "pages",
      "reviews",
      "services",
      "reports",
    ],
  },
  {
    key: "manager",
    label: "Manager",
    description: "Day-to-day operations: products, orders, customers.",
    permissions: ["products", "orders", "customers", "galleries", "reviews"],
  },
];

const STORAGE_KEY = "admin_roles_config_v1";

export function loadRoles(): RoleConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ROLES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RoleConfig[];
    return DEFAULT_ROLES;
  } catch {
    return DEFAULT_ROLES;
  }
}

export function saveRoles(roles: RoleConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

export function findRoleLabel(roles: RoleConfig[], key: string): string {
  const role = roles.find((r) => r.key === key);
  if (role) return role.label;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function hasPermission(role: RoleConfig, perm: string): boolean {
  return role.permissions.includes("*") || role.permissions.includes(perm);
}
