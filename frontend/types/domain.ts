export type Portal = "user" | "admin";

export type UserRole =
  | "student_user"
  | "parent_user"
  | "admin"
  | "data_admin"
  | "kb_admin"
  | "advisor";

export type Permission =
  | "user:read_self"
  | "user:write_self"
  | "admin:users"
  | "admin:data"
  | "admin:knowledge"
  | "admin:agent"
  | "admin:audit";

export type SubjectTrack = "物理类" | "历史类";

export type BatchType = "普通本科批" | "普通高职（专科）批";

export type RiskLevel = "冲" | "稳" | "保" | "兜底";

export type KnowledgeStatus =
  | "draft"
  | "uploaded"
  | "parsed"
  | "cleaned"
  | "chunked"
  | "embedded"
  | "reviewing"
  | "published"
  | "archived"
  | "failed";

export interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  roles: UserRole[];
  permissions: Permission[];
  defaultPortal: Portal;
}

export interface AuthSession {
  token: string;
  user: CurrentUser;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  name: string | null;
  year: number;
  province: string;
  score: number | null;
  rank: number | null;
  subject_track: SubjectTrack | null;
  selectedSubjects: string[];
  targetBatches: BatchType[];
  cityPreferences: string[];
  majorPreferences: string[];
  schoolTierPreferences: string[];
  tuitionLimit: number | null;
  acceptsPrivate: boolean;
  acceptsCooperation: boolean;
  acceptsIndependent: boolean;
  acceptsAdjustment: boolean;
  employmentPreference: string | null;
  furtherStudyPreference: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationItem {
  id: string;
  batch: BatchType;
  schoolCode: string;
  schoolName: string;
  city: string;
  majorGroupCode: string;
  majorGroupName: string;
  riskLevel: RiskLevel;
  matchScore: number;
  admissionRiskScore: number;
  suggestedAdjustment: boolean;
  historicalMinRank: number;
  planCount: number;
  majors: string[];
  reasons: string[];
  warnings: string[];
  sources: string[];
}

export interface SchoolSummary {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  type: string;
  tier: string;
  website: string;
  description: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: string;
  sourceOrg: string;
  sourceUrl: string;
  year: number;
  batch: string;
  status: KnowledgeStatus;
  qualityScore: number;
  chunks: number;
  updatedAt: string;
}

export interface CleaningReport {
  documentId: string;
  textExtractScore: number;
  ocrConfidence: number;
  metadataCompleteScore: number;
  dedupScore: number;
  tableParseScore: number;
  policyValidityScore: number;
  chunkReadyScore: number;
  issues: string[];
}

export interface AdminMetric {
  label: string;
  value: string;
  helper: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export interface AgentCitation {
  source_type: string;
  source_title: string;
  source_url?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgentEvent {
  type: string;
  node?: string;
  tool?: string;
  status?: string;
  intent?: string;
  [key: string]: unknown;
}

export interface AgentToolCall {
  tool_name: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
}

export interface AgentChatResponse {
  conversation_id: number;
  thread_id: string;
  answer: string;
  events: AgentEvent[];
  tool_calls: AgentToolCall[];
  citations: AgentCitation[];
}

export interface AdminSchool {
  id: number;
  code: string;
  name: string;
  province?: string | null;
  city?: string | null;
  school_type?: string | null;
  tier?: string | null;
  ownership?: string | null;
  website?: string | null;
  description?: string | null;
}

export interface AdminMajor {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  level?: string | null;
  description?: string | null;
}

export type ImportDataType =
  | "schools"
  | "majors"
  | "school_major_groups"
  | "batch_lines"
  | "score_segments"
  | "admission_plans"
  | "historical_admissions";

export interface ImportJob {
  id: number;
  data_type: ImportDataType;
  original_filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  preview_rows?: Record<string, unknown>[] | null;
  field_names?: string[] | null;
  validation_errors?: Record<string, unknown>[] | null;
  created_at: string;
}

export interface ImportUploadResponse {
  job: ImportJob;
  required_fields: string[];
  optional_fields: string[];
}

export interface BatchLine {
  id: number;
  year: number;
  subject_track: string;
  batch: string;
  score: number;
  rank?: number | null;
}

export interface ScoreSegment {
  id: number;
  year: number;
  subject_track: string;
  score: number;
  rank: number;
  cumulative_count?: number | null;
}

export interface AdmissionPlan {
  id: number;
  year: number;
  school_id: number;
  group_id?: number | null;
  major_id?: number | null;
  batch: string;
  subject_track: string;
  plan_count: number;
  raw_data?: Record<string, unknown> | null;
}

export interface HistoricalAdmission {
  id: number;
  year: number;
  school_id: number;
  group_id?: number | null;
  batch: string;
  subject_track: string;
  min_score?: number | null;
  min_rank?: number | null;
  avg_score?: number | null;
  max_score?: number | null;
  plan_count?: number | null;
  raw_data?: Record<string, unknown> | null;
}

export interface PolicyCheckItem {
  group_id: number;
  order?: number | null;
}

export interface PolicyGroupCheckResult {
  group_id: number;
  order?: number | null;
  passed: boolean;
  errors: string[];
  warnings: string[];
  school_name?: string | null;
  group_name?: string | null;
  batch?: string | null;
  subject_track?: string | null;
  subject_requirements?: string | null;
}

export interface PolicyCheckResponse {
  passed: boolean;
  batch: string;
  max_groups: number;
  checked_group_count: number;
  errors: string[];
  warnings: string[];
  explanations: string[];
  group_results: PolicyGroupCheckResult[];
  parallel_volunteer_rule: string;
}

export interface RankLookupResponse {
  year: number;
  subject_track: string;
  score: number;
  rank?: number | null;
  matched_score?: number | null;
  cumulative_count?: number | null;
  source: string;
}

export interface SearchGroupItem {
  group_id: number;
  school_id: number;
  school_code: string;
  school_name: string;
  province?: string | null;
  city?: string | null;
  school_type?: string | null;
  tier?: string | null;
  group_code: string;
  group_name: string;
  year: number;
  batch: string;
  subject_track: string;
  subject_requirements?: string | null;
  plan_count?: number | null;
  historical_min_score?: number | null;
  historical_min_rank?: number | null;
  eligible: boolean;
  eligibility_errors: string[];
  eligibility_warnings: string[];
}

export interface SearchGroupsResponse {
  items: SearchGroupItem[];
  total: number;
  used_profile: boolean;
}
