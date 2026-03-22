import { describe, expect, it } from "vitest";
import { ACTIONS, checkPermission, normalizeRole, ROLES } from "./rbac";

describe("normalizeRole", () => {
  it("maps known roles case-insensitively", () => {
    expect(normalizeRole("ADMIN")).toBe("admin");
    expect(normalizeRole("Editor")).toBe("editor");
    expect(normalizeRole("VIEWER")).toBe("viewer");
  });

  it("defaults unknown strings to viewer", () => {
    expect(normalizeRole("owner")).toBe("viewer");
    expect(normalizeRole("")).toBe("viewer");
  });

  it("only produces Role union values", () => {
    for (const r of ROLES) {
      expect(normalizeRole(r)).toBe(r);
    }
  });
});

describe("checkPermission", () => {
  it("grants admin every action in the matrix", () => {
    for (const action of ACTIONS) {
      expect(checkPermission("admin", action)).toBe(true);
    }
    expect(checkPermission("ADMIN", "dashboard:view")).toBe(true);
  });

  it("grants editor create/edit inventory and related work actions", () => {
    expect(checkPermission("editor", "inventory:create")).toBe(true);
    expect(checkPermission("editor", "inventory:edit")).toBe(true);
    expect(checkPermission("editor", "inventory:delete")).toBe(true);
    expect(checkPermission("editor", "classifier:run")).toBe(true);
    expect(checkPermission("editor", "documents:generate")).toBe(true);
    expect(checkPermission("editor", "export:run")).toBe(true);
  });

  it("denies editor team:invite, settings:billing, and settings:api", () => {
    expect(checkPermission("editor", "team:invite")).toBe(false);
    expect(checkPermission("editor", "settings:billing")).toBe(false);
    expect(checkPermission("editor", "settings:api")).toBe(false);
  });

  it("grants viewer only view-oriented actions", () => {
    const viewerAllowed = new Set([
      "dashboard:view",
      "inventory:view",
      "documents:view",
      "audit:view",
      "incidents:view",
      "calendar:view",
      "conformity:view",
      "settings:view",
      "export:run",
    ]);
    for (const action of ACTIONS) {
      expect(checkPermission("viewer", action)).toBe(viewerAllowed.has(action));
    }
  });

  it("denies unknown roles for every action", () => {
    for (const action of ACTIONS) {
      expect(checkPermission("superuser", action)).toBe(false);
      expect(checkPermission("", action)).toBe(false);
    }
  });

  it("evaluates each action string explicitly against known roles", () => {
    const cases: { role: string; action: (typeof ACTIONS)[number]; expected: boolean }[] = [
      { role: "admin", action: "dashboard:view", expected: true },
      { role: "admin", action: "team:remove", expected: true },
      { role: "editor", action: "scanner:run", expected: true },
      { role: "editor", action: "team:role", expected: false },
      { role: "viewer", action: "inventory:view", expected: true },
      { role: "viewer", action: "inventory:create", expected: false },
      { role: "viewer", action: "incidents:create", expected: false },
      { role: "viewer", action: "calendar:manage", expected: false },
    ];
    for (const c of cases) {
      expect(checkPermission(c.role, c.action)).toBe(c.expected);
    }
  });
});
