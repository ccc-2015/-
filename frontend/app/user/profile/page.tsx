"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStoredSession } from "@/lib/auth-store";
import { getMyProfile, updateMyProfile } from "@/lib/api";
import type { BatchType, StudentProfile, SubjectTrack } from "@/types/domain";

const subjectTracks: SubjectTrack[] = ["物理类", "历史类"];
const subjectOptions = ["思想政治", "地理", "化学", "生物"];
const batchOptions: BatchType[] = ["普通本科批", "普通高职（专科）批"];

function splitText(value: string) {
  return value
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinText(value: string[]) {
  return value.join("、");
}

function completion(profile: StudentProfile | null) {
  if (!profile) {
    return 0;
  }

  const checks = [
    profile.name,
    profile.year,
    profile.province,
    profile.score,
    profile.rank,
    profile.subject_track,
    profile.selectedSubjects.length,
    profile.targetBatches.length,
    profile.cityPreferences.length,
    profile.majorPreferences.length,
    profile.tuitionLimit
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [cityText, setCityText] = useState("");
  const [majorText, setMajorText] = useState("");
  const [schoolTierText, setSchoolTierText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const completeRate = useMemo(() => completion(profile), [profile]);

  useEffect(() => {
    async function loadProfile() {
      const session = getStoredSession();
      if (!session) {
        setError("登录状态已失效，请重新登录。");
        setIsLoading(false);
        return;
      }

      try {
        const data = await getMyProfile(session.token);
        setProfile(data);
        setCityText(joinText(data.cityPreferences));
        setMajorText(joinText(data.majorPreferences));
        setSchoolTierText(joinText(data.schoolTierPreferences));
      } catch (err) {
        setError(err instanceof Error ? err.message : "画像加载失败");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  function patchProfile(patch: Partial<StudentProfile>) {
    setProfile((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleSelectedSubject(subject: string) {
    if (!profile) {
      return;
    }

    const selected = new Set(profile.selectedSubjects);
    if (selected.has(subject)) {
      selected.delete(subject);
    } else {
      selected.add(subject);
    }
    patchProfile({ selectedSubjects: Array.from(selected) });
  }

  function toggleBatch(batch: BatchType) {
    if (!profile) {
      return;
    }

    const selected = new Set(profile.targetBatches);
    if (selected.has(batch)) {
      selected.delete(batch);
    } else {
      selected.add(batch);
    }
    patchProfile({ targetBatches: Array.from(selected) as BatchType[] });
  }

  function numberValue(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    return value === "" ? null : Number(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getStoredSession();
    if (!session || !profile) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateMyProfile(session.token, {
        ...profile,
        cityPreferences: splitText(cityText),
        majorPreferences: splitText(majorText),
        schoolTierPreferences: splitText(schoolTierText)
      });
      setProfile(updated);
      setCityText(joinText(updated.cityPreferences));
      setMajorText(joinText(updated.majorPreferences));
      setSchoolTierText(joinText(updated.schoolTierPreferences));
      setMessage("画像已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell portal="user" title="考生画像" description="画像字段会直接影响批次判断、选科过滤和推荐排序">
      {isLoading ? (
        <div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载考生画像...</div>
      ) : null}

      {!isLoading && profile ? (
        <form className="grid gap-4 xl:grid-cols-[1fr_0.8fr]" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
              <CardDescription>按 2026 年河南普通类本科批和高职（专科）批采集必要字段</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">姓名</span>
                <Input value={profile.name ?? ""} onChange={(event) => patchProfile({ name: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">高考年份</span>
                <Input value={profile.year} type="number" onChange={(event) => patchProfile({ year: Number(event.target.value) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">省份</span>
                <Input value={profile.province} onChange={(event) => patchProfile({ province: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">成绩</span>
                <Input value={profile.score ?? ""} type="number" onChange={(event) => patchProfile({ score: numberValue(event) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">位次</span>
                <Input value={profile.rank ?? ""} type="number" onChange={(event) => patchProfile({ rank: numberValue(event) })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">首选科目</span>
                <select
                  value={profile.subject_track ?? ""}
                  onChange={(event) => patchProfile({ subject_track: (event.target.value || null) as SubjectTrack | null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">请选择</option>
                  {subjectTracks.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">再选科目</span>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.map((subject) => (
                    <Button
                      key={subject}
                      type="button"
                      variant={profile.selectedSubjects.includes(subject) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSelectedSubject(subject)}
                    >
                      {subject}
                    </Button>
                  ))}
                </div>
              </div>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">目标专业</span>
                <Input value={majorText} onChange={(event) => setMajorText(event.target.value)} placeholder="用顿号或逗号分隔" />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">地域偏好</span>
                <Input value={cityText} onChange={(event) => setCityText(event.target.value)} placeholder="例如：郑州、洛阳、武汉" />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">院校层次偏好</span>
                <Input value={schoolTierText} onChange={(event) => setSchoolTierText(event.target.value)} placeholder="例如：双一流、省重点、公办本科" />
              </label>

              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</div> : null}
              {message ? <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">{message}</div> : null}
              <div className="md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : "保存画像"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>偏好策略</CardTitle>
              <CardDescription>这些策略用于过滤和重排推荐结果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 text-sm font-medium">画像完整度</div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${completeRate}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{completeRate}%</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">目标批次</div>
                <div className="flex flex-wrap gap-2">
                  {batchOptions.map((batch) => (
                    <Button
                      key={batch}
                      type="button"
                      variant={profile.targetBatches.includes(batch) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleBatch(batch)}
                    >
                      {batch}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                <label className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>接受民办院校</span>
                  <input
                    type="checkbox"
                    checked={profile.acceptsPrivate}
                    onChange={(event) => patchProfile({ acceptsPrivate: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>接受中外合作</span>
                  <input
                    type="checkbox"
                    checked={profile.acceptsCooperation}
                    onChange={(event) => patchProfile({ acceptsCooperation: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>接受独立学院或职业本科</span>
                  <input
                    type="checkbox"
                    checked={profile.acceptsIndependent}
                    onChange={(event) => patchProfile({ acceptsIndependent: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>接受服从调剂</span>
                  <input
                    type="checkbox"
                    checked={profile.acceptsAdjustment}
                    onChange={(event) => patchProfile({ acceptsAdjustment: event.target.checked })}
                  />
                </label>
                <label className="space-y-2 rounded-md border border-border p-3">
                  <span>学费预算</span>
                  <Input
                    value={profile.tuitionLimit ?? ""}
                    type="number"
                    onChange={(event) => patchProfile({ tuitionLimit: numberValue(event) })}
                    placeholder="元/年以内"
                  />
                </label>
                <label className="space-y-2 rounded-md border border-border p-3">
                  <span>就业倾向</span>
                  <Input
                    value={profile.employmentPreference ?? ""}
                    onChange={(event) => patchProfile({ employmentPreference: event.target.value || null })}
                    placeholder="例如：省内就业、互联网、体制内"
                  />
                </label>
                <label className="space-y-2 rounded-md border border-border p-3">
                  <span>升学倾向</span>
                  <Input
                    value={profile.furtherStudyPreference ?? ""}
                    onChange={(event) => patchProfile({ furtherStudyPreference: event.target.value || null })}
                    placeholder="例如：考研优先、保研机会、专升本"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.targetBatches.map((batch) => (
                  <Badge key={batch}>{batch}</Badge>
                ))}
                {profile.subject_track ? <Badge variant="outline">{profile.subject_track}</Badge> : null}
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </AppShell>
  );
}
