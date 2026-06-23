"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, GripVertical, RefreshCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  checkPolicy,
  checkVolunteerPlan,
  copyVolunteerPlan,
  deleteVolunteerPlan,
  exportVolunteerPlan,
  generateRecommendations,
  listVolunteerPlans,
  saveCurrentVolunteerPlan,
  updateVolunteerPlan
} from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import { formatNumber } from "@/lib/utils";
import type { GeneratedRecommendationItem, PolicyCheckResponse, RiskLevel, VolunteerPlan } from "@/types/domain";

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
  const [savedPlans, setSavedPlans] = useState<VolunteerPlan[]>([]);
  const [savedPlan, setSavedPlan] = useState<VolunteerPlan | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [policyResult, setPolicyResult] = useState<PolicyCheckResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function restoreItemsFromPlan(plan: VolunteerPlan) {
    return plan.items
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((item) => item.snapshot_json as GeneratedRecommendationItem | null)
      .filter((item): item is GeneratedRecommendationItem => Boolean(item));
  }

  function buildPlanPayload(title: string) {
    if (!batch) {
      throw new Error("当前推荐结果没有批次信息。");
    }
    return {
      title,
      batch,
      source: "recommendation",
      metadata: { item_count: items.length, versioned: true },
      items: items.map((item, index) => ({
        group_id: item.group_id,
        order: index + 1,
        risk_level: item.risk_level,
        match_score: item.match_score,
        snapshot: item
      }))
    };
  }

  async function refreshSavedPlans(token: string, nextBatch?: string | null) {
    const plans = await listVolunteerPlans({ token, batch: nextBatch ?? batch ?? undefined });
    setSavedPlans(plans);
    return plans;
  }

  function selectPlan(plan: VolunteerPlan) {
    const restoredItems = restoreItemsFromPlan(plan);
    setSavedPlan(plan);
    setBatch(plan.batch);
    setItems(restoredItems);
    setWarnings(restoredItems.length ? [] : ["已找到保存的方案，但缺少推荐快照，请刷新候选后重新保存。"]);
    setHasUnsavedChanges(false);
    setPolicyResult(null);
  }

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
      const plans = await refreshSavedPlans(session.token);
      const existingPlan = plans[0] ?? null;
      if (existingPlan) {
        selectPlan(existingPlan);
        return;
      }
      const result = await generateRecommendations({
        token: session.token,
        limit: 48,
        onlyEligible: true
      });
      setItems(result.items);
      setBatch(result.batch ?? null);
      setWarnings(result.warnings);
      setSavedPlan(null);
      setHasUnsavedChanges(false);
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案候选加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshRecommendations() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
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
      await refreshSavedPlans(session.token, result.batch ?? null);
      if (savedPlan && result.batch === savedPlan.batch) {
        setHasUnsavedChanges(true);
      } else {
        setSavedPlan(null);
        setHasUnsavedChanges(false);
      }
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案候选加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSavePlan() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }
    if (!batch || !items.length) {
      setError("当前没有可保存的方案。");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const payload = buildPlanPayload(savedPlan ? savedPlan.title : `${batch}志愿方案`);
      const plan = savedPlan
        ? await updateVolunteerPlan({ token: session.token, planId: savedPlan.id, payload })
        : await saveCurrentVolunteerPlan({
            token: session.token,
            payload
          });
      setSavedPlan(plan);
      await refreshSavedPlans(session.token, plan.batch);
      setHasUnsavedChanges(false);
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAsNewVersion() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }
    if (!batch || !items.length) {
      setError("当前没有可另存的方案。");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const versionHint = savedPlans.filter((plan) => plan.batch === batch).length + 1;
      const plan = await saveCurrentVolunteerPlan({
        token: session.token,
        payload: buildPlanPayload(`${batch}志愿方案 V${versionHint}`)
      });
      setSavedPlan(plan);
      await refreshSavedPlans(session.token, plan.batch);
      setHasUnsavedChanges(false);
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案另存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyPlan(plan: VolunteerPlan) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    setIsCopying(true);
    setError("");
    try {
      const copied = await copyVolunteerPlan({ token: session.token, planId: plan.id });
      selectPlan(copied);
      await refreshSavedPlans(session.token, copied.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案复制失败");
    } finally {
      setIsCopying(false);
    }
  }

  async function handleExportPlan() {
    const session = getStoredSession();
    if (!session || !savedPlan) {
      setError("请先保存方案后再导出。");
      return;
    }

    setIsExporting(true);
    setError("");
    try {
      const exported = await exportVolunteerPlan({ token: session.token, planId: savedPlan.id });
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exported.batch}-志愿方案-V${exported.version}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案导出失败");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeletePlan() {
    const session = getStoredSession();
    if (!session || !savedPlan) {
      return;
    }
    if (!window.confirm(`确认删除「${savedPlan.title}」？`)) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await deleteVolunteerPlan({ token: session.token, planId: savedPlan.id });
      setSavedPlan(null);
      await refreshSavedPlans(session.token, savedPlan.batch);
      setHasUnsavedChanges(false);
      setPolicyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "方案删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    loadPlanCandidates();
  }, []);

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    setItems(nextItems);
    setPolicyResult(null);
    if (savedPlan) {
      setHasUnsavedChanges(true);
    }
  }

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
    if (!items.length && !savedPlan) {
      setError("当前没有可校验的院校专业组。");
      return;
    }

    setIsChecking(true);
    setError("");
    try {
      const result = savedPlan && !hasUnsavedChanges
        ? (await checkVolunteerPlan({ token: session.token, planId: savedPlan.id })).policy_result
        : await checkPolicy({
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
                <CardDescription>
                  {savedPlan
                    ? `已保存：${savedPlan.title} · ${new Date(savedPlan.updated_at).toLocaleString()}${
                        hasUnsavedChanges ? " · 有未保存调整" : ""
                      }`
                    : "当前按推荐引擎排序生成候选，可保存为个人志愿方案"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={refreshRecommendations} disabled={isLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  {isLoading ? "加载中..." : "刷新候选"}
                </Button>
                <Button variant="outline" onClick={handleSavePlan} disabled={isSaving || isLoading || items.length === 0}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "保存中..." : savedPlan ? "保存调整" : "保存方案"}
                </Button>
                <Button variant="outline" onClick={handleSaveAsNewVersion} disabled={isSaving || isLoading || items.length === 0}>
                  <Copy className="h-4 w-4" />
                  另存版本
                </Button>
                <Button variant="outline" onClick={handlePolicyCheck} disabled={isChecking || isLoading || (!savedPlan && items.length === 0)}>
                  <ShieldCheck className="h-4 w-4" />
                  {isChecking ? "校验中..." : "二次校验"}
                </Button>
                {savedPlan ? (
                  <Button variant="outline" onClick={handleDeletePlan} disabled={isSaving}>
                    <Trash2 className="h-4 w-4" />
                    删除方案
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handleExportPlan} disabled={!savedPlan || isExporting || hasUnsavedChanges}>
                  <Download className="h-4 w-4" />
                  {isExporting ? "导出中..." : "导出方案"}
                </Button>
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
                <div className="flex w-10 shrink-0 flex-col items-center gap-1 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="上移志愿"
                    aria-label="上移志愿"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0 || isLoading || isSaving}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="下移志愿"
                    aria-label="下移志愿"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1 || isLoading || isSaving}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>方案版本</CardTitle>
              <CardDescription>同一批次可保留多个版本，用于复用、对比和导出</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {savedPlans.length === 0 ? (
                <div className="rounded-md border border-border px-3 py-6 text-center text-muted-foreground">暂无已保存版本</div>
              ) : (
                savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-md border p-3 ${
                      savedPlan?.id === plan.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="text-left" onClick={() => selectPlan(plan)}>
                        <div className="font-medium">{plan.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {plan.batch} · V{plan.version} · {new Date(plan.updated_at).toLocaleString()}
                        </div>
                      </button>
                      <Button type="button" variant="ghost" size="icon" title="复制版本" aria-label="复制版本" onClick={() => handleCopyPlan(plan)} disabled={isCopying}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">志愿数：{plan.items.length}</div>
                  </div>
                ))
              )}
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
      </div>
    </AppShell>
  );
}
