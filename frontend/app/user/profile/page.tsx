"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockProfile } from "@/lib/mock-data";

export default function ProfilePage() {
  const profile = mockProfile;

  return (
    <AppShell portal="user" title="考生画像" description="画像字段会直接影响批次判断、选科过滤和推荐排序">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
            <CardDescription>后续接入真实接口后提交到 `/api/profile/me`</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">姓名</span>
                <Input defaultValue={profile.name} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">高考年份</span>
                <Input defaultValue={profile.year} type="number" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">成绩</span>
                <Input defaultValue={profile.score} type="number" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">位次</span>
                <Input defaultValue={profile.rank} type="number" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">首选科目</span>
                <Input defaultValue={profile.subjectTrack} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">再选科目</span>
                <Input defaultValue={profile.selectedSubjects.join("、")} />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">目标专业</span>
                <Input defaultValue={profile.majorPreferences.join("、")} />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">地域偏好</span>
                <Input defaultValue={profile.cityPreferences.join("、")} />
              </label>
              <div className="md:col-span-2">
                <Button type="button">保存画像</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>偏好策略</CardTitle>
            <CardDescription>这些策略用于过滤和重排推荐结果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium">目标批次</div>
              <div className="flex flex-wrap gap-2">
                {profile.targetBatches.map((batch) => (
                  <Badge key={batch}>{batch}</Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>接受民办院校</span>
                <Badge variant={profile.acceptsPrivate ? "success" : "muted"}>{profile.acceptsPrivate ? "是" : "否"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>接受中外合作</span>
                <Badge variant={profile.acceptsCooperation ? "success" : "muted"}>{profile.acceptsCooperation ? "是" : "否"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>接受服从调剂</span>
                <Badge variant={profile.acceptsAdjustment ? "success" : "warning"}>{profile.acceptsAdjustment ? "是" : "否"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>学费预算</span>
                <span className="font-medium">{profile.tuitionLimit} 元/年以内</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
