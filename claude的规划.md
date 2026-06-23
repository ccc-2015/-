# 河南高考智能报考 Agent — 技术方案与项目架构（Claude 规划）

## 项目目标

面向河南省高考生的智能报考助手，帮助考生根据分数、兴趣、历史数据完成志愿填报决策。Web 网页应用，个人/演示规模。

---

## 一、技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| **前端框架** | React 18 + Vite | 轻量、快速启动，不需要 SSR |
| **UI 组件库** | shadcn/ui + Tailwind CSS | 组件质量高、可定制 |
| **前端语言** | TypeScript | 类型安全 |
| **后端框架** | Python FastAPI | 数据处理能力强（pandas），AI/LLM 生态最好 |
| **ORM** | SQLAlchemy + SQLite | SQLite 零配置，后续可迁移 PostgreSQL |
| **数据管道** | pandas + openpyxl | 处理 Excel/CSV 导入清洗 |
| **向量数据库** | ChromaDB（轻量嵌入） | 院校/专业信息的语义检索，RAG 用 |
| **AI 集成** | OpenAI 兼容 API | 国内主流模型(通义千问/DeepSeek)均支持此接口 |
| **Agent 模式** | Function Calling 自研轻量 Agent | 个人项目规模，核心逻辑自研更可控 |
| **图表** | Recharts | React 生态流行图表库 |

---

## 二、项目结构

```
zhiyuan-agent/
├── frontend/                       # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── chat/               # 对话相关组件
│   │   │   ├── score/              # 分数匹配相关
│   │   │   ├── university/         # 院校专业展示
│   │   │   └── charts/             # 可视化图表
│   │   ├── pages/
│   │   │   ├── Home.tsx            # 首页 — 分数输入 + 快速匹配
│   │   │   ├── Chat.tsx            # 智能问答页
│   │   │   ├── Recommend.tsx       # 推荐结果页
│   │   │   ├── Universities.tsx    # 院校专业浏览
│   │   │   ├── Plan.tsx            # 志愿方案生成
│   │   │   └── admin/              # 管理端页面
│   │   │       ├── Dashboard.tsx   # 管理首页概览
│   │   │       ├── DataImport.tsx  # 数据导入
│   │   │       ├── Universities.tsx # 院校管理
│   │   │       ├── Majors.tsx      # 专业管理
│   │   │       ├── ScoreLines.tsx  # 分数线管理
│   │   │       ├── Knowledge.tsx   # 知识库管理
│   │   │       └── ChatLogs.tsx    # 对话日志
│   │   ├── hooks/                  # 自定义 hooks
│   │   ├── api/                    # API 调用层
│   │   ├── types/                  # TypeScript 类型
│   │   └── lib/                    # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/                    # API 路由
│   │   │   ├── score.py            # 分数查询/匹配
│   │   │   ├── chat.py             # 对话接口（SSE 流式）
│   │   │   ├── recommend.py        # 推荐接口
│   │   │   ├── university.py       # 院校/专业 CRUD
│   │   │   ├── plan.py             # 志愿方案
│   │   │   └── data_import.py      # 数据导入
│   │   ├── services/               # 业务逻辑层
│   │   │   ├── score_service.py
│   │   │   ├── chat_service.py     # Agent 核心逻辑
│   │   │   ├── recommend_service.py
│   │   │   ├── plan_service.py
│   │   │   ├── data_import_service.py
│   │   │   └── knowledge_service.py # RAG 知识库
│   │   ├── models/                 # SQLAlchemy 模型
│   │   │   ├── university.py
│   │   │   ├── score_line.py
│   │   │   ├── major.py
│   │   │   └── user_plan.py
│   │   ├── core/                   # 核心配置
│   │   │   ├── config.py           # 环境变量、模型配置
│   │   │   ├── database.py         # 数据库连接
│   │   │   ├── llm.py              # LLM 客户端封装
│   │   │   └── tools.py            # Function Calling 工具定义
│   │   └── utils/
│   ├── data/                       # 原始数据文件存放
│   ├── requirements.txt
│   └── main.py
├── docker-compose.yml
└── README.md
```

---

## 三、数据库核心表设计

```sql
-- 院校表
universities (
  id, name, code,       -- 院校代码
  type,                  -- 综合/理工/师范/医学...
  tier,                  -- 985/211/双一流/一本/二本...
  province, city, website, description
)

-- 专业表
majors (
  id, name, code,        -- 专业代码
  category,              -- 学科门类(工学/理学/文学...)
  description, avg_salary, employment_rate
)

-- 院校-专业关联表
university_majors (
  id, university_id, major_id,
  degree,                -- 本科/专科
  is_key_major           -- 是否重点学科
)

-- 历年批次线（河南专用）
batch_lines (
  id, year, batch_type,  -- 理科一批/文科一批/...
  score, rank            -- 分数线 + 对应位次
)

-- 院校历年投档线
admission_scores (
  id, university_id, year,
  subject_type,          -- 理科/文科
  batch,                 -- 本科一批/二批...
  min_score, avg_score, max_score,
  min_rank,              -- 最低录取位次（核心匹配依据）
  plan_enrollment        -- 招生计划数
)

-- 专业录取分数线
major_scores (
  id, university_major_id, year,
  subject_type, min_score, min_rank, avg_score
)

-- 一分一段表
score_rank_table (
  id, year, subject_type, score, rank, cumulative_count
)

-- 用户志愿方案
user_plans (
  id, created_at, score, rank, subject_type,
  plan_data              -- JSON 存储方案内容
)
```

