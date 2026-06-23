import type {
  AdminMetric,
  ChatMessage,
  CleaningReport,
  CurrentUser,
  KnowledgeDocument,
  RecommendationItem,
  SchoolSummary,
  StudentProfile
} from "@/types/domain";

export const mockUsers: Record<"student" | "admin" | "multiRole", CurrentUser> = {
  student: {
    id: "u_1001",
    name: "李同学",
    phone: "13800000001",
    roles: ["student_user"],
    permissions: ["user:read_self", "user:write_self"],
    defaultPortal: "user"
  },
  admin: {
    id: "u_9001",
    name: "知识库管理员",
    phone: "13800000002",
    roles: ["admin", "kb_admin", "data_admin"],
    permissions: [
      "user:read_self",
      "admin:users",
      "admin:data",
      "admin:knowledge",
      "admin:agent",
      "admin:audit"
    ],
    defaultPortal: "admin"
  },
  multiRole: {
    id: "u_7001",
    name: "报考顾问",
    phone: "13800000003",
    roles: ["student_user", "advisor", "kb_admin"],
    permissions: ["user:read_self", "user:write_self", "admin:knowledge", "admin:agent"],
    defaultPortal: "user"
  }
};

export const mockProfile: StudentProfile = {
  id: 1,
  user_id: 1,
  name: "李同学",
  year: 2026,
  province: "河南",
  score: 568,
  rank: 58620,
  subject_track: "物理类",
  selectedSubjects: ["化学", "生物"],
  targetBatches: ["普通本科批", "普通高职（专科）批"],
  cityPreferences: ["郑州", "洛阳", "武汉", "西安"],
  majorPreferences: ["计算机类", "电子信息类", "自动化"],
  schoolTierPreferences: ["双一流", "省重点"],
  tuitionLimit: 16000,
  acceptsPrivate: false,
  acceptsCooperation: false,
  acceptsIndependent: false,
  acceptsAdjustment: true,
  employmentPreference: "省内就业优先",
  furtherStudyPreference: "考研机会",
  created_at: "2026-06-20T00:00:00",
  updated_at: "2026-06-20T00:00:00"
};

export const mockRecommendations: RecommendationItem[] = [
  {
    id: "rec_1",
    batch: "普通本科批",
    schoolCode: "10459",
    schoolName: "郑州大学",
    city: "郑州",
    majorGroupCode: "10459-012",
    majorGroupName: "物理+化学专业组",
    riskLevel: "冲",
    matchScore: 82,
    admissionRiskScore: 72,
    suggestedAdjustment: true,
    historicalMinRank: 54500,
    planCount: 188,
    majors: ["计算机类", "电子信息类", "自动化类"],
    reasons: ["满足物理+化学选科要求", "地域偏好匹配", "专业方向与用户偏好一致"],
    warnings: ["近年位次波动较大", "热门专业建议服从调剂"],
    sources: ["2026 招生计划", "历年投档数据", "院校招生章程"]
  },
  {
    id: "rec_2",
    batch: "普通本科批",
    schoolCode: "10464",
    schoolName: "河南科技大学",
    city: "洛阳",
    majorGroupCode: "10464-006",
    majorGroupName: "物理+化学专业组",
    riskLevel: "稳",
    matchScore: 89,
    admissionRiskScore: 38,
    suggestedAdjustment: true,
    historicalMinRank: 64200,
    planCount: 240,
    majors: ["软件工程", "数据科学与大数据技术", "机械设计制造及其自动化"],
    reasons: ["近三年最低位次与考生位次匹配", "计划数较稳定", "洛阳符合地域偏好"],
    warnings: ["需关注不同专业学费差异"],
    sources: ["2026 招生计划", "历年投档数据"]
  },
  {
    id: "rec_3",
    batch: "普通本科批",
    schoolCode: "10475",
    schoolName: "河南大学",
    city: "开封",
    majorGroupCode: "10475-010",
    majorGroupName: "物理+不限专业组",
    riskLevel: "稳",
    matchScore: 84,
    admissionRiskScore: 42,
    suggestedAdjustment: true,
    historicalMinRank: 62000,
    planCount: 96,
    majors: ["经济学", "地理科学", "教育技术学"],
    reasons: ["院校层次匹配", "位次处于可尝试区间", "省内院校通勤和信息透明度较高"],
    warnings: ["部分专业方向与计算机偏好弱相关"],
    sources: ["历年投档数据", "院校招生章程"]
  },
  {
    id: "rec_4",
    batch: "普通高职（专科）批",
    schoolCode: "10835",
    schoolName: "河南职业技术学院",
    city: "郑州",
    majorGroupCode: "10835-003",
    majorGroupName: "物理类专业组",
    riskLevel: "兜底",
    matchScore: 78,
    admissionRiskScore: 15,
    suggestedAdjustment: true,
    historicalMinRank: 165000,
    planCount: 460,
    majors: ["计算机网络技术", "软件技术", "人工智能技术应用"],
    reasons: ["专科批安全边际大", "专业方向匹配", "郑州地域匹配"],
    warnings: ["作为兜底方案时需关注是否愿意就读专科批"],
    sources: ["2026 招生计划", "历年投档数据"]
  }
];

