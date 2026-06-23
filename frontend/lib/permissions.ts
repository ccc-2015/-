import type { CurrentUser, Permission, Portal, UserRole } from "@/types/domain";

const adminRoles: UserRole[] = ["admin", "data_admin", "kb_admin", "advisor"];

export function canAccessPortal(user: CurrentUser, portal: Portal) {
  if (portal === "user") {
    return user.permissions.includes("user:read_self") || user.roles.includes("student_user");
  }

  return user.roles.some((role) => adminRoles.includes(role));
}

export function hasPermission(user: CurrentUser, permission: Permission) {
  return user.permissions.includes(permission);
}

export function getAvailablePortals(user: CurrentUser): Portal[] {
  return (["user", "admin"] as Portal[]).filter((portal) => canAccessPortal(user, portal));
}

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    student_user: "考生用户",
    parent_user: "家长用户",
    admin: "系统管理员",
    data_admin: "数据管理员",
    kb_admin: "知识库管理员",
    advisor: "报考顾问"
  };

  return labels[role];
}
