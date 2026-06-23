# 河南高考智能报考 Agent 最终规划书

## 1. 项目定位

本项目面向 2026 年河南省普通类高考生，提供智能志愿填报辅助服务。系统基于考生成绩、位次、选科、地域、专业、学费、院校偏好等信息，结合河南省 2026 年普通高校招生政策、招生计划、历年录取数据和院校招生章程，生成普通本科批和普通高职（专科）批志愿方案，并通过 Agent 提供可解释、可追溯的报考咨询。

系统定位为“报考辅助决策工具”，不替代考生本人填报志愿，不承诺录取结果。所有关键推荐必须能够说明依据，所有政策类回答必须尽量引用官方来源。

## 2. 一期建设范围

### 2.1 支持对象

- 河南省 2026 年普通类高考生
- 物理类、历史类考生
- 支持再选科目组合校验
- 支持考生和家长账号使用

### 2.2 支持批次

- 普通本科批
- 普通高职（专科）批

### 2.3 志愿规则重点

- 以院校专业组为志愿单位
- 普通本科批支持 48 个院校专业组志愿
- 普通高职（专科）批支持 48 个院校专业组志愿
- 每个院校专业组下包含专业志愿和是否服从调剂
- 按物理类、历史类分别做位次、计划和历史数据匹配
- 按选科要求过滤不可报院校专业组
- 按平行志愿原则解释投档逻辑

### 2.4 暂不支持范围

一期暂不支持：

- 本科提前批
- 专科提前批
- 艺术类
- 体育类
- 军警类
- 强基计划
- 国家专项
- 地方专项
- 高校专项
- 公费师范
- 医学定向
- 定向培养军士
- 高水平运动队

后续扩展时，通过新增批次规则、资格规则和对应数据源支持。

## 3. 总体产品形态

前端采用一个统一应用，不拆成两个独立前端。系统由统一登录入口进入，登录后根据账号角色进入用户端或管理端。

```text
统一登录页
  -> 后端校验账号、密码、角色、权限
  -> 普通用户进入用户端
  -> 管理员进入管理端
  -> 多角色账号进入入口选择页
```

### 3.1 用户端

面向考生和家长，核心功能：

- 注册、登录、退出
- 登录态校验
- 考生画像录入
- 成绩和位次录入
- 一分一段查询
- 批次线和可报批次判断
- 院校专业组检索
- 冲稳保推荐
- 志愿方案生成
- 志愿顺序调整
- 智能问答
- 院校和专业详情查看
- 志愿报告导出

建议路由：

```text
/login                  登录页
/select-portal          多角色入口选择页
/user                   用户端首页
/user/profile           考生画像
/user/chat              智能问答
/user/recommend         推荐结果
/user/universities      院校专业浏览
/user/universities/:id  院校详情
/user/plan              志愿方案
/user/reports           报告列表
```

### 3.2 管理端

面向运营人员、数据管理员、知识库管理员和系统管理员，核心功能：

- 用户账号管理
- 角色和权限管理
- 院校数据管理
- 专业数据管理
- 招生计划导入
- 历年录取数据导入
- 一分一段表导入
- 批次线管理
- 知识库文档管理
- 知识库切片、向量化、审核、发布
- Agent 对话日志查看
- 数据质量校验
- 审计日志查看

建议路由：

```text
/admin                  管理首页
/admin/users            用户管理
/admin/roles            角色权限
/admin/data-import      数据导入
/admin/universities     院校管理
/admin/majors           专业管理
/admin/score-lines      分数线管理
/admin/knowledge        知识库管理
/admin/agent-ops        Agent 运营
/admin/chat-logs        对话日志
/admin/audit-logs       审计日志
```

## 4. 技术栈选择

### 4.1 前端

最终选择：

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

选择理由：

- 单应用内同时承载用户端和管理端，Next.js 的文件路由和布局能力更适合
- TypeScript 保证业务表单和 API 类型稳定
- shadcn/ui 适合快速搭建后台、表单、表格、弹窗、筛选器
- Recharts 用于录取位次趋势、分数线趋势、冲稳保分布等可视化

