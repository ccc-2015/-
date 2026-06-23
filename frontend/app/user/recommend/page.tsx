"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStoredSession } from "@/lib/auth-store";
import { generateRecommendations } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { GeneratedRecommendationItem, RiskLevel } from "@/types/domain";

const riskVariant = {
  冲: "warning",
  稳: "success",
  保: "default",
  兜底: "muted",
  待评估: "outline"
} as const;

export default function RecommendPage() {
  const [items, setItems] = useState<GeneratedRecommendationItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [batch, setBatch] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadRecommendations() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const result = await generateRecommendations({
        token: session.token,
        batch: batch ?? undefined,
        limit: 30,
        onlyEligible: true
      });
      setBatch(result.batch ?? null);
      setItems(result.items);
      setWarnings(result.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "推荐生成失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell portal="user" title="推荐结果" description="按位次、选科、偏好和招生计划生成冲稳保候选">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>院校专业组候选</CardTitle>
              <CardDescription>
                每条推荐包含风险等级、历史位次、计划数、理由和来源{batch ? ` · 当前批次：${batch}` : ""}
              </CardDescription>
            </div>
            <Button onClick={loadRecommendations} disabled={isLoading}>
              {isLoading ? "生成中..." : "重新生成推荐"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {warnings.length ? (
            <div className="mb-4 grid gap-2 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>风险</TableHead>
                <TableHead>院校专业组</TableHead>
                <TableHead>批次</TableHead>
                <TableHead>历史最低位次</TableHead>
                <TableHead>计划数</TableHead>
                <TableHead>匹配</TableHead>
                <TableHead>理由</TableHead>
                <TableHead>来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.group_id}>
                  <TableCell>
                    <Badge variant={riskVariant[item.risk_level as RiskLevel]}>{item.risk_level}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.school_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.group_name}（{item.group_code}）
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.city || "-"} · {item.subject_track} · 选科要求 {item.subject_requirements || "不限"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{item.batch}</div>
                    <div className="text-xs text-muted-foreground">{item.year}</div>
                  </TableCell>
                  <TableCell>
                    <div>{formatNumber(item.historical_min_rank)}</div>
                    {item.rank_gap !== null && item.rank_gap !== undefined ? (
                      <div className="text-xs text-muted-foreground">位次差 {formatNumber(item.rank_gap)}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatNumber(item.plan_count)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{item.match_score} 分</div>
                    <div className="text-xs text-muted-foreground">风险 {item.admission_risk_score}</div>
                    {item.suggested_adjustment ? <div className="text-xs text-muted-foreground">接受调剂</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="grid max-w-sm gap-1 text-xs text-muted-foreground">
                      {item.reasons.slice(0, 3).map((reason) => (
                        <div key={reason}>{reason}</div>
                      ))}
                      {item.warnings.slice(0, 2).map((warning) => (
                        <div key={warning} className="text-amber-700">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">{item.sources.join("、")}</div>
                    {item.majors.length ? (
                      <div className="mt-2 flex max-w-xs flex-wrap gap-1">
                        {item.majors.slice(0, 3).map((major) => (
                          <Badge key={major} variant="outline">
                            {major}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && items.length === 0 ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
              暂无推荐结果，请先维护考生画像并导入院校专业组、招生计划和历年录取数据。
            </div>
          ) : null}
          {isLoading ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在生成推荐...</div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
