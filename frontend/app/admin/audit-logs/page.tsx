"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminAuditLogs } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import type { AdminAuditLog } from "@/types/domain";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadLogs() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setLogs(await listAdminAuditLogs(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "审计日志加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <AppShell portal="admin" title="审计日志" description="高风险操作必须记录操作者、时间、对象和变更内容">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>操作记录</CardTitle>
              <CardDescription>基于本地已有用户、导入、知识库、Agent 和报告记录生成只读时间线</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {isLoading ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载审计日志...</div>
          ) : logs.length === 0 ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">暂无审计日志。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>对象</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(log.time)}</TableCell>
                    <TableCell>{log.actor}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.target}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">{log.detail ?? "-"}</TableCell>
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