说明：

- Claude 方案中的 Vite 更轻量，适合个人演示项目
- 本项目包含登录、角色路由、管理端、知识库、报告等复杂页面，统一采用 Next.js 更稳妥

### 4.2 后端

最终选择：

- Python
- FastAPI
- Pydantic
- SQLAlchemy 或 SQLModel
- Alembic
- Pandas
- Polars
- openpyxl

选择理由：

- FastAPI 适合构建类型清晰的 API 和流式 Agent 接口
- Python 在数据清洗、Excel 解析、AI/RAG 生态上更成熟
- Pydantic 适合约束复杂业务输入输出
- Alembic 支持数据库版本迁移

### 4.3 数据库与存储

最终选择：

- PostgreSQL：业务主库
- pgvector：知识库向量检索
- Redis：缓存、会话状态、异步任务状态
- 对象存储：原始 PDF、Excel、Word、报告文件

说明：

- Claude 方案中的 SQLite + ChromaDB 适合快速 demo
- 最终方案建议直接用 PostgreSQL + pgvector，减少后续迁移成本
- 如果只做本地演示，可以用 Docker Compose 启动 PostgreSQL 和 Redis

### 4.4 AI 与 Agent

最终选择：

- OpenAI 兼容 API 客户端
- 支持 DeepSeek、通义千问、智谱、OpenAI 等模型切换
- LangGraph 作为 Agent 编排框架
- LangGraph Tool Calling 调用后端业务工具
- LangGraph Checkpointer 持久化会话状态
- FastAPI SSE 或流式响应输出 Agent 过程
- Embedding 模型可使用 bge-small-zh、bge-m3 或厂商 embedding API

选择理由：

- 本项目 Agent 不是单轮问答，而是包含画像补全、规则校验、知识库检索、推荐生成、方案确认、报告生成的多步骤流程
- LangGraph 更适合表达有状态、多节点、可中断、可恢复的 Agent 工作流
- 推荐、校验、查询必须由后端工具完成，不能交给 LLM 自由生成
- FastAPI 仍作为后端 HTTP 服务入口，LangGraph 只负责 Agent 编排，不替代 FastAPI

## 5. 总体系统架构

```text
用户浏览器
  |
  |-- Next.js 统一前端
        |-- 登录页
        |-- 用户端
        |-- 管理端
        |
        v
FastAPI 后端
  |
  |-- auth              认证与权限
  |-- account           账号管理
  |-- user_profile      考生画像
  |-- policy_engine     河南 2026 规则引擎
  |-- admission_data    招生计划与录取数据
  |-- score_match       分数位次匹配
  |-- recommendation    冲稳保推荐
  |-- volunteer_plan    志愿方案
  |-- knowledge_base    知识库建设
  |-- rag_agent         Agent 编排
  |-- report            报告生成
  |-- audit_log         审计日志
        |
        v
数据层
  |-- PostgreSQL
  |-- pgvector
  |-- Redis
  |-- Object Storage
```

## 6. 推荐目录结构

```text
zhiyuan-agent/
  frontend/
    app/
      login/
      select-portal/
      user/
        page.tsx
        profile/
        chat/
        recommend/
        universities/
        plan/
        reports/
      admin/
        page.tsx
        users/
        roles/
        data-import/
        universities/
        majors/
        score-lines/
        knowledge/
        agent-ops/
        chat-logs/
        audit-logs/
    components/
      ui/
      layout/
      charts/
      forms/
    features/
      auth/
      user/
      admin/
      recommendation/
      knowledge-base/
      agent/
    lib/
      api-client.ts
      auth.ts
      permissions.ts
    types/
    styles/

  backend/
    app/
      api/
        routes/
          auth.py
          profile.py
          score.py
          admission.py
          recommendation.py
          volunteer_plan.py
          agent.py
          report.py
          admin_users.py
          admin_data.py
          admin_knowledge.py
      core/
        config.py
        database.py
        security.py
        llm.py
      modules/
        auth/
        account/
        user_profile/
        policy_engine/
        admission_data/
        score_match/
        recommendation/
        volunteer_plan/
        knowledge_base/
        rag_agent/
          graph.py
          state.py
          nodes.py
          edges.py
          tools.py
          prompts.py
          checkpointer.py
          streaming.py
        report/
        audit_log/
      models/
      schemas/
      services/
      repositories/
      tests/
    alembic/
    requirements.txt
    main.py

  data_pipeline/
    importers/
    cleaners/
    validators/
    mappers/
    chunkers/
    vectorize/
    jobs/

  docs/
    policy/
    data_dictionary/
    product/

  deploy/
    docker-compose.yml
    nginx/
    scripts/
```

