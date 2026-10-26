/**
 * Role-based access control. Customer personal data (enquiries / showing requests) is only
 * visible to roles that need it — editors who maintain listings never see it (data minimisation).
 */
export const ROLES = {
  admin: "Administrator — everything, including users, settings and compliance",
  editor: "Listings editor — listings, spreadsheet imports and valuation data (no customer data)",
  agent: "Sales agent — enquiries and showing requests (read-only listings)",
} as const;
export type Role = keyof typeof ROLES;

export const PERMISSIONS = {
  "dashboard": ["admin", "editor", "agent"],
  "listings:read": ["admin", "editor", "agent"],
  "listings:write": ["admin", "editor"],
  "listings:delete": ["admin"],
  "imports": ["admin", "editor"],
  "enquiries": ["admin", "agent"],
  "enquiries:delete": ["admin"],
  "emails": ["admin", "agent"],
  "comparables": ["admin", "editor"],
  "settings": ["admin"],
  "content": ["admin"],
  "compliance": ["admin"],
  "users": ["admin"],
  "audit": ["admin"],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
