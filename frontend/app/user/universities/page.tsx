"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockSchools } from "@/lib/mock-data";

export default function UniversitiesPage() {
  return (
    <AppShell portal="user" title="院校专业浏览" description="浏览院校、专业组、历年位次和招生章程信息">
      <Card>
        <CardHeader>
          <CardTitle>院校检索</CardTitle>
          <CardDescription>后续会接入专业组、选科要求和历年录取数据过滤</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <Input placeholder="搜索院校、城市、专业方向" />
            <Input placeholder="省份" />
            <Input placeholder="院校类型" />
          </div>

          <div className="grid gap-3">
            {mockSchools.map((school) => (
              <div key={school.id} className="rounded-md border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{school.name}</h2>
                      <Badge variant="outline">{school.tier}</Badge>
                      <Badge variant="muted">{school.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {school.province} · {school.city} · 院校代码 {school.code}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{school.description}</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/user/universities/sample">
                      详情
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
