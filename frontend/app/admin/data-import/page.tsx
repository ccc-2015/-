"use client";

import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const steps = ["上传文件", "预览前 N 行", "字段映射", "格式校验", "重复检测", "确认入库", "质量报告"];
const templates = ["院校基础信息", "专业基础信息", "院校专业组", "招生计划", "历年投档线", "一分一段表", "批次控制线"];

export default function DataImportPage() {
  return (
    <AppShell portal="admin" title="数据导入" description="Excel/CSV 上传、预览、映射、校验、入库和质量报告">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>上传数据文件</CardTitle>
            <CardDescription>建议每类数据维护固定模板，降低清洗成本</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-6 text-center">
              <UploadCloud className="h-10 w-10 text-primary" />
              <p className="mt-3 text-sm font-medium">拖拽 Excel/CSV 到此处</p>
              <p className="mt-1 text-xs text-muted-foreground">支持招生计划、历年投档线、一分一段表等数据</p>
              <Button className="mt-4">选择文件</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导入流程</CardTitle>
            <CardDescription>所有导入任务生成日志和质量报告</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-md border border-border p-4">
                <div className="text-sm text-muted-foreground">Step {index + 1}</div>
                <div className="mt-1 font-medium">{step}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>支持模板</CardTitle>
          <CardDescription>一期先覆盖普通本科批和普通高职（专科）批需要的数据</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <Badge key={template} variant="outline">
              {template}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
