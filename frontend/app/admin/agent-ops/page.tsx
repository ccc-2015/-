"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  { name: "intent_node", type: "LangGraph 节点", status: "enabled" },
  { name: "profile_check_node", type: "LangGraph 节点", status: "enabled" },
  { name: "policy_check_node", type: "LangGraph 节点", status: "enabled" },
  { name: "knowledge_retrieval_node", type: "LangGraph 节点", status: "enabled" },
  { name: "recommend_chong_wen_bao", type: "工具", status: "enabled" },
  { name: "generate_report", type: "工具", status: "disabled" }
];

export default function AgentOpsPage() {
  return (
    <AppShell portal="admin" title="Agent 运营" description="查看 LangGraph 节点、工具可用性、模型配置和命中来源分析">
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Card key={tool.name}>
            <CardHeader>
              <CardTitle className="font-mono text-base">{tool.name}</CardTitle>
              <CardDescription>{tool.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={tool.status === "enabled" ? "success" : "muted"}>{tool.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
