"use client";

import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reports = [
  { id: "r1", title: "本科批志愿分析报告", status: "已生成", updatedAt: "2026-06-20 15:20" },
  { id: "r2", title: "专科批兜底方案报告", status: "草稿", updatedAt: "2026-06-20 15:12" }
];

export default function ReportsPage() {
  return (
    <AppShell portal="user" title="报告" description="生成网页报告、PDF 或表格，用于家庭讨论和人工复核">
      <Card>
        <CardHeader>
          <CardTitle>报告列表</CardTitle>
          <CardDescription>报告需要保留数据版本、政策引用和免责声明</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{report.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{report.updatedAt}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={report.status === "已生成" ? "success" : "muted"}>{report.status}</Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  下载
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
