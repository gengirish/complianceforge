export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "dashboard:view",
  "inventory:view",
  "inventory:create",
  "inventory:edit",
  "inventory:delete",
  "classifier:run",
  "documents:view",
  "documents:generate",
  "audit:view",
  "incidents:view",
  "incidents:create",
  "incidents:update",
  "scanner:run",
  "calendar:view",
  "calendar:manage",
  "conformity:view",
  "conformity:manage",
  "settings:view",
  "settings:billing",
  "settings:api",
  "team:invite",
  "team:role",
  "team:remove",
  "export:run",
] as const;

export type Action = (typeof ACTIONS)[number];

const matrix: Record<Role, ReadonlySet<Action>> = {
  admin: new Set(ACTIONS),
  editor: new Set<Action>([
    "dashboard:view",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:delete",
    "classifier:run",
    "documents:view",
    "documents:generate",
    "audit:view",
    "incidents:view",
    "incidents:create",
    "incidents:update",
    "scanner:run",
    "calendar:view",
    "calendar:manage",
    "conformity:view",
    "conformity:manage",
    "settings:view",
    "export:run",
  ]),
  viewer: new Set<Action>([
    "dashboard:view",
    "inventory:view",
    "documents:view",
    "audit:view",
    "incidents:view",
    "calendar:view",
    "conformity:view",
    "settings:view",
    "export:run",
  ]),
};

export function normalizeRole(role: string): Role {
  const r = role.toLowerCase();
  if (r === "admin" || r === "editor" || r === "viewer") return r;
  return "viewer";
}

export function checkPermission(role: string, action: string): boolean {
  const r = role.toLowerCase();
  if (r !== "admin" && r !== "editor" && r !== "viewer") return false;
  const allowed = matrix[r as Role];
  return allowed.has(action as Action);
}
