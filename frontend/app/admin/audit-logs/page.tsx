"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const logs = [
  { time: "2026-06-20 15:48", actor: "知识库管理员", action: "发布知识库文档", target: "河南省2026年普通高校招生工作规定" },
  { time: "2026-06-20 15:32", actor: "数据管理员", action: "导入一分一段表", target: "score_segments" },
  { time: "2026-06-20 15:10", actor: "系统管理员", action: "重置用户密码", target: "u_1001" }
];

export default function AuditLogsPage() {
  return (
    <AppShell portal="admin" title="审计日志" description="高风险操作必须记录操作者、时间、对象和变更内容">
      <Card>
        <CardHeader>
          <CardTitle>操作记录</CardTitle>
          <CardDescription>删除、发布、重建索引、账号管理等操作必须保留审计</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>对象</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={`${log.time}-${log.target}`}>
                  <TableCell>{log.time}</TableCell>
                  <TableCell>{log.actor}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.target}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
