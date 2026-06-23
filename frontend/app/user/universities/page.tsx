"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStoredSession } from "@/lib/auth-store";
import { searchAdmissionGroups } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { SearchGroupItem } from "@/types/domain";

export default function UniversitiesPage() {
  const [keyword, setKeyword] = useState("");
  const [year, setYear] = useState("2026");
  const [batch, setBatch] = useState("");
  const [subjectTrack, setSubjectTrack] = useState("");
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [items, setItems] = useState<SearchGroupItem[]>([]);
  const [usedProfile, setUsedProfile] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadGroups() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const result = await searchAdmissionGroups({
        token: session.token,
        keyword,
        year,
        batch,
        subjectTrack,
        useProfile: true,
        onlyEligible,
        limit: 80
      });
      setItems(result.items);
      setUsedProfile(result.used_profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "院校专业组检索失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadGroups();
  }

  return (
    <AppShell portal="user" title="院校专业浏览" description="按画像、批次、科类和选科要求检索院校专业组">
      <Card>
        <CardHeader>
          <CardTitle>院校专业组检索</CardTitle>
          <CardDescription>默认使用当前考生画像过滤不可报专业组</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 xl:grid-cols-[1fr_110px_180px_150px_auto]" onSubmit={handleSearch}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索院校、城市、专业组" className="pl-9" />
            </div>
            <Input value={year} onChange={(event) => setYear(event.target.value)} placeholder="年份" />
            <Input value={batch} onChange={(event) => setBatch(event.target.value)} placeholder="批次，默认按画像" />
            <Input value={subjectTrack} onChange={(event) => setSubjectTrack(event.target.value)} placeholder="科类，默认按画像" />
            <Button type="submit" disabled={isLoading}>
              查询
            </Button>
          </form>

          <label className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={onlyEligible} onChange={(event) => setOnlyEligible(event.target.checked)} />
            只看符合当前画像选科要求的专业组
          </label>

          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {usedProfile ? <div className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">已使用当前考生画像进行科类和选科过滤。</div> : null}

          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.group_id} className="rounded-md border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{item.school_name}</h2>
                      {item.tier ? <Badge variant="outline">{item.tier}</Badge> : null}
                      {item.school_type ? <Badge variant="muted">{item.school_type}</Badge> : null}
                      <Badge variant={item.eligible ? "success" : "danger"}>{item.eligible ? "可报" : "不可报"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.province || "-"} · {item.city || "-"} · 院校代码 {item.school_code}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {item.group_name}（{item.group_code}）
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.year} · {item.batch} · {item.subject_track} · 选科要求 {item.subject_requirements || "不限"}
                    </p>
                    {item.eligibility_errors.length ? (
                      <div className="mt-2 text-sm text-red-700">{item.eligibility_errors.join("；")}</div>
                    ) : null}
                  </div>
                  <div className="grid min-w-52 gap-2 text-sm">
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="text-muted-foreground">计划数</div>
                      <div className="mt-1 font-semibold">{item.plan_count ?? "-"}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="text-muted-foreground">最近最低位次</div>
                      <div className="mt-1 font-semibold">{item.historical_min_rank ? formatNumber(item.historical_min_rank) : "-"}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="text-muted-foreground">最近最低分</div>
                      <div className="mt-1 font-semibold">{item.historical_min_score ?? "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && items.length === 0 ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                暂无匹配专业组，请先导入院校专业组、招生计划和历年录取数据，或放宽筛选条件。
              </div>
            ) : null}
            {isLoading ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在检索院校专业组...</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