## 7. 核心业务编排

### 7.1 用户登录与入口编排

```text
用户访问系统
  -> 进入 /login
  -> 输入账号密码
  -> FastAPI 校验账号状态和密码
  -> 生成 access token 和 refresh token
  -> 返回用户角色、权限、默认入口
  -> 普通用户进入 /user
  -> 管理员进入 /admin
  -> 多角色用户进入 /select-portal
  -> 前端路由守卫校验权限
  -> 后端接口再次校验 token 和权限
```

关键要求：

- 前端入口选择只是体验，不是安全边界
- 管理端 API 必须后端鉴权
- 用户只能访问自己的画像、方案和对话记录
- 管理员访问用户数据需要按角色限制并记录审计日志

### 7.2 管理端数据导入编排

吸收 Claude 方案中的数据导入逻辑，管理端提供可视化数据导入流程。

```text
管理员上传 Excel/CSV
  -> 后端保存原始文件
  -> pandas/openpyxl 解析
  -> 前端预览前 N 行
  -> 管理员选择数据类型
  -> 字段映射
  -> 数据格式校验
  -> 院校、专业、专业组代码归一化
  -> 重复数据检测
  -> 异常数据提示
  -> 确认导入
  -> 写入正式表或 staging 表
  -> 生成导入日志和质量报告
```

一期支持导入模板：

- 院校基础信息
- 专业基础信息
- 院校专业组
- 专业组内专业
- 招生计划
- 历年投档线
- 历年专业录取线
- 一分一段表
- 批次控制线

### 7.3 分数位次匹配编排

```text
用户输入成绩、位次、首选科目、再选科目
  -> 若没有位次，则通过一分一段表换算位次
  -> 判断物理类/历史类
  -> 查询批次控制线
  -> 判断可考虑本科批、专科批或仅专科批
  -> 按目标批次读取院校专业组和招生计划
  -> 按选科要求过滤不可报专业组
  -> 按地域、学费、院校类型、专业方向过滤
  -> 结合历年最低位次和招生计划变化计算风险
  -> 输出冲、稳、保、兜底候选池
```

位次匹配优先级：

```text
考生位次 > 分数
同科类位次 > 跨科类分数
近三年位次趋势 > 单一年份分数线
专业组数据 > 院校整体数据
2026 招生计划 > 历史计划
```

### 7.4 推荐生成编排

```text
输入考生画像
  -> policy_engine 校验批次资格和选科
  -> score_match 生成候选池
  -> recommendation 计算风险分
  -> preference_ranker 计算偏好匹配分
  -> 生成冲、稳、保、兜底分层
  -> 按风险偏好配置比例
  -> 生成 48 个院校专业组志愿草案
  -> 对每个专业组生成推荐理由、风险提示、来源引用
  -> 保存 recommendation_result
```

推荐分层：

- 冲：位次略低于历史录取区间或波动较大，机会存在但风险较高
- 稳：位次与历史区间匹配，且偏好匹配度较高
- 保：位次有明显安全边际
- 兜底：优先防滑档，保证批次录取概率

可配置比例：

```text
冲：20% - 30%
稳：35% - 45%
保：20% - 30%
兜底：5% - 10%
```

