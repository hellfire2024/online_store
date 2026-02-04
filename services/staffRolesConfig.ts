export interface StaffRole {
  key: string;
  label: string;
  description?: string;
}

const DEFAULT_STAFF_ROLES: StaffRole[] = [
  { key: 'manager', label: 'Manager', description: 'Manages staff and operations' },
  { key: 'designer', label: 'Designer', description: 'Creates and designs content' },
  { key: 'sales', label: 'Sales', description: 'Handles customer sales' },
  { key: 'support', label: 'Support', description: 'Customer support team' },
  { key: 'content_creator', label: 'Content Creator', description: 'Creates marketing content' },
  { key: 'accountant', label: 'Accountant', description: 'Manages financial records' },
];

const STORAGE_KEY = 'staff_roles_config_v1';

export function loadStaffRoles(): StaffRole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STAFF_ROLES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as StaffRole[];
    return DEFAULT_STAFF_ROLES;
  } catch {
    return DEFAULT_STAFF_ROLES;
  }
}

export function saveStaffRoles(roles: StaffRole[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

export function findStaffRoleLabel(roles: StaffRole[], key: string): string {
  const r = roles.find(r => r.key === key);
  if (r) return r.label;
  return key;
}
