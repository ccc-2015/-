"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const majors = [
  { name: "计算机科学与技术", code: "080901", category: "工学", level: "本科" },
  { name: "软件工程", code: "080902", category: "工学", level: "本科" },
  { name: "计算机网络技术", code: "510202", category: "电子与信息大类", level: "专科" }
];

export default function AdminMajorsPage() {
  return (
    <AppShell portal="admin" title="专业管理" description="维护专业目录、专业代码、层次和院校专业组关联">
      <Card>
        <CardHeader>
          <CardTitle>专业目录</CardTitle>
          <CardDescription>专业名称变更需要做别名和历史映射</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {majors.map((major) => (
            <div key={major.code} className="rounded-md border border-border p-4">
              <div className="font-medium">{major.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{major.code}</div>
              <div className="mt-3 flex gap-2">
                <Badge>{major.level}</Badge>
                <Badge variant="outline">{major.category}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
