"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminUsers } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import { roleLabel } from "@/lib/permissions";
import type { AdminUser } from "@/types/domain";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadUsers() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setUsers(await listAdminUsers(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "用户列表加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <AppShell portal="admin" title="用户管理" description="管理用户账号、状态、角色和密码重置">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>账号列表</CardTitle>
              <CardDescription>来自 `/api/admin/users` 的真实本地账号</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {isLoading ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载用户列表...</div>
          ) : users.length === 0 ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">暂无用户账号。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>账号</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.display_name}</TableCell>
                    <TableCell>
                      <div>{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.phone ?? "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {roleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "success" : "muted"}>{user.is_active ? "启用" : "停用"}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
