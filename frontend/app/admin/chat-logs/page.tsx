"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const logs = [
  { id: "c1", user: "李同学", intent: "推荐本科批", tools: ["get_student_profile", "recommend_chong_wen_bao"], citations: 3 },
  { id: "c2", user: "张家长", intent: "政策问答", tools: ["search_knowledge_base"], citations: 2 }
];

export default function ChatLogsPage() {
  return (
    <AppShell portal="admin" title="对话日志" description="查看 Agent 问答、LangGraph 节点路径、工具调用和引用来源">
      <Card>
        <CardHeader>
          <CardTitle>会话记录</CardTitle>
          <CardDescription>隐私数据需要按角色脱敏和授权查看</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{log.user}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{log.intent}</div>
                </div>
                <Badge>{log.citations} 条引用</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {log.tools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
