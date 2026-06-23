"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, FilePlus2, RefreshCcw, Search, Trash2, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeCleaningReport,
  listKnowledgeChunks,
  listKnowledgeDocuments,
  rebuildKnowledgeChunks,
  updateKnowledgeDocument,
  uploadKnowledgeDocument
} from "@/lib/api";
import { getStoredSession } from "@/lib/auth-store";
import type {
  AdminKnowledgeDocument,
  AdminKnowledgeStatus,
  KnowledgeChunk,
  KnowledgeCleaningReport,
  KnowledgeDocumentPayload
} from "@/types/domain";

const emptyForm: KnowledgeDocumentPayload = {
  title: "",
  category: "",
  content: "",
  source_type: "",
  source_url: "",
  tags: [],
  status: "draft"
};

const statusOptions: Array<{ value: AdminKnowledgeStatus | ""; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" }
];

const statusMeta: Record<AdminKnowledgeStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  draft: { label: "草稿", variant: "warning" },
  published: { label: "已发布", variant: "success" },
  archived: { label: "已归档", variant: "muted" }
};

const pipeline = [
  { name: "文档入库", status: "available" },
  { name: "人工编辑", status: "available" },
  { name: "审核发布", status: "available" },
  { name: "文件解析", status: "available" },
  { name: "清洗质检", status: "available" },
  { name: "清洗切片", status: "available" },
  { name: "向量化检索", status: "pending" }
] as const;

const qualityStatusMeta: Record<string, { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  passed: { label: "通过", variant: "success" },
  warning: { label: "需复核", variant: "warning" },
  failed: { label: "未通过", variant: "danger" }
};

const qualityScoreItems: Array<{ key: keyof KnowledgeCleaningReport; label: string }> = [
  { key: "text_extract_score", label: "文本抽取" },
  { key: "metadata_complete_score", label: "元数据" },
  { key: "dedup_score", label: "去重" },
  { key: "table_parse_score", label: "表格结构" },
  { key: "policy_validity_score", label: "政策有效期" },
  { key: "chunk_ready_score", label: "切片就绪" }
];

function tagsToText(tags?: string[] | null) {
  return tags?.join("、") ?? "";
}