### 7.5 志愿方案生成编排

```text
推荐结果候选池
  -> 用户选择风险偏好
  -> 选择是否接受调剂
  -> 选择是否接受民办、中外合作、高收费、外省
  -> 系统生成 48 个院校专业组
  -> 每个专业组填充最多 6 个专业建议
  -> 用户拖拽调整顺序
  -> 系统重新校验志愿数量和选科规则
  -> 输出本科批/专科批志愿方案
  -> 生成报告或导出表格
```

方案输出应包含：

- 志愿序号
- 批次
- 院校代码
- 院校名称
- 专业组代码
- 专业组名称
- 专业建议
- 是否建议服从调剂
- 冲稳保标签
- 推荐理由
- 风险提示
- 数据来源

### 7.6 Agent 对话编排

Agent 编排层采用 LangGraph。FastAPI 负责接收 HTTP 请求、校验登录态和权限，然后将请求交给 LangGraph 执行。LangGraph 负责维护对话状态、调度节点、调用工具、处理中断和生成最终回答。

```text
用户提问
  -> FastAPI 校验 token 和用户权限
  -> 加载会话状态和考生画像
  -> LangGraph 进入 graph
  -> intent_node 识别意图
  -> profile_check_node 检查画像是否完整
  -> 缺少成绩、位次、选科、批次时进入 clarify_node 追问
  -> policy_check_node 调用规则引擎
  -> knowledge_retrieval_node 检索知识库
  -> recommendation_node 调用推荐引擎
  -> plan_generation_node 生成或更新志愿方案
  -> explain_node 汇总结构化结果和引用来源
  -> persist_node 保存消息、工具调用和引用日志
  -> FastAPI 通过 SSE 或流式响应返回
```

LangGraph 状态建议：

```text
AgentState
  conversation_id        会话 ID
  user_id                用户 ID
  messages               对话消息
  intent                 当前意图
  student_profile        考生画像
  missing_fields         缺失字段
  target_batch           目标批次
  policy_check_result    规则校验结果
  retrieved_chunks       知识库召回片段
  tool_calls             工具调用记录
  recommendations        推荐结果
  volunteer_plan         志愿方案
  citations              引用来源
  warnings               风险提示
  next_action            下一步动作
```

LangGraph 节点建议：

```text
load_context_node        加载用户画像、历史会话和权限上下文
intent_node              识别用户意图
profile_check_node       判断画像字段是否完整
clarify_node             生成追问
policy_check_node        调用政策规则引擎
knowledge_retrieval_node 检索知识库
recommendation_node      调用推荐引擎
plan_generation_node     生成志愿方案草案
human_review_node        人工确认或用户确认节点
explain_node             生成解释和引用
persist_node             保存会话、工具调用和引用
```

Agent 可调用工具：

```text
get_student_profile          获取考生画像
get_rank                     分数转位次
get_batch_line               查询批次线
check_policy_rules           校验批次、选科、志愿数量规则
search_school_groups         搜索院校专业组
query_admission_history      查询历年录取数据
recommend_chong_wen_bao      生成冲稳保候选
compare_schools              院校对比
compare_majors               专业对比
generate_volunteer_plan      生成志愿方案
search_knowledge_base        检索政策和章程知识库
generate_report              生成报告
```

Agent 回答要求：

- 不直接编造院校、专业组、招生计划或录取位次
- 推荐类回答必须调用推荐工具
- 政策类回答必须检索知识库
- 重要结论必须返回依据
- 无法确认时提示用户以官方发布信息为准
- 涉及最终 48 个志愿方案时，应进入用户确认或人工复核节点
- 每次 LangGraph 执行都要记录 thread_id、节点路径、工具调用、引用来源和最终输出

### 7.7 知识库建设编排

Agent 知识库是项目核心资产。管理端必须支持知识库的建设、审核、发布和追溯。

