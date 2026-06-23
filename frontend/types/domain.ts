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
  id: string;
  name: string;
  year: number;
  province: string;
  score: number;
  rank: number;
  subjectTrack: SubjectTrack;
  selectedSubjects: string[];
  targetBatches: BatchType[];
  cityPreferences: string[];
  majorPreferences: string[];
  tuitionLimit: number;
  acceptsPrivate: boolean;
  acceptsCooperation: boolean;
  acceptsAdjustment: boolean;
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