function textToTags(value: string) {
  return value
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(document: AdminKnowledgeDocument): KnowledgeDocumentPayload {
  return {
    title: document.title,
    category: document.category ?? "",
    content: document.content,
    source_type: document.source_type ?? "",
    source_url: document.source_url ?? "",
    tags: document.tags ?? [],
    status: document.status
  };
}

function normalizePayload(form: KnowledgeDocumentPayload): KnowledgeDocumentPayload {
  return {
    ...form,
    title: form.title.trim(),
    category: form.category?.trim() || null,
    content: form.content.trim(),
    source_type: form.source_type?.trim() || null,
    source_url: form.source_url?.trim() || null,
    tags: form.tags?.length ? form.tags : null
  };
}

function chunkEmbeddingProvider(chunk: KnowledgeChunk) {
  const provider = chunk.metadata_json?.embedding_provider;
  return typeof provider === "string" ? provider : chunk.embedding_id ? "unknown" : "未生成";
}

function chunkEmbeddingDimensions(chunk: KnowledgeChunk) {
  const dimensions = chunk.metadata_json?.embedding_dimensions;
  return typeof dimensions === "number" ? dimensions : null;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<AdminKnowledgeDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<AdminKnowledgeDocument | null>(null);
  const [form, setForm] = useState<KnowledgeDocumentPayload>(emptyForm);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<AdminKnowledgeStatus | "">("");
  const [category, setCategory] = useState("");
  const [tagText, setTagText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [cleaningReport, setCleaningReport] = useState<KnowledgeCleaningReport | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const selectedMeta = selectedDocument ? statusMeta[selectedDocument.status] : null;
  const publishedCount = useMemo(() => documents.filter((document) => document.status === "published").length, [documents]);

  async function loadDocuments(nextFilters = { keyword, status, category }) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await listKnowledgeDocuments(session.token, {
        keyword: nextFilters.keyword.trim(),
        status: nextFilters.status,
        category: nextFilters.category.trim()
      });
      setDocuments(data);
      if (selectedDocument) {
        const refreshed = data.find((document) => document.id === selectedDocument.id) ?? null;
        setSelectedDocument(refreshed);
        if (refreshed) {
          setForm(toForm(refreshed));
          setTagText(tagsToText(refreshed.tags));
          await loadChunks(refreshed.id);
          await loadCleaningReport(refreshed.id);
        } else {
          setChunks([]);
          setCleaningReport(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "知识库文档加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments({ keyword: "", status: "", category: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadDocuments({ keyword, status, category });
  }

  function startCreate() {
    setSelectedDocument(null);
    setForm(emptyForm);
    setTagText("");
    setUploadFile(null);
    setChunks([]);
    setCleaningReport(null);
    setMessage("");
    setError("");
  }

  function startEdit(document: AdminKnowledgeDocument) {
    setSelectedDocument(document);
    setForm(toForm(document));
    setTagText(tagsToText(document.tags));
    loadChunks(document.id);
    loadCleaningReport(document.id);
    setMessage("");
    setError("");
  }

  async function loadChunks(documentId: number) {
    const session = getStoredSession();
    if (!session) {
      return;
    }

    setIsLoadingChunks(true);
    try {
      setChunks(await listKnowledgeChunks({ token: session.token, documentId }));
    } catch {
      setChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  }

  async function loadCleaningReport(documentId: number) {
    const session = getStoredSession();
    if (!session) {
      return;
    }

    setIsLoadingReport(true);
    try {
      setCleaningReport(await getKnowledgeCleaningReport({ token: session.token, documentId }));
    } catch {
      setCleaningReport(null);
    } finally {
      setIsLoadingReport(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    const payload = normalizePayload({ ...form, tags: textToTags(tagText) });
    if (!payload.title || !payload.content) {
      setError("标题和正文不能为空。");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = selectedDocument
        ? await updateKnowledgeDocument({ token: session.token, documentId: selectedDocument.id, payload })
        : await createKnowledgeDocument({ token: session.token, payload });
      setSelectedDocument(saved);
      setForm(toForm(saved));
      setTagText(tagsToText(saved.tags));
      setMessage(selectedDocument ? "知识库文档已更新。" : "知识库文档已创建。");
      await loadChunks(saved.id);
      await loadCleaningReport(saved.id);
      await loadDocuments({ keyword, status, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "知识库文档保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    setUploadFile(event.target.files?.[0] ?? null);
    setMessage("");
    setError("");
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }
    if (!uploadFile) {
      setError("请选择要上传的知识库文件。");
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");
    try {
      const payload = normalizePayload({ ...form, tags: textToTags(tagText) });
      const saved = await uploadKnowledgeDocument({
        token: session.token,
        file: uploadFile,
        payload: {
          title: payload.title || uploadFile.name.replace(/\.[^.]+$/, ""),
          category: payload.category,
          source_type: payload.source_type || "file_upload",
          source_url: payload.source_url,
          tags: payload.tags,
          status: payload.status
        }
      });
      setSelectedDocument(saved);
      setForm(toForm(saved));
      setTagText(tagsToText(saved.tags));
      setUploadFile(null);
      setMessage(`已上传并解析「${saved.title}」，生成 ${saved.chunk_count} 个切片。`);
      await loadChunks(saved.id);
      await loadCleaningReport(saved.id);
      await loadDocuments({ keyword, status, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "知识库文件上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRebuildChunks() {
    const session = getStoredSession();
    if (!session || !selectedDocument) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await rebuildKnowledgeChunks({ token: session.token, documentId: selectedDocument.id });
      setMessage(`切片已重建，共 ${result.chunk_count} 个切片。`);
      await loadChunks(selectedDocument.id);
      await loadCleaningReport(selectedDocument.id);
      await loadDocuments({ keyword, status, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "切片重建失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(document: AdminKnowledgeDocument, nextStatus: AdminKnowledgeStatus) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateKnowledgeDocument({
        token: session.token,
        documentId: document.id,
        payload: { status: nextStatus }
      });
      if (selectedDocument?.id === document.id) {
        setSelectedDocument(updated);
        setForm(toForm(updated));
        setTagText(tagsToText(updated.tags));
      }
      setMessage(nextStatus === "published" ? "文档已发布，可作为 Agent 引用候选。" : "文档状态已更新。");
      await loadDocuments({ keyword, status, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(document: AdminKnowledgeDocument) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    if (!window.confirm(`确认删除「${document.title}」？`)) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteKnowledgeDocument({ token: session.token, documentId: document.id });
      if (selectedDocument?.id === document.id) {
        startCreate();
      }
      setMessage("知识库文档已删除。");
      await loadDocuments({ keyword, status, category });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell portal="admin" title="知识库管理" description="管理 Agent 可引用的政策、章程和问答文档">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>文档列表</CardTitle>
                <CardDescription>
                  当前 {documents.length} 份文档，已发布 {publishedCount} 份
                </CardDescription>
              </div>
              <Button onClick={startCreate}>
                <FilePlus2 className="h-4 w-4" />
                新建文档
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="mb-4 grid gap-2 lg:grid-cols-[1fr_130px_150px_auto]" onSubmit={handleSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按标题或正文搜索" className="pl-9" />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AdminKnowledgeStatus | "")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="分类" />
              <Button type="submit" disabled={isLoading}>
                查询
              </Button>
            </form>

            {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {message ? <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>切片</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => {
                  const meta = statusMeta[document.status];
                  return (
                    <TableRow key={document.id}>
                      <TableCell>
                        <button className="text-left font-medium hover:text-primary" type="button" onClick={() => startEdit(document)}>
                          {document.title}
                        </button>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {document.category || "未分类"}
                          {document.tags?.length ? ` · ${document.tags.slice(0, 3).join("、")}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{document.source_type || "-"}</div>
                        {document.source_url ? <div className="max-w-48 truncate text-xs text-muted-foreground">{document.source_url}</div> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>v{document.version}</TableCell>
                      <TableCell>{document.chunk_count}</TableCell>
                      <TableCell>{new Date(document.updated_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {document.status !== "published" ? (
                            <Button size="sm" variant="outline" onClick={() => changeStatus(document, "published")} disabled={isSaving}>
                              发布
                            </Button>
                          ) : null}
                          {document.status !== "archived" ? (
                            <Button size="sm" variant="outline" onClick={() => changeStatus(document, "archived")} disabled={isSaving}>
                              <Archive className="h-3.5 w-3.5" />
                              归档
                            </Button>
                          ) : null}
                          <Button size="sm" variant="outline" onClick={() => handleDelete(document)} disabled={isSaving}>
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      暂无知识库文档
                    </TableCell>
                  </TableRow>
                ) : null}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      正在加载知识库文档...
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{selectedDocument ? "编辑文档" : "新建文档"}</CardTitle>
                <CardDescription>
                  {selectedDocument ? `文档 #${selectedDocument.id} · v${selectedDocument.version}` : "先维护文本内容，后续接入文件解析和向量化"}
                </CardDescription>
              </div>
              {selectedMeta ? <Badge variant={selectedMeta.variant}>{selectedMeta.label}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            <form className="mb-5 rounded-md border border-border bg-muted/30 p-3" onSubmit={handleUpload}>
              <div className="text-sm font-medium">文件上传解析</div>
              <div className="mt-1 text-xs text-muted-foreground">支持 .txt、.md、.csv、.xlsx、.xls，上传后自动抽取正文并重建切片</div>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-background p-4 text-center transition-colors hover:bg-muted/60">
                <UploadCloud className="h-8 w-8 text-primary" />
                <span className="mt-2 text-sm font-medium">{uploadFile ? uploadFile.name : "选择知识库文件"}</span>
                <span className="mt-1 text-xs text-muted-foreground">标题留空时使用文件名</span>
                <Input className="sr-only" type="file" accept=".txt,.md,.csv,.xlsx,.xls" onChange={handleUploadFileChange} />
              </label>
              <Button className="mt-3" type="submit" disabled={isUploading || !uploadFile}>
                <UploadCloud className="h-4 w-4" />
                {isUploading ? "上传解析中..." : "上传并解析"}
              </Button>
            </form>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">标题</span>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">分类</span>
                  <Input value={form.category ?? ""} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">状态</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminKnowledgeStatus }))}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {statusOptions
                      .filter((option): option is { value: AdminKnowledgeStatus; label: string } => Boolean(option.value))
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">来源类型</span>
                  <Input value={form.source_type ?? ""} onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">来源 URL</span>
                  <Input value={form.source_url ?? ""} onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value }))} />
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">标签</span>
                <Input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="用顿号、逗号或换行分隔" />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">正文</span>
                <Textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-72"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : selectedDocument ? "保存修改" : "创建文档"}
                </Button>
                {selectedDocument ? (
                  <Button type="button" variant="outline" onClick={startCreate} disabled={isSaving}>
                    新建空白文档
                  </Button>
                ) : null}
                {selectedDocument ? (
                  <Button type="button" variant="outline" onClick={handleRebuildChunks} disabled={isSaving}>
                    <RefreshCcw className="h-4 w-4" />
                    重建切片
                  </Button>
                ) : null}
              </div>
            </form>

            {selectedDocument ? (
              <div className="mt-5 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">清洗质量报告</div>
                    <div className="mt-1 text-xs text-muted-foreground">检查文本抽取、元数据、去重、有效期和切片就绪度</div>
                  </div>
                  {cleaningReport ? (
                    <Badge variant={(qualityStatusMeta[cleaningReport.status] ?? qualityStatusMeta.warning).variant}>
                      {(qualityStatusMeta[cleaningReport.status] ?? qualityStatusMeta.warning).label}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{isLoadingReport ? "加载中" : "暂无"}</Badge>
                  )}
                </div>
                {cleaningReport ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">综合评分</span>
                        <span>{cleaningReport.overall_score}/100</span>
                      </div>
                      <Progress value={cleaningReport.overall_score} className="mt-2" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {qualityScoreItems.map((item) => {
                        const value = Number(cleaningReport[item.key] ?? 0);
                        return (
                          <div key={item.key} className="rounded-md border border-border p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{item.label}</span>
                              <span className="text-muted-foreground">{value}/100</span>
                            </div>
                            <Progress value={value} className="mt-2" />
                          </div>
                        );
                      })}
                    </div>
                    {cleaningReport.issues_json?.length ? (
                      <div className="rounded-md border border-border p-3">
                        <div className="text-sm font-medium">质量问题</div>
                        <div className="mt-2 space-y-2">
                          {cleaningReport.issues_json.map((issue) => (
                            <div key={`${issue.code}-${issue.message}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Badge variant={issue.severity === "error" ? "danger" : "warning"}>
                                {issue.severity === "error" ? "错误" : "提示"}
                              </Badge>
                              <span>{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">未发现明显质量问题。</div>
                    )}
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>正文长度：{String(cleaningReport.metrics_json?.text_length ?? 0)}</div>
                      <div>切片数量：{String(cleaningReport.metrics_json?.chunk_count ?? 0)}</div>
                      <div>重复行：{String(cleaningReport.metrics_json?.duplicate_line_count ?? 0)}</div>
                      <div>最新年份：{String(cleaningReport.metrics_json?.latest_year ?? "未识别")}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {isLoadingReport ? "正在生成清洗质量报告..." : "暂无清洗质量报告"}
                  </div>
                )}
              </div>
            ) : null}

            {selectedDocument ? (
              <div className="mt-5 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">切片预览</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      当前 {selectedDocument.chunk_count} 个切片，Agent 政策检索会优先使用已发布文档
                    </div>
                  </div>
                  <Badge variant="outline">{isLoadingChunks ? "加载中" : `${chunks.length} 条`}</Badge>
                </div>
                <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                  {chunks.slice(0, 10).map((chunk) => (
                    <div key={chunk.id} className="rounded border border-border bg-background p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>#{chunk.chunk_index + 1}</span>
                        <Badge variant={chunk.embedding_id ? "success" : "warning"}>{chunk.embedding_id ? "已向量化" : "未向量化"}</Badge>
                        <span>{chunkEmbeddingProvider(chunk)}</span>
                        {chunkEmbeddingDimensions(chunk) ? <span>{chunkEmbeddingDimensions(chunk)} 维</span> : null}
                      </div>
                      <div className="max-h-20 overflow-hidden text-xs text-muted-foreground">{chunk.content}</div>
                    </div>
                  ))}
                  {!isLoadingChunks && chunks.length === 0 ? (
                    <div className="rounded-md border border-border px-3 py-8 text-center text-sm text-muted-foreground">暂无切片</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>构建能力状态</CardTitle>
          <CardDescription>当前已接入文档管理、文件解析和切片重建；向量检索仍待后端实现</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pipeline.map((step) => (
              <div key={step.name} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                  {step.status === "available" ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{step.name}</div>
                  <div className="text-xs text-muted-foreground">{step.status === "available" ? "已接入" : "待实现"}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