```text
管理员上传文档
  -> 保存原始文件到对象存储
  -> 提取文本和元数据
  -> 清洗页眉页脚、噪声和重复内容
  -> 按标题、条款、页面和语义结构切片
  -> 为 chunk 生成关键词和摘要
  -> 生成 embedding
  -> 写入 pgvector
  -> 管理员审核
  -> 发布到正式知识库
  -> Agent 检索时只使用 published 内容
```

知识库文档状态：

```text
draft       草稿
uploaded    已上传
parsed      已解析
chunked     已切片
embedded    已向量化
reviewing   待审核
published   已发布
archived    已归档
failed      处理失败
```

知识库内容类型：

- 河南省教育考试院政策文件
- 2026 招生工作规定
- 志愿填报说明
- 招生计划说明
- 院校招生章程
- 院校官网招生简章
- 专业介绍
- 常见问答
- 运营人员沉淀的报考规则说明

### 7.8 知识库数据清洗细则

知识库数据清洗必须作为独立流程处理，不能简单依赖文档解析结果直接切片入库。高考报考知识库的核心风险不是“检索不到”，而是“检索到了错误、过期、重复或断裂的信息”。因此每份文档进入向量库前，必须完成结构化清洗、元数据校验和质量评估。

清洗流程：

```text
原始文件
  -> 文件类型识别
  -> 文本抽取
  -> OCR 质量检查
  -> 基础文本清洗
  -> 表格结构还原
  -> 元数据标准化
  -> 内容去重
  -> 新旧版本识别
  -> 政策有效期校验
  -> 切片前结构标注
  -> 清洗质量评分
  -> 人工抽检
  -> 进入切片和向量化
```

文件级清洗：

- 识别 PDF、Word、Excel、HTML、图片扫描件等来源格式
- 保留原始文件、原始文件 hash、上传人、上传时间
- 检查文件是否损坏、是否重复上传
- 扫描件需要 OCR，并记录 OCR 置信度
- 对低质量 OCR 文档进入人工复核队列

文本级清洗：

- 删除页眉、页脚、页码、水印、版权导航、无关菜单
- 合并错误换行
- 修正常见 OCR 错误，例如年份、批次、院校代码、专业代码识别错误
- 统一全角半角、空格、标点和数字格式
- 保留政策条款编号、章节标题和项目符号
- 保留原始页码或段落位置，便于引用追溯
- 删除重复段落和跨页重复标题

表格级清洗：

- 对招生计划、分数线、一分一段表、院校专业组表格做结构化解析
- 保留表头、单位、批次、年份、科类、院校代码、专业组代码
- 检查表格列错位、合并单元格丢失、换页断表
- 对招生计划人数、最低分、最低位次等字段做类型校验
- 表格类数据优先进入结构化表，不只进入向量库
- 结构化数据和文本知识库之间建立来源关联

元数据清洗：

- 标准化省份、年份、批次、科类、院校、专业、文档类型
- 标准化来源单位，例如河南省教育考试院、阳光高考、院校官网
- 记录来源 URL、发布时间、生效时间、失效时间
- 标记适用范围，例如普通本科批、普通高职（专科）批
- 标记文档权威等级，例如官方政策、院校章程、运营整理、第三方资料

版本与有效期处理：

- 同一政策存在新旧版本时，默认只让最新有效版本参与检索
- 过期政策进入 archived 状态，不参与默认问答
- 同一院校招生章程按年份隔离，避免 2025 章程误用于 2026 回答
- 同一来源重复上传时，按 hash、标题、发布时间和正文相似度去重
- 清洗后生成数据版本号，推荐结果和 Agent 引用都记录版本

切片前结构标注：

- 标注标题层级、条款编号、表格标题、适用批次和适用科类
- 政策类文档优先按条款切片
- 招生章程优先按章节切片，例如录取规则、体检要求、外语要求、学费标准
- 院校专业介绍优先按院校、专业、培养方向切片
- 每个 chunk 必须带来源文档、页码或段落范围、年份、批次、状态

质量评分指标：

