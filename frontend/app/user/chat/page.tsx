"use client";

import { SendHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { mockChat } from "@/lib/mock-data";

export default function ChatPage() {
  return (
    <AppShell portal="user" title="智能问答" description="Agent 通过 LangGraph 编排节点、调用工具并引用知识库">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>报考咨询</CardTitle>
            <CardDescription>真实接口会使用 SSE 流式返回，并保存节点路径、工具调用和引用来源</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockChat.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "ml-auto max-w-2xl rounded-md bg-primary p-4 text-primary-foreground" : "max-w-3xl rounded-md border border-border bg-muted/40 p-4"}
                >
                  <p className="text-sm leading-7">{message.content}</p>
                  {message.citations ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.citations.map((citation) => (
                        <Badge key={citation} variant="outline">
                          {citation}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-border bg-background p-3">
              <Textarea defaultValue="我物理类 568 分，位次 58620，想学计算机，省内优先，帮我分析本科批怎么报。" />
              <div className="mt-3 flex justify-end">
                <Button>
                  <SendHorizontal className="h-4 w-4" />
                  发送
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LangGraph 编排</CardTitle>
            <CardDescription>节点负责状态流转，工具负责数据与规则判断</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">节点</div>
              {[
                "intent_node",
                "profile_check_node",
                "policy_check_node",
                "knowledge_retrieval_node",
                "recommendation_node",
                "explain_node"
              ].map((node) => (
                <div key={node} className="mb-2 rounded-md border border-border px-3 py-2 font-mono text-xs">
                  {node}
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">工具</div>
              {["check_policy_rules", "search_school_groups", "recommend_chong_wen_bao", "search_knowledge_base"].map((tool) => (
                <div key={tool} className="mb-2 rounded-md border border-border px-3 py-2 font-mono text-xs">
                  {tool}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
