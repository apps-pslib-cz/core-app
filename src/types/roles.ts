/**
 * User Role System
 *
 * Obecný model rolí - appka si role definuje sama jako konstanty (APP_ROLES),
 * uloženy jsou jako string[] na User.roles (Postgres array, ne pevný enum -
 * nová role tedy nevyžaduje migraci schématu). Nahrazuje dřívější pevnou
 * trojici admin/evaluator/author z projects-v1-app.
 */

// Role této appky, od nejvyšší výsady k nejnižší. Upravte podle potřeby -
// přidání/odebrání role je jen úprava tohoto souboru, ne migrace databáze.
export const APP_ROLES = ["admin", "member"] as const;
export type UserRole = (typeof APP_ROLES)[number];

export const USER_ROLES = APP_ROLES;

// JWT claim (z Identity Serveru) -> role, kterou appka uživateli přidělí,
// pokud je claim pravdivý. Název claimu si appka zaregistruje na OAuth
// serveru jako vlastní scope (viz AUTH_DUENDE_IDENTITY_SERVER6_SCOPE).
export const ROLE_CLAIMS: Record<string, UserRole> = {
  "core.admin": "admin",
  "core.member": "member",
};

// Hierarchie rolí - mapuje požadovanou roli na množinu rolí, které ji
// splňují (ona sama + všechny nadřazené). Čistě plochý seznam rolí bez
// hierarchie je taky platná konfigurace - stačí každou roli namapovat jen
// na sebe samu.
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  admin: ["admin"],
  member: ["admin", "member"],
};

export type UserRoles = {
  roles: string[];
};

export class RoleChecker {
  static hasRole(userRoles: UserRoles, role: UserRole): boolean {
    return userRoles.roles.includes(role);
  }

  /** Má roli, nebo jakoukoli roli nad ní v hierarchii. */
  static hasRoleOrHigher(userRoles: UserRoles, role: UserRole): boolean {
    const allowedRoles = ROLE_HIERARCHY[role] ?? [role];
    return allowedRoles.some((r) => this.hasRole(userRoles, r));
  }

  static getHighestRole(userRoles: UserRoles): UserRole | null {
    return APP_ROLES.find((role) => userRoles.roles.includes(role)) ?? null;
  }

  static getAllRoles(userRoles: UserRoles): UserRole[] {
    return APP_ROLES.filter((role) => userRoles.roles.includes(role));
  }
}

export function isValidRole(role: string): role is UserRole {
  return (APP_ROLES as readonly string[]).includes(role);
}

export function createRoleCondition(requiredRole: UserRole) {
  return (userRoles: UserRoles): boolean =>
    RoleChecker.hasRoleOrHigher(userRoles, requiredRole);
}
