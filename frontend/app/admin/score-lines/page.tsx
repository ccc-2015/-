"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStoredSession } from "@/lib/auth-store";
import { listAdmissionPlans, listBatchLines, listHistoricalAdmissions, listScoreSegments } from "@/lib/api";
import type { AdmissionPlan, BatchLine, HistoricalAdmission, ScoreSegment } from "@/types/domain";

type Filters = {
  year: string;
  subjectTrack: string;
  batch: string;
};

const initialFilters: Filters = {
  year: "2026",
  subjectTrack: "",
  batch: ""
};

export default function AdminScoreLinesPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [batchLines, setBatchLines] = useState<BatchLine[]>([]);
  const [scoreSegments, setScoreSegments] = useState<ScoreSegment[]>([]);
  const [admissionPlans, setAdmissionPlans] = useState<AdmissionPlan[]>([]);
  const [historicalAdmissions, setHistoricalAdmissions] = useState<HistoricalAdmission[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadData(nextFilters = filters) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const requestFilters = {
        year: nextFilters.year.trim(),
        subjectTrack: nextFilters.subjectTrack.trim(),
        batch: nextFilters.batch.trim()
      };
      const [nextBatchLines, nextScoreSegments, nextAdmissionPlans, nextHistoricalAdmissions] = await Promise.all([
        listBatchLines(session.token, requestFilters),
        listScoreSegments(session.token, requestFilters),
        listAdmissionPlans(session.token, requestFilters),
        listHistoricalAdmissions(session.token, requestFilters)
      ]);
      setBatchLines(nextBatchLines);
      setScoreSegments(nextScoreSegments);
      setAdmissionPlans(nextAdmissionPlans);
      setHistoricalAdmissions(nextHistoricalAdmissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "核心招生数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadData(filters);
  }

  return (
    <AppShell portal="admin" title="分数线管理" description="维护批次控制线、一分一段表、招生计划和历年投档线">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>核心招生数据</CardTitle>
              <CardDescription>数据来自结构化导入结果，推荐和规则校验会基于这些数据继续扩展</CardDescription>
            </div>
            <form className="grid gap-2 sm:grid-cols-[110px_150px_180px_auto]" onSubmit={handleSearch}>
              <Input
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
                placeholder="年份"
              />
              <Input
                value={filters.subjectTrack}
                onChange={(event) => setFilters((current) => ({ ...current, subjectTrack: event.target.value }))}
                placeholder="物理类/历史类"
              />
              <Input
                value={filters.batch}
                onChange={(event) => setFilters((current) => ({ ...current, batch: event.target.value }))}
                placeholder="批次"
              />
              <Button type="submit" disabled={isLoading}>
                <Search className="h-4 w-4" />
                查询
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {isLoading ? <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载核心招生数据...</div> : null}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>批次控制线</CardTitle>
            <CardDescription>导入类型：`batch_lines`</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年份</TableHead>
                  <TableHead>科类</TableHead>
                  <TableHead>批次</TableHead>
                  <TableHead>分数</TableHead>
                  <TableHead>位次</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchLines.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.subject_track}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>{row.score}</TableCell>
                    <TableCell>{row.rank ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && batchLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无批次线数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>一分一段</CardTitle>
            <CardDescription>导入类型：`score_segments`，默认最多展示 200 条</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年份</TableHead>
                  <TableHead>科类</TableHead>
                  <TableHead>分数</TableHead>
                  <TableHead>位次</TableHead>
                  <TableHead>累计人数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoreSegments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.subject_track}</TableCell>
                    <TableCell>{row.score}</TableCell>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell>{row.cumulative_count ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && scoreSegments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无一分一段数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>招生计划</CardTitle>
            <CardDescription>导入类型：`admission_plans`</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年份</TableHead>
                  <TableHead>院校 ID</TableHead>
                  <TableHead>批次</TableHead>
                  <TableHead>科类</TableHead>
                  <TableHead>计划数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissionPlans.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.school_id}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>{row.subject_track}</TableCell>
                    <TableCell>{row.plan_count}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && admissionPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无招生计划数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>历年录取</CardTitle>
            <CardDescription>导入类型：`historical_admissions`</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年份</TableHead>
                  <TableHead>院校 ID</TableHead>
                  <TableHead>批次</TableHead>
                  <TableHead>最低分</TableHead>
                  <TableHead>最低位次</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalAdmissions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.school_id}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>{row.min_score ?? "-"}</TableCell>
                    <TableCell>{row.min_rank ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && historicalAdmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无历年录取数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
