"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockSchools } from "@/lib/mock-data";

export default function AdminUniversitiesPage() {
  return (
    <AppShell portal="admin" title="院校管理" description="维护院校基础信息、院校代码、类型、层次和官网来源">
      <Card>
        <CardHeader>
          <CardTitle>院校列表</CardTitle>
          <CardDescription>院校名称和代码变化需要保留历史映射</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>院校</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>层次</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.code}</TableCell>
                  <TableCell>
                    {school.province} · {school.city}
                  </TableCell>
                  <TableCell>{school.type}</TableCell>
                  <TableCell>
                    <Badge>{school.tier}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
