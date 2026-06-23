"use client";

import Link from "next/link";
import { ArrowRight, Database, LibraryBig, MessagesSquare, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAdminMetrics, mockKnowledgeDocuments } from "@/lib/mock-data";

const quickLinks = [
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/data-import", label: "数据导入", icon: Database },
  { href: "/admin/knowledge", label: "知识库", icon: LibraryBig },
  { href: "/admin/chat-logs", label: "对话日志", icon: MessagesSquare }
];

export default function AdminDashboardPage() {
  return (
    <AppShell portal="admin" title="管理首页" description="管理账号、招生数据、知识库和 Agent 运营状态">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockAdminMetrics.map((metric) => (
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
            {mockKnowledgeDocuments.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{doc.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {doc.sourceOrg} · {doc.year} · chunk {doc.chunks}
                  </div>
                </div>
                <Badge variant={doc.status === "published" ? "success" : doc.status === "archived" ? "muted" : "warning"}>
                  {doc.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
