"use client";

import { FormEvent, useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getStoredSession } from "@/lib/auth-store";
import { sendAgentMessage } from "@/lib/api";
import type { AgentCitation, AgentEvent, AgentToolCall } from "@/types/domain";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AgentCitation[];
  events?: AgentEvent[];
  toolCalls?: AgentToolCall[];
};

const initialPrompt = "我物理类 568 分，位次 58620，想学计算机，省内优先，帮我分析本科批怎么报。";

function formatEvent(event: AgentEvent) {
  if (event.node) {
    return `${event.type}: ${event.node}${event.intent ? ` / ${event.intent}` : ""}`;
  }

  if (event.tool) {
    return `${event.type}: ${event.tool}`;
  }

  return event.type;
}

function summarizeToolResult(result: unknown) {
  if (result === null || result === undefined) {
    return "无返回摘要";
  }

  if (typeof result === "string") {
    return result;
  }

  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export default function ChatPage() {
  const [message, setMessage] = useState(initialPrompt);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [threadId, setThreadId] = useState<string | undefined>();
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      content: "请描述你的分数、位次、选科、目标批次和偏好。涉及政策或推荐结论时，我会尽量给出依据。"
    }
  ]);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const latestTrace = useMemo(() => {
    return [...entries].reverse().find((entry) => entry.role === "assistant" && (entry.events?.length || entry.toolCalls?.length));
  }, [entries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) {
      return;
    }

    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    const userEntry: ChatEntry = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };

    setEntries((current) => [...current, userEntry]);
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const response = await sendAgentMessage({
        token: session.token,
        message: trimmed,
        conversationId,
        threadId
      });

      setConversationId(response.conversation_id);
      setThreadId(response.thread_id);
      setEntries((current) => [
        ...current,
        {
          id: `assistant-${response.thread_id}-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          citations: response.citations,
          events: response.events,
          toolCalls: response.tool_calls
        }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败，请稍后重试。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppShell portal="user" title="智能问答" description="围绕成绩、位次、选科、批次和偏好进行报考咨询">
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>报考咨询</CardTitle>
            <CardDescription>回答会优先呈现可追溯的依据，无法确认的信息以官方发布为准</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.role === "user"
                      ? "ml-auto max-w-2xl rounded-md bg-primary p-4 text-primary-foreground"
                      : "max-w-3xl rounded-md border border-border bg-muted/40 p-4"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-7">{entry.content}</p>
                  {entry.citations?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.citations.map((citation, index) => (
                        <Badge key={`${citation.source_title}-${index}`} variant="outline">
                          {citation.source_title}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <form className="mt-6 rounded-md border border-border bg-background p-3" onSubmit={handleSubmit}>
              <Textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={isSending} />
              {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {threadId ? `会话线程：${threadId}` : "新会话"}
                </div>
                <Button type="submit" disabled={isSending || !message.trim()}>
                  <SendHorizontal className="h-4 w-4" />
                  {isSending ? "发送中..." : "发送"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>执行追踪</CardTitle>
            <CardDescription>记录节点路径、工具调用和引用来源</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">节点事件</div>
              {latestTrace?.events?.length ? (
                latestTrace.events.map((event, index) => (
                  <div key={`${event.type}-${index}`} className="mb-2 rounded-md border border-border px-3 py-2 font-mono text-xs">
                    {formatEvent(event)}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">等待首次 Agent 执行</div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">工具调用</div>
              {latestTrace?.toolCalls?.length ? (
                latestTrace.toolCalls.map((toolCall, index) => (
                  <div key={`${toolCall.tool_name}-${index}`} className="mb-2 rounded-md border border-border px-3 py-2">
                    <div className="font-mono text-xs">{toolCall.tool_name}</div>
                    <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{summarizeToolResult(toolCall.result)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">暂无工具调用</div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">引用来源</div>
              {latestTrace?.citations?.length ? (
                latestTrace.citations.map((citation, index) => (
                  <div key={`${citation.source_title}-${index}`} className="mb-2 rounded-md border border-border px-3 py-2 text-xs">
                    <div className="font-medium">{citation.source_title}</div>
                    <div className="mt-1 text-muted-foreground">{citation.source_type}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">暂无引用来源</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
