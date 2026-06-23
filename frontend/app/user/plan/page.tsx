"use client";

import { GripVertical } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockRecommendations } from "@/lib/mock-data";

export default function PlanPage() {
  return (
    <AppShell portal="user" title="志愿方案" description="生成 48 个院校专业组志愿草案，并支持手动调整顺序">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>本科批方案草案</CardTitle>
              <CardDescription>当前展示候选数据，后续接入拖拽排序和二次校验</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">二次校验</Button>
              <Button>导出方案</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockRecommendations.map((item, index) => (
            <div key={item.id} className="flex gap-3 rounded-md border border-border p-4">
              <div className="mt-1 text-muted-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">志愿 {index + 1}</div>
                    <div className="font-medium">{item.schoolName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.majorGroupName}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{item.riskLevel}</Badge>
                    <Badge variant={item.suggestedAdjustment ? "success" : "warning"}>
                      {item.suggestedAdjustment ? "建议服从调剂" : "谨慎不服从"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.majors.map((major) => (
                    <Badge key={major} variant="outline">
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