export const mockSchools: SchoolSummary[] = [
  {
    id: "school_1",
    code: "10459",
    name: "郑州大学",
    province: "河南",
    city: "郑州",
    type: "综合",
    tier: "双一流",
    website: "https://www.zzu.edu.cn",
    description: "河南省内综合实力较强的综合类高校，专业覆盖面广。"
  },
  {
    id: "school_2",
    code: "10464",
    name: "河南科技大学",
    province: "河南",
    city: "洛阳",
    type: "理工",
    tier: "省重点",
    website: "https://www.haust.edu.cn",
    description: "工科特色明显，机械、材料、计算机等方向适合理工类考生重点关注。"
  },
  {
    id: "school_3",
    code: "10475",
    name: "河南大学",
    province: "河南",
    city: "开封",
    type: "综合",
    tier: "双一流",
    website: "https://www.henu.edu.cn",
    description: "综合类院校，师范、人文社科和部分理工专业均有布局。"
  }
];

export const mockKnowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "kb_1",
    title: "河南省2026年普通高校招生工作规定",
    type: "官方政策",
    sourceOrg: "河南省教育考试院",
    sourceUrl: "https://www.haeea.cn/",
    year: 2026,
    batch: "普通本科批/普通高职（专科）批",
    status: "published",
    qualityScore: 96,
    chunks: 128,
    updatedAt: "2026-06-20 14:22"
  },
  {
    id: "kb_2",
    title: "某高校2026年本科招生章程",
    type: "招生章程",
    sourceOrg: "院校官网",
    sourceUrl: "https://example.edu.cn",
    year: 2026,
    batch: "普通本科批",
    status: "reviewing",
    qualityScore: 84,
    chunks: 42,
    updatedAt: "2026-06-20 13:10"
  },
  {
    id: "kb_3",
    title: "2025年旧版志愿填报问答",
    type: "常见问答",
    sourceOrg: "运营整理",
    sourceUrl: "-",
    year: 2025,
    batch: "普通类",
    status: "archived",
    qualityScore: 62,
    chunks: 31,
    updatedAt: "2026-06-19 19:40"
  }
];

export const mockCleaningReport: CleaningReport = {
  documentId: "kb_1",
  textExtractScore: 0.98,
  ocrConfidence: 1,
  metadataCompleteScore: 0.94,
  dedupScore: 0.91,
  tableParseScore: 0.86,
  policyValidityScore: 1,
  chunkReadyScore: 0.93,
  issues: ["第 18 页表格存在跨页断表，已人工确认", "部分院校章程来源 URL 待补充"]
};

export const mockAdminMetrics: AdminMetric[] = [
  { label: "用户账号", value: "1,286", helper: "较昨日新增 42" },
  { label: "招生数据年份", value: "2023-2026", helper: "核心数据覆盖中" },
  { label: "知识库文档", value: "236", helper: "已发布 184 份" },
  { label: "今日 Agent 会话", value: "3,918", helper: "LangGraph 节点成功率 97.2%" }
];

export const mockChat: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "我物理类 568 分，位次 58620，想学计算机，省内优先，应该怎么报？"
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "你的选科满足大多数计算机类专业组要求。按当前画像，建议本科批以省内理工和综合类院校为主，设置少量冲刺郑州大学相关专业组，主体放在河南科技大学、河南理工大学等稳妥区间，并保留专科批兜底方案。",
    citations: ["2026 招生计划", "历年投档数据", "河南省2026年普通高校招生工作规定"]
  }
];
