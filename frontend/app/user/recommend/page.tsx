"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockRecommendations } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

const riskVariant = {
  冲: "warning",
  稳: "success",
  保: "default",
  兜底: "muted"
} as const;

export default function RecommendPage() {
  return (
    <AppShell portal="user" title="推荐结果" description="按位次、选科、偏好和招生计划生成冲稳保候选">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>院校专业组候选</CardTitle>
              <CardDescription>每条推荐包含风险等级、历史位次、计划数、理由和来源</CardDescription>
            </div>
            <Button>重新生成推荐</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>风险</TableHead>
                <TableHead>院校专业组</TableHead>
                <TableHead>批次</TableHead>
                <TableHead>历史最低位次</TableHead>
                <TableHead>计划数</TableHead>
                <TableHead>推荐专业</TableHead>
                <TableHead>来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecommendations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={riskVariant[item.riskLevel]}>{item.riskLevel}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.schoolName}</div>
                    <div className="text-xs text-muted-foreground">{item.majorGroupName}</div>
                  </TableCell>
                  <TableCell>{item.batch}</TableCell>
                  <TableCell>{formatNumber(item.historicalMinRank)}</TableCell>
                  <TableCell>{item.planCount}</TableCell>
                  <TableCell>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {item.majors.map((major) => (
                        <Badge key={major} variant="outline">
                          {major}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">{item.sources.join("、")}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