```text
text_extract_score       文本抽取质量
ocr_confidence           OCR 置信度
metadata_complete_score  元数据完整度
dedup_score              去重结果置信度
table_parse_score        表格解析质量
policy_validity_score    政策有效性评分
chunk_ready_score        切片准备评分
```

清洗失败处理：

- 元数据缺失严重的文档不能发布
- OCR 质量过低的文档不能自动向量化
- 表格解析列错位的数据不能进入正式招生数据表
- 无来源 URL 或无明确来源单位的政策类文档不能作为正式回答依据
- 清洗失败需要保存失败原因，并允许管理员修正后重新处理

管理端需要提供：

- 原文预览
- 清洗后文本预览
- 清洗差异对比
- 元数据编辑
- 表格解析预览
- 重复文档提示
- 过期文档提示
- 清洗质量评分
- 人工审核和发布操作

## 8. 数据模型设计

### 8.1 账号与权限

```text
users                     用户账号
roles                     角色
permissions               权限点
user_roles                用户角色关系
role_permissions          角色权限关系
refresh_tokens            刷新令牌或会话版本
audit_logs                审计日志
```

### 8.2 考生与方案

```text
student_profiles          考生画像
recommendation_results    推荐结果
volunteer_plans           志愿方案
volunteer_plan_items      志愿明细
reports                   报告
```

### 8.3 招生数据

```text
schools                   院校基础信息
majors                    专业基础信息
school_major_groups       院校专业组
group_majors              专业组内专业
admission_plans           2026 招生计划
historical_admissions     历年投档线、最低分、最低位次
major_admissions          历年专业录取数据
score_segments            一分一段表
batch_lines               批次控制线
subject_requirements      选科要求
school_charters           招生章程
```

### 8.4 知识库与 Agent

```text
knowledge_documents       知识库文档
knowledge_chunks          知识库切片
knowledge_embeddings      知识库向量
knowledge_ingest_jobs     知识库构建任务
knowledge_cleaning_jobs   知识库清洗任务
knowledge_cleaning_reports 知识库清洗报告
agent_conversations       Agent 会话
agent_messages            Agent 消息
agent_tool_calls          Agent 工具调用记录
agent_citations           Agent 引用来源
agent_threads             LangGraph thread 元数据
agent_checkpoints         LangGraph checkpoint 状态快照
agent_node_runs           LangGraph 节点执行记录
```

## 9. API 设计草案

### 9.1 认证与用户端 API

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me

POST /api/profile
GET  /api/profile/me
PUT  /api/profile/me

GET  /api/score/rank
GET  /api/score/batch-lines

POST /api/policy/check
POST /api/admission/search-groups
GET  /api/admission/groups/{id}

POST /api/recommendations/generate
GET  /api/recommendations/{id}

POST /api/volunteer-plans
GET  /api/volunteer-plans/{id}
PUT  /api/volunteer-plans/{id}

POST /api/agent/chat
POST /api/agent/chat/stream
GET  /api/agent/conversations
GET  /api/agent/conversations/{id}
GET  /api/agent/conversations/{id}/events

POST /api/reports/generate
GET  /api/reports/{id}
```

### 9.2 管理端 API

```text
GET  /api/admin/users
POST /api/admin/users
GET  /api/admin/users/{id}
PUT  /api/admin/users/{id}
POST /api/admin/users/{id}/disable
POST /api/admin/users/{id}/reset-password

GET  /api/admin/roles
POST /api/admin/roles
PUT  /api/admin/roles/{id}

POST /api/admin/data/import
GET  /api/admin/data/import-jobs
GET  /api/admin/data/import-jobs/{id}

GET  /api/admin/universities
POST /api/admin/universities
PUT  /api/admin/universities/{id}

GET  /api/admin/majors
POST /api/admin/majors
PUT  /api/admin/majors/{id}

GET  /api/admin/score-lines
POST /api/admin/score-lines/import

GET  /api/admin/knowledge/documents
POST /api/admin/knowledge/documents
GET  /api/admin/knowledge/documents/{id}
PUT  /api/admin/knowledge/documents/{id}
DELETE /api/admin/knowledge/documents/{id}

