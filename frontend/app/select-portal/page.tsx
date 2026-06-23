"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/auth-store";
import { getAvailablePortals, roleLabel } from "@/lib/permissions";
import type { CurrentUser, Portal } from "@/types/domain";

const portalMeta: Record<Portal, { title: string; description: string; href: string }> = {
  user: {
    title: "用户端",
    description: "维护考生画像，生成志愿方案，使用智能问答。",
    href: "/user"
  },
  admin: {
    title: "管理端",
    description: "管理账号、招生数据、知识库、Agent 运营和审计日志。",
    href: "/admin"
  }
};

export default function SelectPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }

    setUser(stored);
  }, [router]);

  if (!user) {
    return null;
  }

  const portals = getAvailablePortals(user);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">选择进入端</h1>
          <p className="mt-2 text-sm text-muted-foreground">后端返回角色后，前端只展示你有权限进入的入口。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <Badge key={role} variant="outline">
                {roleLabel(role)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {portals.map((portal) => {
            const meta = portalMeta[portal];
            return (
              <Card key={portal}>
                <CardHeader>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <CardTitle>{meta.title}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => router.push(meta.href)}>
                    进入{meta.title}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
