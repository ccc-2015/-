"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStoredSession } from "@/lib/auth-store";
import { confirmImportJob, listImportJobs, uploadImportFile } from "@/lib/api";
import type { ImportDataType, ImportJob, ImportUploadResponse } from "@/types/domain";

const dataTypes: Array<{ value: ImportDataType; label: string; helper: string }> = [
  { value: "schools", label: "院校基础信息", helper: "code、name 为必填字段" },
  { value: "majors", label: "专业基础信息", helper: "code、name 为必填字段" },
  { value: "school_major_groups", label: "院校专业组", helper: "需先导入院校基础信息" }
];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    validated: "已校验",
    validation_failed: "校验失败",
    imported: "已入库"
  };

  return labels[status] ?? status;
}

function renderCell(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export default function DataImportPage() {
  const [dataType, setDataType] = useState<ImportDataType>("schools");
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportUploadResponse | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const selectedTemplate = dataTypes.find((item) => item.value === dataType);
  const targetFields = useMemo(() => {
    if (!uploadResult) {
      return [];
    }
    return [...uploadResult.required_fields, ...uploadResult.optional_fields];
  }, [uploadResult]);

  async function loadJobs() {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoadingJobs(false);
      return;
    }

    setIsLoadingJobs(true);
    try {
      const data = await listImportJobs(session.token);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入任务加载失败");
    } finally {
      setIsLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setUploadResult(null);
    setFieldMapping({});
    setMessage("");
    setError("");
  }

  function handleDataTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    setDataType(event.target.value as ImportDataType);
    setUploadResult(null);
    setFieldMapping({});
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

    if (!file) {
      setError("请选择 Excel 或 CSV 文件。");
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");
    try {
      const result = await uploadImportFile({ token: session.token, dataType, file });
      const initialMapping = Object.fromEntries((result.job.field_names ?? []).map((fieldName) => [fieldName, fieldName]));
      setUploadResult(result);
      setFieldMapping(initialMapping);
      setMessage(`已上传 ${result.job.original_filename}，共 ${result.job.total_rows} 行，${result.job.valid_rows} 行通过基础校验。`);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleConfirm() {
    const session = getStoredSession();
    if (!session || !uploadResult) {
      return;
    }

    setIsConfirming(true);
    setError("");
    setMessage("");
    try {
      const job = await confirmImportJob({
        token: session.token,
        jobId: uploadResult.job.id,
        fieldMapping
      });
      setUploadResult((current) =>
        current
          ? {
              ...current,
              job
            }
          : current
      );
      setMessage(job.status === "imported" ? "导入任务已确认入库。" : "导入任务已重新校验，请查看错误信息。");
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "确认入库失败");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <AppShell portal="admin" title="数据导入" description="Excel/CSV 上传、预览、映射、校验和确认入库">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>上传数据文件</CardTitle>
            <CardDescription>一期支持院校、专业、院校专业组三类基础数据</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleUpload}>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">数据类型</span>
                <select
                  value={dataType}
                  onChange={handleDataTypeChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {dataTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">{selectedTemplate?.helper}</span>
              </label>

              <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:bg-muted/70">
                <UploadCloud className="h-10 w-10 text-primary" />
                <p className="mt-3 text-sm font-medium">{file ? file.name : "选择 Excel/CSV 文件"}</p>
                <p className="mt-1 text-xs text-muted-foreground">支持 .xlsx、.xls、.csv</p>
                <Input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
              </label>

              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
              {message ? <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}

              <Button type="submit" disabled={isUploading || !file}>
                <UploadCloud className="h-4 w-4" />
                {isUploading ? "上传校验中..." : "上传并校验"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>字段映射与预览</CardTitle>
            <CardDescription>上传后检查字段和前 20 行，再确认入库</CardDescription>
          </CardHeader>
          <CardContent>
            {!uploadResult ? (
              <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
                上传文件后将在这里显示字段映射、校验结果和预览数据。
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">总行数</div>
                    <div className="mt-1 text-lg font-semibold">{uploadResult.job.total_rows}</div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">有效行</div>
                    <div className="mt-1 text-lg font-semibold">{uploadResult.job.valid_rows}</div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">错误行</div>
                    <div className="mt-1 text-lg font-semibold">{uploadResult.job.error_rows}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">字段映射</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(uploadResult.job.field_names ?? []).map((sourceField) => (
                      <label key={sourceField} className="grid gap-1 rounded-md border border-border p-3 text-sm">
                        <span className="text-xs text-muted-foreground">源字段：{sourceField}</span>
                        <select
                          value={fieldMapping[sourceField] ?? ""}
                          onChange={(event) =>
                            setFieldMapping((current) => ({
                              ...current,
                              [sourceField]: event.target.value
                            }))
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="">不导入</option>
                          {targetFields.map((targetField) => (
                            <option key={targetField} value={targetField}>
                              {targetField}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>

                {uploadResult.job.validation_errors?.length ? (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <div className="font-medium">校验错误</div>
                    <div className="mt-2 space-y-1">
                      {uploadResult.job.validation_errors.slice(0, 5).map((item, index) => (
                        <div key={index}>{JSON.stringify(item)}</div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 text-sm font-medium">数据预览</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {(uploadResult.job.field_names ?? []).slice(0, 6).map((fieldName) => (
                          <TableHead key={fieldName}>{fieldName}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(uploadResult.job.preview_rows ?? []).slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          {(uploadResult.job.field_names ?? []).slice(0, 6).map((fieldName) => (
                            <TableCell key={fieldName}>{renderCell(row[fieldName])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={handleConfirm} disabled={isConfirming || uploadResult.job.status === "imported"}>
                  <CheckCircle2 className="h-4 w-4" />
                  {uploadResult.job.status === "imported" ? "已入库" : isConfirming ? "确认中..." : "确认入库"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>最近导入任务</CardTitle>
          <CardDescription>所有导入任务保留状态、行数、错误数和创建时间</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>文件</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>行数</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>#{job.id}</TableCell>
                  <TableCell>{job.data_type}</TableCell>
                  <TableCell>{job.original_filename}</TableCell>
                  <TableCell>
                    <Badge variant={job.status === "validation_failed" ? "danger" : "outline"}>{statusLabel(job.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {job.valid_rows}/{job.total_rows}
                    {job.error_rows ? <span className="text-red-600">，错误 {job.error_rows}</span> : null}
                  </TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!isLoadingJobs && jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    暂无导入任务
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoadingJobs ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    正在加载导入任务...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
