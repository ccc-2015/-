"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { year: 2026, track: "物理类", batch: "普通本科批", score: "待发布", source: "河南省教育考试院" },
  { year: 2026, track: "历史类", batch: "普通本科批", score: "待发布", source: "河南省教育考试院" },
  { year: 2025, track: "物理类", batch: "参考批次线", score: 511, source: "历史数据" }
];

export default function AdminScoreLinesPage() {
  return (
    <AppShell portal="admin" title="分数线管理" description="维护批次控制线、一分一段表和历年投档线">
      <Card>
        <CardHeader>
          <CardTitle>批次线</CardTitle>
          <CardDescription>2026 正式数据发布后替换待发布状态</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>年份</TableHead>
                <TableHead>科类</TableHead>
                <TableHead>批次</TableHead>
                <TableHead>分数</TableHead>
                <TableHead>来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.year}-${row.track}-${row.batch}`}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{row.track}</TableCell>
                  <TableCell>{row.batch}</TableCell>
                  <TableCell>{row.score}</TableCell>
                  <TableCell>{row.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
