"use client";

import { useEffect, useState } from "react";
import { GripVertical, RefreshCcw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { checkPolicy, generateRecommendations } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import { formatNumber } from "@/lib/utils";
import type { GeneratedRecommendationItem, PolicyCheckResponse, RiskLevel } from "@/types/domain";

const riskVariant = {
  冲: "warning",
  稳: "success",
  保: "default",
  兜底: "muted",
  待评估: "outline"
} as const;

export default function PlanPage() {
  const [items, setItems] = useState<GeneratedRecommendationItem[]>([]);
  const [batch, setBatch] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [policyResult, setPolicyResult] = useState<PolicyCheckResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  async function loadPlanCandidates() {
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
        limit: 48,
        onlyEligible: true
      });
      setItems(result.items);
      setBatch(result.batch ?? null);
      setWarnings(result.warnings);
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案候选加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlanCandidates();
  }, []);

  async function handlePolicyCheck() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }
    if (!batch) {
      setError("当前推荐结果没有批次信息，无法进行规则校验。");
      return;
    }
    if (!items.length) {
      setError("当前没有可校验的院校专业组。");
      return;
    }

    setIsChecking(true);
    setError("");
    try {
      const result = await checkPolicy({
        token: session.token,
        batch,
        groupItems: items.map((item, index) => ({
          group_id: item.group_id,
          order: index + 1
        }))
      });
      setPolicyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "规则校验失败");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <AppShell portal="user" title="志愿方案" description="基于推荐候选生成院校专业组草案，并做二次规则校验">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{batch ? `${batch}方案草案` : "方案草案"}</CardTitle>
                <CardDescription>当前按推荐引擎排序生成候选，后续可扩展手动调序和保存方案</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={loadPlanCandidates} disabled={isLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  {isLoading ? "加载中..." : "刷新候选"}
                </Button>
                <Button variant="outline" onClick={handlePolicyCheck} disabled={isChecking || isLoading || items.length === 0}>
                  <ShieldCheck className="h-4 w-4" />
                  {isChecking ? "校验中..." : "二次校验"}
                </Button>
                <Button disabled>导出方案</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {warnings.length ? (
              <div className="grid gap-2 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
                {warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
            {isLoading ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载推荐候选...</div>
            ) : null}
            {!isLoading && items.length === 0 ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                暂无方案候选，请先维护考生画像并导入院校专业组、招生计划和历年录取数据。
              </div>
            ) : null}
            {items.map((item, index) => (
              <div key={item.group_id} className="flex gap-3 rounded-md border border-border p-4">
                <div className="mt-1 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">志愿 {index + 1}</div>
                      <div className="font-medium">{item.school_name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.group_name}（{item.group_code}） · {item.subject_track} · {item.city || "-"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={riskVariant[item.risk_level as RiskLevel]}>{item.risk_level}</Badge>
                      <Badge variant={item.suggested_adjustment ? "success" : "warning"}>
                        {item.suggested_adjustment ? "建议服从调剂" : "谨慎不服从"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <div>计划数：{formatNumber(item.plan_count)}</div>
                    <div>历史最低位次：{formatNumber(item.historical_min_rank)}</div>
                    <div>匹配分：{item.match_score}</div>
                  </div>
                  {item.majors.length ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.majors.map((major) => (
                        <Badge key={major} variant="outline">
                          {major}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {item.reasons.length ? <p className="mt-3 text-sm text-muted-foreground">{item.reasons[0]}</p> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>规则校验</CardTitle>
            <CardDescription>校验批次、选科、志愿数量和专业组可报性</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!policyResult ? (
              <div className="rounded-md border border-border px-3 py-8 text-center text-muted-foreground">点击二次校验后查看规则结果</div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>校验结果</span>
                  <Badge variant={policyResult.passed ? "success" : "danger"}>{policyResult.passed ? "通过" : "未通过"}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>志愿数量</span>
                  <span>
                    {policyResult.checked_group_count}/{policyResult.max_groups}
                  </span>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="font-medium">平行志愿原则</div>
                  <div className="mt-1 text-muted-foreground">{policyResult.parallel_volunteer_rule}</div>
                </div>
                {policyResult.errors.length ? (
                  <div className="rounded-md bg-red-50 p-3 text-red-700">
                    <div className="font-medium">错误</div>
                    <ul className="mt-2 space-y-1">
                      {policyResult.errors.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {policyResult.warnings.length ? (
                  <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                    <div className="font-medium">提示</div>
                    <ul className="mt-2 space-y-1">
                      {policyResult.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {policyResult.group_results.length ? (
                  <div className="rounded-md border border-border p-3">
                    <div className="font-medium">专业组校验</div>
                    <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                      {policyResult.group_results.map((result) => (
                        <div key={`${result.group_id}-${result.order ?? ""}`} className="rounded border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {result.order}. {result.school_name || "未知院校"} {result.group_name || ""}
                            </span>
                            <Badge variant={result.passed ? "success" : "danger"}>{result.passed ? "通过" : "未通过"}</Badge>
                          </div>
                          {[...result.errors, ...result.warnings].length ? (
                            <div className="mt-1 text-muted-foreground">{[...result.errors, ...result.warnings].join("；")}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-md border border-border p-3">
                  <div className="font-medium">规则说明</div>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {policyResult.explanations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
