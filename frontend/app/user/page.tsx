"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, ClipboardList, GraduationCap, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskDistribution } from "@/components/charts/risk-distribution";
import { RankTrend } from "@/components/charts/rank-trend";
import { getStoredSession } from "@/lib/auth-store";
import { getMyProfile } from "@/lib/api";
import { mockRecommendations } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import type { StudentProfile } from "@/types/domain";

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

export default function UserDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const session = getStoredSession();
      if (!session) {
        setError("登录状态已失效，请重新登录。");
        setIsLoading(false);
        return;
      }

      try {
        setProfile(await getMyProfile(session.token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "画像加载失败");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <AppShell portal="user" title="用户端总览" description="从画像、匹配、推荐到志愿方案的完整报考闭环">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>考生画像</CardTitle>
            <CardDescription>当前画像来自 `/api/profile/me`，会作为规则校验和推荐排序的输入</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {isLoading ? <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载画像...</div> : null}

            {profile ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-border p-4">
                    <div className="text-sm text-muted-foreground">成绩</div>
                    <div className="mt-2 text-2xl font-semibold">{valueOrDash(profile.score)}</div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="text-sm text-muted-foreground">全省位次</div>
                    <div className="mt-2 text-2xl font-semibold">{profile.rank ? formatNumber(profile.rank) : "-"}</div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="text-sm text-muted-foreground">科类</div>
                    <div className="mt-2 text-2xl font-semibold">{valueOrDash(profile.subject_track)}</div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="text-sm text-muted-foreground">目标批次</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {profile.targetBatches.length ? (
                        profile.targetBatches.map((batch) => <Badge key={batch}>{batch}</Badge>)
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      选科
                    </div>
                    <p className="text-sm text-muted-foreground">{profile.selectedSubjects.join("、") || "-"}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      地域偏好
                    </div>
                    <p className="text-sm text-muted-foreground">{profile.cityPreferences.join("、") || "-"}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      专业偏好
                    </div>
                    <p className="text-sm text-muted-foreground">{profile.majorPreferences.join("、") || "-"}</p>
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/user/profile">
                  编辑画像
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/user/recommend">查看推荐</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/user/chat">
                  <Bot className="h-4 w-4" />
                  咨询 Agent
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>位次趋势示意</CardTitle>
            <CardDescription>用于展示图表组件，真实数据接入后按院校专业组维度展示</CardDescription>
          </CardHeader>
          <CardContent>
            <RankTrend />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>冲稳保分布</CardTitle>
            <CardDescription>当前推荐候选池按风险标签统计</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDistribution items={mockRecommendations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期推荐</CardTitle>
            <CardDescription>每条推荐必须带原因、风险和来源</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockRecommendations.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-md border border-border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{item.schoolName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.majorGroupName} · {item.city}
                    </div>
                  </div>
                  <Badge variant={item.riskLevel === "冲" ? "warning" : item.riskLevel === "稳" ? "success" : "default"}>
                    {item.riskLevel}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.reasons[0]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