---

## 四、核心功能模块

### 4.1 数据导入模块
- CSV/Excel 文件上传 → pandas 解析 → 前端预览 → 字段映射 → 校验清洗 → 入库
- 支持模板：历年录取分数线、一分一段表、院校信息、专业目录
- 管理端操作，可视化流程

### 4.2 分数匹配引擎
- 输入：高考分数 + 文理科 + 年份
- 查一分一段表 → 定位全省位次
- 用位次匹配历年院校投档线 → 筛选可报考院校
- 三级分类：冲（位次略低于院校录取位次）/ 稳（位次相当）/ 保（位次高于院校录取位次）
- 筛选条件：批次、地域、院校类型、专业方向

### 4.3 智能报考 Agent
核心：RAG + Function Calling 的对话式报考顾问

```
用户提问 → LLM 理解意图 → 调度工具函数 → 生成回答
                ↓
      ┌─────────┼──────────┐
      │         │          │
  查分数线   查院校信息   位次转换
  推荐院校   冲稳保分析   志愿模板
```

Agent 可用的工具（Function Calling）：
- `search_universities` — 搜索院校
- `query_admission_score` — 查历年分数
- `get_rank` — 分数转位次
- `get_batch_line` — 查批次线
- `recommend_chong_wen_bao` — 冲稳保推荐
- `compare_universities` — 院校对比分析
- `generate_plan` — 生成志愿方案

### 4.4 RAG 知识库
- 将院校介绍、专业介绍、招生政策等文本向量化存储
- 用户问"XX大学的计算机专业怎么样"时 → 语义检索 → LLM 生成回答
- 管理端可上传文档、编辑知识条目

### 4.5 志愿方案生成
- 根据分数、兴趣、冲稳保策略生成完整的志愿表
- 支持河南平行志愿规则
- 导出为表格/图片

---

## 五、管理端页面

| 管理页面 | 路径 | 功能 |
|---------|------|------|
| 管理首页 | `/admin` | 数据概览（院校数、分数线年份覆盖、知识库条目数等） |
| 数据导入 | `/admin/data-import` | 上传 Excel/CSV，预览数据，字段映射，批量入库 |
| 院校管理 | `/admin/universities` | 院校列表、搜索筛选、新增/编辑、批量导入 |
| 专业管理 | `/admin/majors` | 专业目录管理、院校-专业关联 |
| 分数线管理 | `/admin/score-lines` | 批次线、投档线、一分一段表，按年份/科类筛选 |
| 知识库管理 | `/admin/knowledge` | 上传文档、编辑知识条目、查看索引状态 |
| 对话日志 | `/admin/chat-logs` | 查看用户与 Agent 的对话记录，调试 Agent 效果 |

## 六、用户端页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 输入分数/文理科 → 快速看到位次、批次线、冲稳保概览 |
| 智能问答 | `/chat` | 对话式报考咨询，Agent 主动调用工具 |
| 推荐结果 | `/recommend` | 冲稳保三栏展示，筛选/排序 |
| 院校详情 | `/university/:id` | 院校信息、历年分数趋势图、专业列表 |
| 志愿方案 | `/plan` | 生成完整志愿表，拖拽调整顺序，导出 |

---

## 七、LLM 配置

通过环境变量或 `.env` 文件配置，支持多模型切换：

```python
LLM_CONFIG = {
    "provider": "deepseek",     # deepseek / qwen / zhipu / siliconflow
    "api_key": os.getenv("LLM_API_KEY"),
    "base_url": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "embedding_model": "BAAI/bge-small-zh-v1.5",
}
```

推荐组合（个人项目成本优先）：
- **对话模型**：DeepSeek-V3（便宜且强）或通义千问 Turbo
- **嵌入模型**：硅基流动免费额度 + bge-small-zh-v1.5

---

## 八、开发路径

### Phase 1：基础搭建 + 数据导入
1. 初始化前后端项目（Vite + FastAPI）
2. 数据库模型定义 + SQLite 初始化
3. CSV/Excel 数据导入管道
4. 管理端基础页面（数据导入、院校管理）

### Phase 2：核心匹配引擎
1. 分数 → 位次查询
2. 位次匹配院校（冲稳保）
3. 院校/专业搜索 API
4. 用户端首页 + 推荐结果页

### Phase 3：智能 Agent
1. LLM 客户端封装 + 多模型配置
2. Function Calling 工具定义
3. 流式对话接口
4. RAG 知识库构建
5. 对话前端页面 + 管理端知识库

### Phase 4：志愿方案 + 可视化
1. 志愿方案生成逻辑
2. 历年分数趋势图
3. 方案导出功能
4. 最终打磨完善

---

## 九、验证方式

1. 导入真实河南省历年高考数据，验证分数 → 位次 → 匹配链路是否正确
2. 对话 Agent 能正确调用工具，回答逻辑自洽
3. 生成的志愿方案符合河南平行志愿规则
4. 管理端能完整管理所有数据，前端各路径无报错
