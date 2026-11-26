export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type Permission = "read" | "write" | "manage" | "bill";
const permissions: Record<Role, Permission[]> = {
  OWNER: ["read", "write", "manage", "bill"],
  ADMIN: ["read", "write", "manage"],
  MEMBER: ["read", "write"],
  VIEWER: ["read"],
};
export function can(role: Role, permission: Permission) {
  return permissions[role].includes(permission);
}
export function canManageRole(actor: Role, target: Role, next: Role = target) {
  if (target === "OWNER" || next === "OWNER") return false;
  return (
    actor === "OWNER" ||
    (actor === "ADMIN" && target !== "ADMIN" && next !== "ADMIN")
  );
}
