import type {
  AdminMajor,
  AdminSchool,
  AgentChatResponse,
  AdmissionPlan,
  BatchLine,
  CurrentUser,
  HistoricalAdmission,
  ImportDataType,
  ImportJob,
  ImportUploadResponse,
  ScoreSegment,
  StudentProfile
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
