"use client";

import { AppShell } from "@/components/layout/app-shell";
import { RankTrend } from "@/components/charts/rank-trend";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockRecommendations, mockSchools } from "@/lib/mock-data";

export default function UniversityDetailPage() {
  const school = mockSchools[0];

  return (
    <AppShell portal="user" title={school.name} description="院校详情、专业组、历年位次和招生章程引用">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>院校概况</CardTitle>
            <CardDescription>{school.website}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{school.tier}</Badge>
              <Badge variant="outline">{school.type}</Badge>
              <Badge variant="muted">{school.city}</Badge>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{school.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>历年位次趋势</CardTitle>
            <CardDescription>后续按院校专业组展示真实趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <RankTrend />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>相关专业组</CardTitle>
          <CardDescription>专业组详情会展示选科要求、计划数、专业、学费和风险提示</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {mockRecommendations.slice(0, 2).map((item) => (
            <div key={item.id} className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.majorGroupName}</div>
                <Badge>{item.riskLevel}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">计划数 {item.planCount} · 历史最低位次 {item.historicalMinRank}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {item.majors.map((major) => (
                  <Badge key={major} variant="outline">
                    {major}
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
