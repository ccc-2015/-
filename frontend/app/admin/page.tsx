"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Database, LibraryBig, MessagesSquare, RefreshCcw, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminDashboard } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import type { AdminDashboard } from "@/types/domain";

const quickLinks = [
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/data-import", label: "数据导入", icon: Database },
  { href: "/admin/knowledge", label: "知识库", icon: LibraryBig },
  { href: "/admin/chat-logs", label: "对话日志", icon: MessagesSquare }
];

function statusVariant(status: string) {
  if (status === "published") {
    return "success" as const;
  }
  if (status === "archived") {
    return "muted" as const;
  }
  return "warning" as const;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setDashboard(await getAdminDashboard(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "管理首页数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <AppShell portal="admin" title="管理首页" description="管理账号、招生数据、知识库和 Agent 运营状态">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={loadDashboard} disabled={isLoading}>
          <RefreshCcw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(dashboard?.metrics ?? []).map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
        {isLoading && !dashboard ? (
          <Card className="md:col-span-2 xl:col-span-4">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">正在加载管理指标...</CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>高频管理动作</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} asChild variant="outline" className="justify-between">
                  <Link href={item.href}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>知识库状态</CardTitle>
            <CardDescription>只有 published 状态内容可以被 Agent 正式引用</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!dashboard?.knowledge_documents.length ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                暂无知识库文档。
              </div>
            ) : (
              dashboard.knowledge_documents.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {doc.source_type ?? "未标记来源"} · v{doc.version} · chunk {doc.chunk_count} · {formatDate(doc.updated_at)}
                    </div>
                  </div>
                  <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
