"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStoredSession } from "@/lib/auth-store";
import { listAdminMajors } from "@/lib/api";
import type { AdminMajor } from "@/types/domain";

export default function AdminMajorsPage() {
  const [keyword, setKeyword] = useState("");
  const [majors, setMajors] = useState<AdminMajor[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadMajors(nextKeyword = keyword) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await listAdminMajors(session.token, nextKeyword.trim());
      setMajors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "专业数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMajors("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadMajors(keyword);
  }

  return (
    <AppShell portal="admin" title="专业管理" description="维护专业目录、专业代码、层次和院校专业组关联">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>专业目录</CardTitle>
              <CardDescription>专业名称变更需要做别名和历史映射</CardDescription>
            </div>
            <form className="flex w-full gap-2 lg:w-[360px]" onSubmit={handleSearch}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="按名称、代码、门类搜索"
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                查询
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {isLoading ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载专业数据...</div>
          ) : null}
          {!isLoading && majors.length === 0 ? (
            <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
              暂无专业数据，请先在数据导入页导入 `majors` 模板。
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {majors.map((major) => (
              <div key={major.id} className="rounded-md border border-border p-4">
                <div className="font-medium">{major.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{major.code}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {major.level ? <Badge>{major.level}</Badge> : null}
                  {major.category ? <Badge variant="outline">{major.category}</Badge> : null}
                </div>
                {major.description ? <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{major.description}</p> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
