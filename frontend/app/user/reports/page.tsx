"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateReport, listReports, listVolunteerPlans } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import { formatNumber } from "@/lib/utils";
import type { UserReport, VolunteerPlan } from "@/types/domain";

const riskOrder = ["冲", "稳", "保", "兜底", "待评估"];

export default function ReportsPage() {
  const [plans, setPlans] = useState<VolunteerPlan[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);

  async function loadReports() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [nextPlans, nextReports] = await Promise.all([
        listVolunteerPlans({ token: session.token }),
        listReports(session.token)
      ]);
      setPlans(nextPlans);
      setReports(nextReports);
      setSelectedPlanId((current) => current ?? nextPlans[0]?.id ?? null);
      setSelectedReport((current) => current ?? nextReports[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "报告数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateReport() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }
    if (!selectedPlan) {
      setError("请先保存一个志愿方案，再生成报告。");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      const report = await generateReport({
        token: session.token,
        payload: {
          plan_id: selectedPlan.id,
          title: `${selectedPlan.batch}志愿分析报告 V${selectedPlan.version}`
        }
      });
      setReports((current) => [report, ...current]);
      setSelectedReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "报告生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <AppShell portal="user" title="报告" description="从已保存志愿方案生成可分享的网页分析报告">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>生成报告</CardTitle>
              <CardDescription>报告会固化方案顺序、推荐理由、风险提示和生成时间</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPlanId ?? ""}
                onChange={(event) => setSelectedPlanId(Number(event.target.value) || null)}
                disabled={isLoading || plans.length === 0}
              >
                {plans.length === 0 ? <option value="">暂无已保存方案</option> : null}
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} · {plan.batch} · V{plan.version}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoading || !selectedPlan}>
                  <FileText className="h-4 w-4" />
                  {isGenerating ? "生成中..." : "生成报告"}
                </Button>
                <Button variant="outline" onClick={loadReports} disabled={isLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  刷新
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>报告列表</CardTitle>
              <CardDescription>选择一份报告查看网页内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? <div className="rounded-md border border-border px-3 py-8 text-center text-sm text-muted-foreground">正在加载报告...</div> : null}
              {!isLoading && reports.length === 0 ? (
                <div className="rounded-md border border-border px-3 py-8 text-center text-sm text-muted-foreground">暂无报告，请先从已保存方案生成。</div>
              ) : null}
              {reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    selectedReport?.id === report.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{report.title}</span>
                    <Badge variant={report.status === "generated" ? "success" : "muted"}>{report.status === "generated" ? "已生成" : report.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleString()} · {report.content_json.plan.batch} V{report.content_json.plan.version}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {selectedReport ? <ReportPreview report={selectedReport} /> : <EmptyReportState />}
      </div>
    </AppShell>
  );
}

function ReportPreview({ report }: { report: UserReport }) {
  const content = report.content_json;
  const riskEntries = riskOrder
    .map((risk) => [risk, content.summary.risk_distribution[risk] ?? 0] as const)
    .filter(([, count]) => count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>
              生成时间：{new Date(report.created_at).toLocaleString()} · 数据版本：{report.data_version}
            </CardDescription>
          </div>
          <Badge variant="success">网页报告</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="批次" value={content.plan.batch} />
          <Metric label="方案版本" value={`V${content.plan.version}`} />
          <Metric label="志愿数量" value={`${content.plan.item_count}`} />
          <Metric label="风险提示" value={`${content.summary.warning_count}`} />
        </section>

        <section className="rounded-md border border-border p-4">
          <div className="mb-3 font-medium">考生画像</div>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <div>姓名：{content.profile.name || "-"}</div>
            <div>年份：{content.profile.year || "-"}</div>
            <div>省份：{content.profile.province || "-"}</div>
            <div>成绩：{formatNumber(content.profile.score)}</div>
            <div>位次：{formatNumber(content.profile.rank)}</div>
            <div>科类：{content.profile.subject_track || "-"}</div>
            <div>选科：{content.profile.selected_subjects.join("、") || "-"}</div>
            <div>目标批次：{content.profile.target_batches.join("、") || "-"}</div>
            <div>接受调剂：{content.profile.accepts_adjustment ? "是" : "否"}</div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border p-4">
            <div className="font-medium">风险分布</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {riskEntries.length ? riskEntries.map(([risk, count]) => <Badge key={risk} variant="outline">{risk} {count}</Badge>) : <span className="text-sm text-muted-foreground">暂无</span>}
            </div>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="font-medium">重点城市</div>
            <div className="mt-3 text-sm text-muted-foreground">{content.summary.top_cities.join("、") || "-"}</div>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="font-medium">专业方向</div>
            <div className="mt-3 text-sm text-muted-foreground">{content.summary.top_majors.join("、") || "-"}</div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="font-medium">志愿列表</div>
          {content.volunteer_items.map((item) => (
            <div key={`${item.order}-${item.group_id}`} className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">志愿 {item.order}</div>
                  <div className="font-medium">{item.school_name || "未知院校"}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.group_name || "未知专业组"}（{item.group_code || "-"}） · {item.subject_track || "-"} · {item.city || "-"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.risk_level || "待评估"}</Badge>
                  <Badge variant={item.suggested_adjustment ? "success" : "warning"}>{item.suggested_adjustment ? "建议服从调剂" : "谨慎不服从"}</Badge>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">匹配分：{item.match_score ?? "-"}</div>
              {item.majors.length ? <div className="mt-2 text-sm text-muted-foreground">专业建议：{item.majors.join("、")}</div> : null}
              {item.reasons.length ? <div className="mt-2 text-sm">推荐理由：{item.reasons[0]}</div> : null}
              {item.warnings.length ? <div className="mt-2 text-sm text-amber-700">风险提示：{item.warnings.join("；")}</div> : null}
            </div>
          ))}
        </section>

        <section className="rounded-md border border-border p-4">
          <div className="font-medium">政策依据</div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {content.policy_citations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-medium">免责声明</div>
          <ul className="mt-2 space-y-1">
            {content.disclaimers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function EmptyReportState() {
  return (
    <Card>
      <CardContent className="px-4 py-20 text-center text-sm text-muted-foreground">
        选择一份报告，或从已保存志愿方案生成新的网页报告。
      </CardContent>
    </Card>
  );
}
