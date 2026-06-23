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

export type RiskLevel = "冲" | "稳" | "保" | "兜底" | "待评估";

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

export interface GeneratedRecommendationItem {
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
  risk_level: RiskLevel;
  match_score: number;
  admission_risk_score: number;
  suggested_adjustment: boolean;
  plan_count?: number | null;
  historical_min_score?: number | null;
  historical_min_rank?: number | null;
  rank_gap?: number | null;
  majors: string[];
  reasons: string[];
  warnings: string[];
  sources: string[];
}

export interface RecommendationGenerateResponse {
  profile_id: number;
  batch?: string | null;
  items: GeneratedRecommendationItem[];
  warnings: string[];
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

export type AdminKnowledgeStatus = "draft" | "published" | "archived";

export interface AdminKnowledgeDocument {
  id: number;
  title: string;
  category?: string | null;
  content: string;
  source_type?: string | null;
  source_url?: string | null;
  status: AdminKnowledgeStatus;
  tags?: string[] | null;
  version: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  chunk_count: number;
}

export interface KnowledgeDocumentPayload {
  title: string;
  category?: string | null;
  content: string;
  source_type?: string | null;
  source_url?: string | null;
  tags?: string[] | null;
  status: AdminKnowledgeStatus;
}

export interface KnowledgeChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  embedding_id?: string | null;
  metadata_json?: Record<string, unknown> | null;
  embedding_provider?: string | null;
  embedding_dimensions?: number | null;
  created_at: string;
}

export interface KnowledgeChunkRebuildResponse {
  document_id: number;
  chunk_count: number;
}

export interface KnowledgeCleaningIssue {
  severity: "error" | "warning" | string;
  message: string;
  code: string;
}

export interface KnowledgeCleaningReport {
  id: number;
  document_id: number;
  overall_score: number;
  status: "passed" | "warning" | "failed" | string;
  text_extract_score: number;
  ocr_confidence: number;
  metadata_complete_score: number;
  dedup_score: number;
  table_parse_score: number;
  policy_validity_score: number;
  chunk_ready_score: number;
  issues_json?: KnowledgeCleaningIssue[] | null;
  metrics_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
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

export interface AgentCitationMetadata {
  document_id?: number;
  chunk_id?: number | null;
  chunk_index?: number | null;
  version?: number;
  category?: string | null;
  score?: number | null;
  score_detail?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface AgentCitation {
  source_type: string;
  source_title: string;
  source_url?: string | null;
  metadata?: AgentCitationMetadata;
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

export interface AdminAgentMessage {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  created_at: string;
}

export interface AdminAgentToolCall {
  id: number;
  tool_name: string;
  arguments?: Record<string, unknown> | null;
  result_summary?: string | null;
  created_at: string;
}

export interface AdminAgentCitationLog {
  id: number;
  source_type: string;
  source_title: string;
  source_url?: string | null;
  metadata_json?: AgentCitationMetadata | null;
}

export interface AdminAgentNodeRun {
  id: number;
  thread_id: string;
  node_name: string;
  status: string;
  output_snapshot?: AgentEvent | null;
  created_at: string;
}

export interface AdminAgentConversationSummary {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  title?: string | null;
  thread_id?: string | null;
  message_count: number;
  tool_call_count: number;
  citation_count: number;
  node_run_count: number;
  last_message_at?: string | null;
  created_at: string;
}

export interface AdminAgentConversationDetail extends AdminAgentConversationSummary {
  messages: AdminAgentMessage[];
  tool_calls: AdminAgentToolCall[];
  citations: AdminAgentCitationLog[];
  node_runs: AdminAgentNodeRun[];
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

export interface VolunteerPlanItemPayload {
  group_id: number;
  order: number;
  risk_level?: string | null;
  match_score?: number | null;
  notes?: string | null;
  snapshot?: unknown;
}

export interface VolunteerPlanItem {
  id: number;
  group_id: number;
  order: number;
  risk_level?: string | null;
  match_score?: number | null;
  notes?: string | null;
  snapshot_json?: Record<string, unknown> | null;
}

export interface VolunteerPlan {
  id: number;
  user_id: number;
  title: string;
  batch: string;
  version: number;
  status: string;
  source: string;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  items: VolunteerPlanItem[];
}

export interface VolunteerPlanSaveRequest {
  title?: string | null;
  batch: string;
  items: VolunteerPlanItemPayload[];
  source?: string;
  metadata?: Record<string, unknown> | null;
}

export interface VolunteerPlanCheckResponse {
  plan: VolunteerPlan;
  policy_result: PolicyCheckResponse;
}

export interface VolunteerPlanExportItem {
  order: number;
  group_id: number;
  school_code?: string | null;
  school_name?: string | null;
  group_code?: string | null;
  group_name?: string | null;
  subject_track?: string | null;
  city?: string | null;
  risk_level?: string | null;
  match_score?: number | null;
  suggested_adjustment?: boolean | null;
  majors: string[];
  reasons: string[];
  warnings: string[];
  plan_count?: number | null;
  historical_min_rank?: number | null;
  notes?: string | null;
}

export interface VolunteerPlanExportResponse {
  plan_id: number;
  title: string;
  batch: string;
  version: number;
  status: string;
  exported_at: string;
  item_count: number;
  items: VolunteerPlanExportItem[];
}

export interface ReportProfileSnapshot {
  name?: string | null;
  year?: number | null;
  province?: string | null;
  score?: number | null;
  rank?: number | null;
  subject_track?: string | null;
  selected_subjects: string[];
  target_batches: string[];
  city_preferences: string[];
  major_preferences: string[];
  accepts_adjustment?: boolean | null;
}

export interface ReportPlanSnapshot {
  id: number;
  title: string;
  batch: string;
  version: number;
  item_count: number;
  updated_at: string;
}

export interface ReportSummary {
  risk_distribution: Record<string, number>;
  top_cities: string[];
  top_majors: string[];
  adjustment_count: number;
  warning_count: number;
}

export interface ReportVolunteerItem {
  order: number;
  group_id: number;
  school_name?: string | null;
  group_name?: string | null;
  group_code?: string | null;
  subject_track?: string | null;
  city?: string | null;
  risk_level?: string | null;
  match_score?: number | null;
  suggested_adjustment?: boolean | null;
  majors: string[];
  reasons: string[];
  warnings: string[];
}

export interface ReportPolicyCitation {
  title: string;
  excerpt: string;
  source_url?: string | null;
  document_id?: number | null;
  chunk_id?: number | null;
  version?: number | null;
  retrieval?: string | null;
  score?: number | null;
  fallback: boolean;
}

export interface ReportContent {
  profile: ReportProfileSnapshot;
  plan: ReportPlanSnapshot;
  summary: ReportSummary;
  volunteer_items: ReportVolunteerItem[];
  policy_citations: ReportPolicyCitation[];
  disclaimers: string[];
}

export interface UserReport {
  id: number;
  user_id: number;
  plan_id?: number | null;
  title: string;
  report_type: string;
  status: string;
  data_version: string;
  content_json: ReportContent;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerateRequest {
  plan_id: number;
  title?: string | null;
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
