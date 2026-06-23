"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStoredSession } from "@/lib/auth-store";
import { listAdminSchools } from "@/lib/api";
import type { AdminSchool } from "@/types/domain";

export default function AdminUniversitiesPage() {
  const [keyword, setKeyword] = useState("");
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadSchools(nextKeyword = keyword) {
    const session = getStoredSession();
    if (!session) {
      setError("登录状态已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await listAdminSchools(session.token, nextKeyword.trim());
      setSchools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "院校数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSchools("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadSchools(keyword);
  }

  return (
    <AppShell portal="admin" title="院校管理" description="维护院校基础信息、院校代码、类型、层次和官网来源">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>院校列表</CardTitle>
              <CardDescription>院校名称和代码变化需要保留历史映射</CardDescription>
            </div>
            <form className="flex w-full gap-2 lg:w-[360px]" onSubmit={handleSearch}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="按名称、代码、城市搜索"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>院校</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>层次</TableHead>
                <TableHead>办学性质</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.code}</TableCell>
                  <TableCell>
                    {[school.province, school.city].filter(Boolean).join(" · ") || "-"}
                  </TableCell>
                  <TableCell>{school.school_type || "-"}</TableCell>
                  <TableCell>{school.tier ? <Badge>{school.tier}</Badge> : "-"}</TableCell>
                  <TableCell>{school.ownership || "-"}</TableCell>
                </TableRow>
              ))}
              {!isLoading && schools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    暂无院校数据，请先在数据导入页导入 `schools` 模板。
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    正在加载院校数据...
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
