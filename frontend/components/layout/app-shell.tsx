"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  ClipboardList,
  Database,
  FileText,
  GraduationCap,
  Home,
  LibraryBig,
  LogOut,
  MessagesSquare,
  School,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clearStoredUser, getStoredSession, storeSession } from "@/lib/auth-store";
import { getCurrentUser } from "@/lib/api";
import { canAccessPortal, roleLabel } from "@/lib/permissions";
import type { CurrentUser, Portal } from "@/types/domain";

const userNav = [
  { href: "/user", label: "总览", icon: Home },
  { href: "/user/profile", label: "考生画像", icon: GraduationCap },
  { href: "/user/chat", label: "智能问答", icon: MessagesSquare },
  { href: "/user/recommend", label: "推荐结果", icon: BarChart3 },
  { href: "/user/universities", label: "院校专业", icon: School },
  { href: "/user/plan", label: "志愿方案", icon: ClipboardList },
  { href: "/user/reports", label: "报告", icon: FileText }
];

const adminNav = [
  { href: "/admin", label: "管理首页", icon: Home },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/roles", label: "角色权限", icon: ShieldCheck },
  { href: "/admin/data-import", label: "数据导入", icon: Database },
  { href: "/admin/universities", label: "院校管理", icon: School },
  { href: "/admin/majors", label: "专业管理", icon: BookOpenCheck },
  { href: "/admin/score-lines", label: "分数线", icon: BarChart3 },
  { href: "/admin/knowledge", label: "知识库", icon: LibraryBig },
  { href: "/admin/agent-ops", label: "Agent 运营", icon: Bot },
  { href: "/admin/chat-logs", label: "对话日志", icon: MessagesSquare },
  { href: "/admin/audit-logs", label: "审计日志", icon: Settings }
];

export function AppShell({
  portal,
  title,
  description,
  children
}: {
  portal: Portal;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = portal === "user" ? userNav : adminNav;
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const session = getStoredSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const freshUser = await getCurrentUser(session.token);

        if (!isMounted) {
          return;
        }

        storeSession({ token: session.token, user: freshUser });

        if (!canAccessPortal(freshUser, portal)) {
          router.replace("/select-portal");
          return;
        }

        setUser(freshUser);
        setIsChecking(false);
      } catch {
        clearStoredUser();
        router.replace("/login");
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [portal, router]);

  function handleLogout() {
    clearStoredUser();
    router.replace("/login");
  }

  if (isChecking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        正在校验登录状态...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-3 py-4 lg:block">
        <Link className="mb-5 flex items-center gap-3 rounded-md px-3 py-2" href={portal === "user" ? "/user" : "/admin"}>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">智能报考 Agent</div>
            <div className="text-xs text-muted-foreground">{portal === "user" ? "用户端" : "管理端"}</div>
          </div>
        </Link>

        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== `/${portal}` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.roles.map((role) => (
                <Badge key={role} variant="outline">
                  {roleLabel(role)}
                </Badge>
              ))}
              <Button variant="outline" size="sm" onClick={() => router.push("/select-portal")}>
                切换入口
              </Button>
              <Button variant="ghost" size="icon" aria-label="退出登录" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
