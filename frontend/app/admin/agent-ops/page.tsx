"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAgentOps } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import type { AdminAgentOps } from "@/types/domain";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function AgentOpsPage() {
  const [ops, setOps] = useState<AdminAgentOps | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadOps() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setOps(await getAdminAgentOps(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent 运营数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOps();
  }, []);

  return (
    <AppShell portal="admin" title="Agent 运营" description="查看 LangGraph 节点、工具可用性、模型配置和命中来源分析">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={loadOps} disabled={isLoading}>
          <RefreshCcw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        {(ops?.metrics ?? []).map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle>{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>节点运行</CardTitle>
            <CardDescription>按运行次数倒序展示 LangGraph 节点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && !ops ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载节点数据...</div>
            ) : !ops?.nodes.length ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">暂无节点运行记录。</div>
            ) : (
              ops.nodes.map((node) => (
                <div key={node.name} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-mono text-sm font-medium">{node.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">最后运行：{formatDate(node.last_run_at)}</div>
                    </div>
                    <Badge variant={node.failure_count > 0 ? "warning" : "success"}>
                      {node.success_count}/{node.run_count} 成功
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>工具调用</CardTitle>
            <CardDescription>按调用次数倒序展示 Agent 工具</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && !ops ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载工具数据...</div>
            ) : !ops?.tools.length ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">暂无工具调用记录。</div>
            ) : (
              ops.tools.map((tool) => (
                <div key={tool.name} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-mono text-sm font-medium">{tool.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">最后调用：{formatDate(tool.last_called_at)}</div>
                    </div>
                    <Badge>{tool.call_count} 次</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
