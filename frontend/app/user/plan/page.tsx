"use client";

import { useState } from "react";
import { GripVertical, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredSession } from "@/lib/auth-store";
import { checkPolicy } from "@/lib/api";
import { mockRecommendations } from "@/lib/mock-data";
import type { PolicyCheckResponse } from "@/types/domain";

export default function PlanPage() {
  const [policyResult, setPolicyResult] = useState<PolicyCheckResponse | null>(null);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  async function handlePolicyCheck() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    setIsChecking(true);
    setError("");
    try {
      const result = await checkPolicy({
        token: session.token,
        batch: "普通本科批",
        groupItems: []
      });
      setPolicyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "规则校验失败");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <AppShell portal="user" title="志愿方案" description="生成 48 个院校专业组志愿草案，并支持手动调整顺序">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>本科批方案草案</CardTitle>
                <CardDescription>当前展示候选数据，正式方案会使用院校专业组 ID 做二次规则校验</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePolicyCheck} disabled={isChecking}>
                  <ShieldCheck className="h-4 w-4" />
                  {isChecking ? "校验中..." : "二次校验"}
                </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>规则校验</CardTitle>
            <CardDescription>校验批次、选科、志愿数量和专业组可报性</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
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
