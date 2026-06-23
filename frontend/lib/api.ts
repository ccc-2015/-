import type {
  AdminMajor,
  AdminAgentConversationDetail,
  AdminAgentConversationSummary,
  AdminKnowledgeDocument,
  AdminKnowledgeStatus,
  AdminSchool,
  AgentChatResponse,
  AdmissionPlan,
  BatchLine,
  CurrentUser,
  HistoricalAdmission,
  ImportDataType,
  ImportJob,
  ImportUploadResponse,
  KnowledgeChunk,
  KnowledgeChunkRebuildResponse,
  KnowledgeCleaningReport,
  KnowledgeDocumentPayload,
  PolicyCheckItem,
  PolicyCheckResponse,
  RankLookupResponse,
  ReportGenerateRequest,
  RecommendationGenerateResponse,
  ScoreSegment,
  SearchGroupsResponse,
  StudentProfile,
  UserReport,
  VolunteerPlan,
  VolunteerPlanCheckResponse,
  VolunteerPlanExportResponse,
  VolunteerPlanSaveRequest
} from "@/types/domain";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const bodyIsFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!headers.has("Content-Type") && options.body && !bodyIsFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = "请求失败，请稍后重试";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep the generic message when the backend returns non-JSON errors.
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type BackendUser = {
  id: number;
  username: string;
  phone?: string | null;
  display_name: string;
  roles: CurrentUser["roles"];
  permissions: CurrentUser["permissions"];
  default_portal: CurrentUser["defaultPortal"];
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

type BackendStudentProfile = {
  id: number;
  user_id: number;
  name: string | null;
  year: number;
  province: string;
  score: number | null;
  rank: number | null;
  subject_track: StudentProfile["subject_track"];
  selected_subjects: string[];
  target_batches: StudentProfile["targetBatches"];
  city_preferences: string[];
  major_preferences: string[];
  school_tier_preferences: string[];
  tuition_limit: number | null;
  accepts_private: boolean;
  accepts_cooperation: boolean;
  accepts_independent: boolean;
  accepts_adjustment: boolean;
  employment_preference: string | null;
  further_study_preference: string | null;
  created_at: string;
  updated_at: string;
};

function mapUser(user: BackendUser): CurrentUser {
  return {
    id: String(user.id),
    name: user.display_name || user.username,
    phone: user.phone ?? user.username,
    roles: user.roles,
    permissions: user.permissions,
    defaultPortal: user.default_portal
  };
}

function mapStudentProfile(profile: BackendStudentProfile): StudentProfile {
  return {
    id: profile.id,
    user_id: profile.user_id,
    name: profile.name,
    year: profile.year,
    province: profile.province,
    score: profile.score,
    rank: profile.rank,
    subject_track: profile.subject_track,
    selectedSubjects: profile.selected_subjects,
    targetBatches: profile.target_batches,
    cityPreferences: profile.city_preferences,
    majorPreferences: profile.major_preferences,
    schoolTierPreferences: profile.school_tier_preferences,
    tuitionLimit: profile.tuition_limit,
    acceptsPrivate: profile.accepts_private,
    acceptsCooperation: profile.accepts_cooperation,
    acceptsIndependent: profile.accepts_independent,
    acceptsAdjustment: profile.accepts_adjustment,
    employmentPreference: profile.employment_preference,
    furtherStudyPreference: profile.further_study_preference,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

function toProfilePayload(profile: StudentProfile) {
  return {
    name: profile.name,
    year: profile.year,
    province: profile.province,
    score: profile.score,
    rank: profile.rank,
    subject_track: profile.subject_track,
    selected_subjects: profile.selectedSubjects,
    target_batches: profile.targetBatches,
    city_preferences: profile.cityPreferences,
    major_preferences: profile.majorPreferences,
    school_tier_preferences: profile.schoolTierPreferences,
    tuition_limit: profile.tuitionLimit,
    accepts_private: profile.acceptsPrivate,
    accepts_cooperation: profile.acceptsCooperation,
    accepts_independent: profile.acceptsIndependent,
    accepts_adjustment: profile.acceptsAdjustment,
    employment_preference: profile.employmentPreference,
    further_study_preference: profile.furtherStudyPreference
  };
}

export async function login(username: string, password: string) {
  const response = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  return {
    token: response.access_token,
    user: mapUser(response.user)
  };
}

export async function getCurrentUser(token: string) {
  const user = await request<BackendUser>("/api/auth/me", { token });
  return mapUser(user);
}

export async function lookupRank(token: string, params: { year: string; subjectTrack: string; score: string }) {
  return request<RankLookupResponse>(
    withQuery("/api/score/rank", {
      year: params.year,
      subject_track: params.subjectTrack,
      score: params.score
    }),
    { token }
  );
}

export async function listUserBatchLines(token: string, filters: { year?: string; subjectTrack?: string } = {}) {
  return request<BatchLine[]>(
    withQuery("/api/score/batch-lines", {
      year: filters.year,
      subject_track: filters.subjectTrack
    }),
    { token }
  );
}

export async function getMyProfile(token: string) {
  const profile = await request<BackendStudentProfile>("/api/profile/me", { token });
  return mapStudentProfile(profile);
}

export async function updateMyProfile(token: string, profile: StudentProfile) {
  const updated = await request<BackendStudentProfile>("/api/profile/me", {
    method: "PUT",
    token,
    body: JSON.stringify(toProfilePayload(profile))
  });
  return mapStudentProfile(updated);
}

export async function sendAgentMessage({
  token,
  message,
  conversationId,
  threadId
}: {
  token: string;
  message: string;
  conversationId?: number;
  threadId?: string;
}) {
  return request<AgentChatResponse>("/api/agent/chat", {
    method: "POST",
    token,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      thread_id: threadId
    })
  });
}

export async function listAdminAgentConversations(token: string, limit = 50) {
  return request<AdminAgentConversationSummary[]>(
    withQuery("/api/admin/agent/conversations", {
      limit: String(limit)
    }),
    { token }
  );
}

export async function getAdminAgentConversation({ token, conversationId }: { token: string; conversationId: number }) {
  return request<AdminAgentConversationDetail>(`/api/admin/agent/conversations/${conversationId}`, { token });
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function listAdminSchools(token: string, keyword?: string) {
  return request<AdminSchool[]>(withQuery("/api/admin/universities", { keyword }), { token });
}

export async function listAdminMajors(token: string, keyword?: string) {
  return request<AdminMajor[]>(withQuery("/api/admin/majors", { keyword }), { token });
}

export async function listKnowledgeDocuments(
  token: string,
  filters: { keyword?: string; status?: AdminKnowledgeStatus | ""; category?: string } = {}
) {
  return request<AdminKnowledgeDocument[]>(
    withQuery("/api/admin/knowledge/documents", {
      keyword: filters.keyword,
      status: filters.status || undefined,
      category: filters.category
    }),
    { token }
  );
}

export async function createKnowledgeDocument({
  token,
  payload
}: {
  token: string;
  payload: KnowledgeDocumentPayload;
}) {
  return request<AdminKnowledgeDocument>("/api/admin/knowledge/documents", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateKnowledgeDocument({
  token,
  documentId,
  payload
}: {
  token: string;
  documentId: number;
  payload: Partial<KnowledgeDocumentPayload>;
}) {
  return request<AdminKnowledgeDocument>(`/api/admin/knowledge/documents/${documentId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteKnowledgeDocument({ token, documentId }: { token: string; documentId: number }) {
  await request<void>(`/api/admin/knowledge/documents/${documentId}`, {
    method: "DELETE",
    token
  });
}

export async function uploadKnowledgeDocument({
  token,
  file,
  payload
}: {
  token: string;
  file: File;
  payload: Omit<KnowledgeDocumentPayload, "content">;
}) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("status", payload.status);
  if (payload.title) {
    formData.set("title", payload.title);
  }
  if (payload.category) {
    formData.set("category", payload.category);
  }
  if (payload.source_type) {
    formData.set("source_type", payload.source_type);
  }
  if (payload.source_url) {
    formData.set("source_url", payload.source_url);
  }
  if (payload.tags?.length) {
    formData.set("tags", payload.tags.join("、"));
  }

  return request<AdminKnowledgeDocument>("/api/admin/knowledge/documents/upload", {
    method: "POST",
    token,
    body: formData
  });
}

export async function rebuildKnowledgeChunks({ token, documentId }: { token: string; documentId: number }) {
  return request<KnowledgeChunkRebuildResponse>(`/api/admin/knowledge/documents/${documentId}/chunks/rebuild`, {
    method: "POST",
    token
  });
}

export async function listKnowledgeChunks({ token, documentId }: { token: string; documentId: number }) {
  return request<KnowledgeChunk[]>(`/api/admin/knowledge/documents/${documentId}/chunks`, { token });
}

export async function getKnowledgeCleaningReport({ token, documentId }: { token: string; documentId: number }) {
  return request<KnowledgeCleaningReport>(`/api/admin/knowledge/documents/${documentId}/cleaning-report`, { token });
}

export async function listBatchLines(token: string, filters: { year?: string; subjectTrack?: string; batch?: string } = {}) {
  return request<BatchLine[]>(
    withQuery("/api/admin/batch-lines", {
      year: filters.year,
      subject_track: filters.subjectTrack,
      batch: filters.batch
    }),
    { token }
  );
}

export async function listScoreSegments(token: string, filters: { year?: string; subjectTrack?: string } = {}) {
  return request<ScoreSegment[]>(
    withQuery("/api/admin/score-segments", {
      year: filters.year,
      subject_track: filters.subjectTrack
    }),
    { token }
  );
}

export async function listAdmissionPlans(token: string, filters: { year?: string; subjectTrack?: string; batch?: string } = {}) {
  return request<AdmissionPlan[]>(
    withQuery("/api/admin/admission-plans", {
      year: filters.year,
      subject_track: filters.subjectTrack,
      batch: filters.batch
    }),
    { token }
  );
}

export async function listHistoricalAdmissions(token: string, filters: { year?: string; subjectTrack?: string; batch?: string } = {}) {
  return request<HistoricalAdmission[]>(
    withQuery("/api/admin/historical-admissions", {
      year: filters.year,
      subject_track: filters.subjectTrack,
      batch: filters.batch
    }),
    { token }
  );
}

export async function listImportJobs(token: string) {
  return request<ImportJob[]>("/api/admin/data/import-jobs", { token });
}

export async function uploadImportFile({
  token,
  dataType,
  file
}: {
  token: string;
  dataType: ImportDataType;
  file: File;
}) {
  const formData = new FormData();
  formData.set("data_type", dataType);
  formData.set("file", file);

  return request<ImportUploadResponse>("/api/admin/data/import", {
    method: "POST",
    token,
    body: formData
  });
}

export async function confirmImportJob({
  token,
  jobId,
  fieldMapping
}: {
  token: string;
  jobId: number;
  fieldMapping: Record<string, string>;
}) {
  return request<ImportJob>(`/api/admin/data/import-jobs/${jobId}/confirm`, {
    method: "POST",
    token,
    body: JSON.stringify({ field_mapping: fieldMapping })
  });
}

export async function checkPolicy({
  token,
  batch,
  groupItems
}: {
  token: string;
  batch: string;
  groupItems: PolicyCheckItem[];
}) {
  return request<PolicyCheckResponse>("/api/policy/check", {
    method: "POST",
    token,
    body: JSON.stringify({
      batch,
      group_items: groupItems
    })
  });
}

export async function getCurrentVolunteerPlan(token: string, batch?: string) {
  return request<VolunteerPlan | null>(
    withQuery("/api/volunteer/plans/current", {
      batch
    }),
    { token }
  );
}

export async function listVolunteerPlans({ token, batch }: { token: string; batch?: string }) {
  return request<VolunteerPlan[]>(
    withQuery("/api/volunteer/plans", {
      batch
    }),
    { token }
  );
}

export async function saveCurrentVolunteerPlan({
  token,
  payload
}: {
  token: string;
  payload: VolunteerPlanSaveRequest;
}) {
  return request<VolunteerPlan>("/api/volunteer/plans/current", {
    method: "PUT",
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateVolunteerPlan({
  token,
  planId,
  payload
}: {
  token: string;
  planId: number;
  payload: VolunteerPlanSaveRequest;
}) {
  return request<VolunteerPlan>(`/api/volunteer/plans/${planId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload)
  });
}

export async function copyVolunteerPlan({ token, planId, title }: { token: string; planId: number; title?: string }) {
  return request<VolunteerPlan>(`/api/volunteer/plans/${planId}/copy`, {
    method: "POST",
    token,
    body: JSON.stringify({
      title
    })
  });
}

export async function deleteVolunteerPlan({ token, planId }: { token: string; planId: number }) {
  await request<void>(`/api/volunteer/plans/${planId}`, {
    method: "DELETE",
    token
  });
}

export async function checkVolunteerPlan({ token, planId }: { token: string; planId: number }) {
  return request<VolunteerPlanCheckResponse>(`/api/volunteer/plans/${planId}/check`, {
    method: "POST",
    token
  });
}

export async function exportVolunteerPlan({ token, planId }: { token: string; planId: number }) {
  return request<VolunteerPlanExportResponse>(`/api/volunteer/plans/${planId}/export`, {
    token
  });
}

export async function listReports(token: string) {
  return request<UserReport[]>("/api/reports", { token });
}

export async function generateReport({ token, payload }: { token: string; payload: ReportGenerateRequest }) {
  return request<UserReport>("/api/reports/generate", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function getReport({ token, reportId }: { token: string; reportId: number }) {
  return request<UserReport>(`/api/reports/${reportId}`, { token });
}

export async function exportReportCsv({ token, reportId }: { token: string; reportId: number }) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/export`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new ApiError("报告导出失败", response.status);
  }
  return response.blob();
}

export async function searchAdmissionGroups({
  token,
  keyword,
  year,
  batch,
  subjectTrack,
  useProfile,
  onlyEligible,
  limit
}: {
  token: string;
  keyword?: string;
  year?: string;
  batch?: string;
  subjectTrack?: string;
  useProfile: boolean;
  onlyEligible: boolean;
  limit?: number;
}) {
  return request<SearchGroupsResponse>("/api/admission/search-groups", {
    method: "POST",
    token,
    body: JSON.stringify({
      keyword: keyword?.trim() || null,
      year: year ? Number(year) : null,
      batch: batch?.trim() || null,
      subject_track: subjectTrack?.trim() || null,
      use_profile: useProfile,
      only_eligible: onlyEligible,
      limit: limit ?? 50
    })
  });
}

export async function generateRecommendations({
  token,
  batch,
  limit,
  onlyEligible
}: {
  token: string;
  batch?: string;
  limit?: number;
  onlyEligible?: boolean;
}) {
  return request<RecommendationGenerateResponse>("/api/recommendations/generate", {
    method: "POST",
    token,
    body: JSON.stringify({
      batch: batch?.trim() || null,
      limit: limit ?? 30,
      only_eligible: onlyEligible ?? true
    })
  });
}
