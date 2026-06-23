"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storeSession } from "@/lib/auth-store";
import { login } from "@/lib/api";
import { getAvailablePortals } from "@/lib/permissions";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("student");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await login(identifier.trim(), password);
      storeSession(session);
      const user = session.user;
      const portals = getAvailablePortals(user);

      if (portals.length > 1) {
        router.push("/select-portal");
        return;
      }

      router.push(user.defaultPortal === "admin" ? "/admin" : "/user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[520px] flex-col justify-between rounded-lg bg-primary p-8 text-primary-foreground">
          <div>
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-md bg-white/15">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">河南高考智能报考 Agent</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/82">
              面向 2026 年河南普通类考生，围绕本科批和高职（专科）批，提供画像采集、位次匹配、冲稳保推荐、知识库问答和志愿方案生成。
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/78 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-semibold text-white">48</div>
              <div>院校专业组志愿</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">Graph</div>
              <div>LangGraph 编排</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">RBAC</div>
              <div>角色化管理入口</div>
            </div>
          </div>
        </section>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>统一登录</CardTitle>
            <CardDescription>登录后按账号角色进入用户端或管理端</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">账号</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="pl-9" />
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">密码</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </label>

              {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "登录中..." : "登录"}
              </Button>
            </form>

            <div className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
              <div>默认账号：`student` / `123456` 进入用户端</div>
              <div>默认账号：`admin` / `123456` 进入管理端</div>
              <div>需要先启动后端：`python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
