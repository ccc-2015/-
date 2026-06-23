"use client";

import { CheckCircle2, FileSearch, RefreshCcw, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCleaningReport, mockKnowledgeDocuments } from "@/lib/mock-data";
import { formatPercent } from "@/lib/utils";

const pipeline = ["上传", "解析", "清洗", "切片", "向量化", "审核", "发布"];

export default function KnowledgePage() {
  return (
    <AppShell portal="admin" title="知识库管理" description="建设、清洗、审核和发布 Agent 可引用的知识资产">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>文档列表</CardTitle>
                <CardDescription>政策、章程、专业介绍和运营问答都需要经过清洗与审核</CardDescription>
              </div>
              <Button>
                <UploadCloud className="h-4 w-4" />
                上传文档
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>质量</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockKnowledgeDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">{doc.batch}</div>
                    </TableCell>
                    <TableCell>{doc.sourceOrg}</TableCell>
                    <TableCell>{doc.year}</TableCell>
                    <TableCell>
                      <Badge variant={doc.status === "published" ? "success" : doc.status === "archived" ? "muted" : "warning"}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-28 items-center gap-2">
                        <Progress value={doc.qualityScore} />
                        <span className="text-xs">{doc.qualityScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">
                          <FileSearch className="h-3.5 w-3.5" />
                          清洗报告
                        </Button>
                        <Button size="sm" variant="outline">
                          发布
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>构建流程</CardTitle>
            <CardDescription>每一步都记录任务、状态和操作者</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipeline.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                    {index < 3 ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step}</div>
                    <div className="text-xs text-muted-foreground">{index < 3 ? "已完成" : "待处理/可触发"}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>清洗质量报告</CardTitle>
          <CardDescription>清洗失败或低分文档不能进入正式向量库</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["文本抽取", mockCleaningReport.textExtractScore],
              ["OCR 置信度", mockCleaningReport.ocrConfidence],
              ["元数据完整度", mockCleaningReport.metadataCompleteScore],
              ["去重置信度", mockCleaningReport.dedupScore],
              ["表格解析", mockCleaningReport.tableParseScore],
              ["政策有效性", mockCleaningReport.policyValidityScore]
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-md border border-border p-4">
                <div className="text-sm text-muted-foreground">{label as string}</div>
                <div className="mt-2 text-xl font-semibold">{formatPercent(value as number)}</div>
                <Progress className="mt-3" value={(value as number) * 100} />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-md border border-border p-4">
            <div className="mb-2 text-sm font-medium">问题提示</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {mockCleaningReport.issues.map((issue) => (
                <li key={issue}>- {issue}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
