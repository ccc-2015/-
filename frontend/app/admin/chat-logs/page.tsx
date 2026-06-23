"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, RefreshCcw, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminAgentConversation, listAdminAgentConversations } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import type { AdminAgentConversationDetail, AdminAgentConversationSummary } from "@/types/domain";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function preview(value?: string | null) {
  if (!value) {
    return "未命名会话";
  }
  return value.length > 64 ? `${value.slice(0, 64)}...` : value;
}

function jsonPreview(value: unknown) {
  if (!value) {
    return "-";
  }
  return JSON.stringify(value, null, 2);
}

export default function ChatLogsPage() {
  const [conversations, setConversations] = useState<AdminAgentConversationSummary[]>([]);
  const [selected, setSelected] = useState<AdminAgentConversationDetail | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) {
      return conversations;
    }
    return conversations.filter((item) => {
      return [item.title, item.username, item.display_name, item.thread_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [conversations, keyword]);

  async function loadConversations(nextSelectedId?: number) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await listAdminAgentConversations(session.token);
      setConversations(data);
      const targetId = nextSelectedId ?? selected?.id ?? data[0]?.id;
      if (targetId) {
        await loadConversationDetail(targetId, session.token);
      } else {
        setSelected(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "对话日志加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadConversationDetail(conversationId: number, token?: string) {
    const session = token ? { token } : getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    setIsDetailLoading(true);
    setError("");
    try {
      const detail = await getAdminAgentConversation({ token: session.token, conversationId });
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会话详情加载失败");
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <AppShell portal="admin" title="对话日志" description="查看 Agent 问答、LangGraph 节点路径、工具调用和引用来源">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>会话数</CardDescription>
              <CardTitle>{conversations.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>消息数</CardDescription>
              <CardTitle>{conversations.reduce((sum, item) => sum + item.message_count, 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>工具调用</CardDescription>
              <CardTitle>{conversations.reduce((sum, item) => sum + item.tool_call_count, 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>引用来源</CardDescription>
              <CardTitle>{conversations.reduce((sum, item) => sum + item.citation_count, 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>会话记录</CardTitle>
                  <CardDescription>按最近会话倒序展示，最多加载 50 条</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadConversations()} disabled={isLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索用户、标题或 thread"
                />
              </div>

              {isLoading ? (
                <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  正在加载对话日志...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无对话日志。
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => loadConversationDetail(item.id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted ${
                        selected?.id === item.id ? "border-primary bg-primary/5" : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{preview(item.title)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.display_name} · {formatDate(item.last_message_at ?? item.created_at)}
                          </div>
                        </div>
                        <Badge variant="outline">#{item.id}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="muted">{item.message_count} 消息</Badge>
                        <Badge variant="muted">{item.tool_call_count} 工具</Badge>
                        <Badge variant="muted">{item.citation_count} 引用</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>会话详情</CardTitle>
              <CardDescription>
                {selected ? `${selected.display_name} · thread ${selected.thread_id ?? "-"}` : "选择一条会话查看完整轨迹"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isDetailLoading ? (
                <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  正在加载会话详情...
                </div>
              ) : !selected ? (
                <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无可查看会话。
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <MessageSquareText className="h-4 w-4" />
                      消息
                    </div>
                    <div className="space-y-2">
                      {selected.messages.map((message) => (
                        <div key={message.id} className="rounded-md border border-border p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <Badge variant={message.role === "assistant" ? "success" : "outline"}>{message.role}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 text-sm font-medium">工具调用</div>
                    <div className="space-y-2">
                      {selected.tool_calls.length === 0 ? (
                        <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">无工具调用</div>
                      ) : (
                        selected.tool_calls.map((call) => (
                          <div key={call.id} className="rounded-md border border-border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <Badge>{call.tool_name}</Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(call.created_at)}</span>
                            </div>
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs leading-5">
                              {jsonPreview(call.arguments)}
                            </pre>
                            {call.result_summary ? (
                              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{call.result_summary}</p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 text-sm font-medium">引用来源</div>
                    <div className="space-y-2">
                      {selected.citations.length === 0 ? (
                        <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">无引用来源</div>
                      ) : (
                        selected.citations.map((citation) => (
                          <div key={citation.id} className="rounded-md border border-border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{citation.source_type}</Badge>
                              <span className="text-sm font-medium">{citation.source_title}</span>
                            </div>
                            {citation.source_url ? <div className="mt-1 break-all text-xs text-muted-foreground">{citation.source_url}</div> : null}
                            <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs leading-5">
                              {jsonPreview(citation.metadata_json)}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 text-sm font-medium">节点轨迹</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.node_runs.length === 0 ? (
                        <span className="text-sm text-muted-foreground">暂无节点记录</span>
                      ) : (
                        selected.node_runs.map((run) => (
                          <Badge key={run.id} variant={run.status === "success" ? "success" : "warning"}>
                            {run.node_name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