POST /api/admin/knowledge/documents/{id}/parse
POST /api/admin/knowledge/documents/{id}/clean
POST /api/admin/knowledge/documents/{id}/chunk
POST /api/admin/knowledge/documents/{id}/embed
POST /api/admin/knowledge/documents/{id}/review
POST /api/admin/knowledge/documents/{id}/publish
POST /api/admin/knowledge/documents/{id}/archive

GET  /api/admin/knowledge/documents/{id}/cleaning-report
GET  /api/admin/knowledge/cleaning-jobs
GET  /api/admin/agent/conversations
GET  /api/admin/agent/conversations/{id}
GET  /api/admin/audit-logs
```

## 10. 推荐结果数据结构示例

```json
{
  "batch": "普通本科批",
  "school_code": "10000",
  "school_name": "示例大学",
  "major_group_code": "001",
  "major_group_name": "示例大学第 001 专业组",
  "risk_level": "稳",
  "match_score": 86.5,
  "admission_risk_score": 38.2,
  "suggested_adjustment": true,
  "recommended_majors": [
    "计算机科学与技术",
    "软件工程",
    "人工智能"
  ],
  "reasons": [
    "满足该专业组选科要求",
    "考生位次与该专业组近年录取位次区间匹配",
    "符合用户专业和地域偏好"
  ],
  "warnings": [
    "建议核对招生章程中的身体条件限制",
    "若不服从调剂，退档风险会上升"
  ],
  "sources": [
    "2026 年招生计划",
    "历年投档数据",
    "院校招生章程"
  ]
}
```

## 11. 权限模型

建议角色：

```text
student_user        普通用户
parent_user         家长用户
admin               系统管理员
data_admin          数据管理员
kb_admin            知识库管理员
advisor             报考顾问
```

权限原则：

- 用户端必须登录后使用
- 管理端必须具有管理角色后使用
- 所有管理端接口必须后端鉴权
- 高风险操作必须记录审计日志
- 用户隐私数据分级可见
- 对话日志和推荐方案默认只对本人可见

## 12. 数据质量与风控

必须重点处理：

- 院校名称变更
- 院校代码变更
- 专业名称变更
- 专业代码变更
- 院校专业组代码变化
- 招生计划变化
- 中外合作、较高收费、单列专业
- 公办、民办、职业本科、高职专科区分
- 校区差异
- 学费差异
- 专业体检限制
- 外语语种限制
- 单科成绩限制
- 数据年份和批次混用

系统展示要求：

- 展示数据来源
- 展示数据更新时间
- 展示推荐不等于录取承诺
- 政策类回答展示引用来源
- 最终以河南省教育考试院和高校正式公布信息为准

## 13. LLM 配置建议

通过环境变量配置多模型和 LangGraph 运行参数：

```python
LLM_CONFIG = {
    "provider": "deepseek",
    "api_key": "ENV_LLM_API_KEY",
    "base_url": "https://api.deepseek.com/v1",
    "chat_model": "deepseek-chat",
    "embedding_model": "bge-m3",
    "agent_framework": "langgraph",
    "checkpointer": "postgres",
    "stream_mode": "events"
}
```

建议：

- 对话模型使用 OpenAI 兼容接口，便于切换 DeepSeek、通义千问、智谱等
- Embedding 模型优先选择中文效果稳定、成本可控的模型
- 模型输出不能作为唯一依据，必须结合工具调用结果
- 每次 Agent 请求生成或复用一个 `thread_id`
- LangGraph checkpoint 应持久化到数据库，避免长流程中断后丢失状态
- Agent 每次回答保留节点执行路径、工具调用日志和引用日志
- 流式响应建议输出 `node_start`、`tool_call`、`citation`、`message_delta`、`final` 等事件

## 14. 开发阶段规划

### Phase 1：基础工程与账号权限

- 初始化统一 Next.js 前端工程
- 初始化 FastAPI 后端工程
- 建立 PostgreSQL、Redis、pgvector
- 建立用户注册、登录、JWT、Refresh Token
- 建立 RBAC 角色权限模型
- 建立用户端和管理端基础布局
- 完成路由权限守卫

### Phase 2：数据导入与基础数据

- 建立招生数据表
- 实现管理端 Excel/CSV 上传
- 实现数据预览、字段映射、校验、入库
- 导入院校、专业、专业组、一分一段、批次线、历史录取数据
- 建立数据质量校验报告

### Phase 3：规则引擎与分数匹配

- 建立河南 2026 普通本科批和普通高职（专科）批规则配置
- 实现选科要求校验
- 实现分数转位次
- 实现批次资格判断
- 实现院校专业组可报性过滤
- 实现冲稳保候选池

### Phase 4：知识库与 Agent MVP

- 实现知识库文档上传
- 实现文档解析、数据清洗、清洗报告、切片、向量化
- 实现知识库审核和发布
- 实现 RAG 检索
- 实现 LangGraph `AgentState`
- 实现 LangGraph 节点：意图识别、画像检查、追问、规则校验、知识库检索、推荐、解释、持久化
- 实现 LangGraph 工具调用：规则引擎、位次查询、专业组检索、推荐引擎、知识库检索
- 实现 LangGraph checkpoint 持久化
- 实现 SSE 流式对话接口
- 实现用户端智能问答页面
- 实现管理端对话日志页面

### Phase 5：志愿方案与报告

- 实现 48 个院校专业组志愿方案生成
- 实现志愿拖拽调整
- 实现志愿方案二次校验
- 实现本科批和专科批方案保存
- 实现报告生成
- 实现导出 PDF 或表格

### Phase 6：质量增强与运营能力

- 推荐结果人工复核
- 多方案对比
- 家长版解释报告
- Agent 命中来源分析
- 知识库质量面板
- 数据版本管理
- 历史方案版本管理

## 15. 验证方式

系统上线前至少验证：

1. 数据导入链路是否能正确解析、预览、映射、校验和入库
2. 分数转位次是否与一分一段表一致
3. 批次判断是否符合 2026 河南普通本科批和普通高职（专科）批规则
4. 选科过滤是否能排除不可报院校专业组
5. 冲稳保分类是否符合位次逻辑
6. 志愿方案是否满足 48 个院校专业组限制
7. 知识库清洗是否能识别重复文档、过期文档、低质量 OCR、表格错位和元数据缺失
8. Agent 是否能正确调用工具，而不是凭空回答
9. 政策类回答是否带引用来源
10. 管理端权限是否能阻止越权访问
11. 用户是否只能访问自己的画像、方案和对话记录

## 16. 近期落地顺序

建议按以下顺序推进：

1. 确定数据来源、授权方式和数据模板
2. 建立统一 Next.js 前端和 FastAPI 后端
3. 完成登录、角色权限、用户端/管理端入口
4. 建立 PostgreSQL 数据模型
5. 完成管理端数据导入流程
6. 完成河南 2026 本科批和专科批规则配置
7. 完成分数位次匹配和选科过滤
8. 完成冲稳保推荐
9. 完成知识库上传、解析、清洗、切片、向量化、审核、发布
10. 完成 LangGraph Agent 编排、工具调用和 RAG 问答
11. 完成志愿方案生成和报告导出

## 17. 关键结论

本项目最终架构应坚持三条主线：

1. 数据主线：招生计划、历年录取、一分一段、院校专业组必须结构化、可校验、可更新。
2. 规则主线：河南 2026 普通本科批和普通高职（专科）批规则必须配置化，不能写死在 prompt 中。
3. Agent 主线：FastAPI 提供服务入口，LangGraph 负责有状态编排；Agent 只负责理解、调度、解释和生成报告，关键判断必须来自规则引擎、推荐引擎和知识库检索。

这样可以同时满足一期快速落地和后续扩展提前批、专项计划、艺术体育等复杂业务的需要。


