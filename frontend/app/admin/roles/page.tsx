"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const roles = [
  { role: "admin", label: "系统管理员", permissions: ["admin:users", "admin:data", "admin:knowledge", "admin:agent", "admin:audit"] },
  { role: "data_admin", label: "数据管理员", permissions: ["admin:data"] },
  { role: "kb_admin", label: "知识库管理员", permissions: ["admin:knowledge", "admin:agent"] },
  { role: "student_user", label: "考生用户", permissions: ["user:read_self", "user:write_self"] }
];

export default function AdminRolesPage() {
  return (
    <AppShell portal="admin" title="角色权限" description="RBAC 权限模型，管理端接口必须按权限校验">
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((item) => (
          <Card key={item.role}>
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
              <CardDescription>{item.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {item.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
