// Role and permission utilities for admin

export function loadRoles() {
  // Example roles, replace with actual roles as needed
  return [
    {
      key: "admin",
      permissions: [
        "products",
        "galleries",
        "staff",
        "reviews",
        "services",
        "settings",
        "pages",
        "users",
        "customers",
        "orders",
        "security",
        "support",
      ],
    },
    {
      key: "staff",
      permissions: [
        "products",
        "galleries",
        "reviews",
        "services",
        "pages",
        "customers",
        "orders",
        "support",
      ],
    },
    { key: "viewer", permissions: [] },
  ];
}

export function hasPermission(
  role: { key: string; permissions: string[] },
  permission: string,
): boolean {
  return role.permissions.includes(permission);
}
