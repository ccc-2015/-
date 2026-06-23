# 河南高考智能报考 Agent 一期规划

## 1. 项目目标

面向 2026 年河南省普通类高考生，建设一个智能报考辅助 Agent，帮助考生基于成绩、位次、选科、地域、专业、学费、院校偏好等信息，生成普通本科批和普通高职（专科）批志愿方案，并提供可解释、可追溯的推荐依据。

本系统定位为“报考辅助决策工具”，不替代考生本人填报志愿，不承诺录取结果。所有政策判断、选科匹配、可报性校验和推荐解释都应尽量引用权威来源。

## 2. 一期范围

### 2.1 支持对象

- 河南省 2026 年普通类高考生
- 首选科目：物理类、历史类
- 再选科目：思想政治、地理、化学、生物等组合

### 2.2 支持批次

- 普通本科批
- 普通高职（专科）批

### 2.3 暂不支持范围

一期暂不支持以下特殊批次或类型：

- 本科提前批
- 专科提前批
- 艺术类
- 体育类
- 军警类
- 强基计划
- 高校专项
- 国家专项
- 地方专项
- 公费师范
- 医学定向
- 定向培养军士
- 高水平运动队
- 中外特殊招生路径

后续可以通过扩展批次规则、资格规则和数据表来逐步支持。

## 3. 政策与业务约束

根据河南省教育考试院已发布的 2026 年普通高校招生工作相关文件，河南 2026 年普通高考采用新高考模式，普通类志愿以院校专业组为基本单位。

一期系统需要重点支持：

- 按物理类、历史类分别进行位次和计划匹配
- 按院校专业组选科要求进行可报性校验
- 普通本科批支持 48 个院校专业组志愿
- 普通高职（专科）批支持 48 个院校专业组志愿
- 每个院校专业组下支持专业志愿和是否服从调剂
- 平行志愿应按“分数优先、遵循志愿、一轮投档”的原则进行解释

关键原则：

- 政策规则不能写死在 Agent prompt 中，应沉淀到规则引擎
- 每条推荐应能说明推荐依据
- 每条风险提示应能追溯到招生计划、历年录取数据、招生章程或政策文件
- Agent 不能凭空生成招生计划、录取位次、选科要求或政策条款

参考来源：

- 河南省教育考试院：https://www.haeea.cn/
- 河南省 2026 年普通高校招生工作通知：https://www.haeea.cn/a/202604/43670_13f9a9d1.shtml
- 河南省 2026 年普通高校招生工作规定 PDF：https://xcoss.henan.gov.cn/typtfile/20260427/cc9d5c1a332341f0a7d9223f54f0cf62.pdf

## 4. 总体技术栈

### 4.1 前端

推荐：

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

前端建议采用一个统一的 Next.js 应用，在同一个前端工程中集成用户端和管理端：

- 用户端：面向考生和家长
- 管理端：面向运营人员、数据管理员、教研人员和系统管理员
- 登录端：统一账号登录入口，根据账号角色进入用户端或管理端

用户端职责：

- 用户注册、登录、退出
- 登录态校验
- 考生画像采集
- 志愿偏好配置
- 院校专业组检索
- 志愿方案展示
- 风险解释展示
- 政策问答入口
- 志愿表导出

管理端职责：

- 管理用户账号
- 管理用户角色和账号状态
- 管理知识库文档
- 上传、编辑、删除政策文件和招生章程
- 触发文档切片、向量化和索引重建
- 查看知识库构建状态
- 审核 Agent 可引用内容
- 查看 Agent 问答日志和命中来源
- 管理招生计划、历史录取数据等核心数据
- 查看数据质量校验结果

登录与入口规则：

- 所有账号统一从同一个登录页进入
- 登录成功后，后端返回用户角色和权限
- 普通用户默认进入用户端
- 管理员、数据管理员、知识库管理员等角色默认进入管理端
- 同时拥有多种角色的账号，可以在登录后选择进入用户端或管理端
- 前端可以展示入口选择，但不能只依赖前端判断权限
- 后端接口必须始终校验 token、角色和权限

### 4.2 后端

推荐：

- Python
- FastAPI
- Pydantic
- SQLAlchemy 或 SQLModel
- Alembic

后端职责：

- 用户认证和登录态管理
- 用户账号和权限管理
- 用户画像管理
- 政策规则校验
- 招生计划查询
- 历史录取数据查询
- 推荐算法计算
- 知识库文档管理
- 知识库切片、向量化和检索
- Agent 工具调用
- 报告生成

### 4.3 数据存储

推荐：

- PostgreSQL：结构化招生数据、用户数据、推荐结果
- pgvector：政策文档、招生章程、院校介绍等知识库向量检索
- Redis：缓存、会话、异步任务状态
- 对象存储：PDF、Excel、招生章程、导出报告

### 4.4 AI 与 Agent

推荐：

- LangGraph 或轻量自研 workflow
- OpenAI、通义千问、DeepSeek 等模型可插拔
- RAG 检索增强生成
- 工具调用式 Agent

Agent 的定位：

- 理解用户需求
- 澄清缺失信息
- 调用规则校验工具
- 调用推荐工具
- 检索知识库内容
- 解释推荐结果
- 生成报考报告

Agent 不应直接负责最终可报性判断，也不应单独负责录取概率判断。

### 4.5 离线任务

推荐：

- Pandas
- Polars
- Celery 或 RQ
- APScheduler

离线任务职责：

- 招生计划数据导入
- 历年分数和位次数据清洗
- 一分一段表处理
- 院校专业组归一化
- 招生章程解析
- 政策文档切分和向量化
- 数据质量校验

## 5. 项目架构

建议目录结构：

```text
frontend/
  app/
    login/
    select-portal/
    user/
      profile/
      recommendation/
      volunteer-plan/
      policy-chat/
    admin/
      users/
      knowledge-base/
      data-management/
      agent-ops/
      audit-log/
  components/
  features/
    auth/
    user/
      profile/
      recommendation/
      volunteer-plan/
      policy-chat/
    admin/
      users/
      knowledge-base/
      data-management/
      agent-ops/
      audit-log/
  lib/
  styles/

backend/
  app/
    api/
      routes/
    core/
      config.py
      database.py
      security.py
    modules/
      auth/
      account/
      user_profile/
      policy_engine/
      admission_data/
      recommendation/
      knowledge_base/
      rag_agent/
      report/
      audit_log/
    models/
    schemas/
    services/
    repositories/
  tests/
  alembic/

data_pipeline/
  importers/
  cleaners/
  validators/
  vectorize/
  chunkers/
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

## 6. 核心模块设计

### 6.1 认证与权限模块

用户端必须要求登录后使用，管理端必须要求管理员登录后使用。

建议采用：

- 账号密码登录
- 手机号验证码登录，作为后续增强
- JWT access token
- Refresh token
- 服务端 token 黑名单或会话版本号
- BCrypt 或 Argon2 密码哈希
- RBAC 角色权限模型

建议角色：

```text
student_user        普通用户，可维护自己的考生画像、生成志愿方案、使用 Agent
parent_user         家长用户，可绑定考生账号或查看授权方案
admin               系统管理员，可管理账号、角色、系统配置
data_admin          数据管理员，可维护招生计划、历史录取数据、院校专业数据
kb_admin            知识库管理员，可上传、编辑、审核和发布知识库内容
advisor             报考顾问，可在授权范围内查看用户方案和提供人工建议
```

权限控制要求：

- 用户只能访问自己的画像、推荐结果和志愿方案
- 管理端所有接口必须校验角色权限
- 知识库删除、发布、重建索引等高风险操作必须记录审计日志
- 用户隐私数据和 Agent 对话日志应分级可见
- 关键操作保留操作人、操作时间、操作内容和变更前后差异

### 6.2 用户画像模块

采集字段：

- 高考年份
- 省份
- 成绩
- 位次
- 首选科目
- 再选科目
- 批次目标：本科批、专科批或同时考虑
- 地域偏好
- 专业偏好
- 院校层次偏好
- 学费预算
- 是否接受中外合作
- 是否接受民办院校
- 是否接受独立学院或职业本科
- 是否接受服从调剂
- 就业倾向
- 升学倾向

### 6.3 政策规则引擎

建议将规则配置化，例如使用 YAML 或 JSON：

```yaml
province: 河南
year: 2026
batches:
  regular_undergraduate:
    name: 普通本科批
    volunteer_unit: 院校专业组
    max_groups: 48
    majors_per_group: 6
    allow_adjustment: true
  regular_vocational:
    name: 普通高职（专科）批
    volunteer_unit: 院校专业组
    max_groups: 48
    majors_per_group: 6
    allow_adjustment: true
```

规则引擎职责：

- 批次资格校验
- 首选科目校验
- 再选科目校验
- 院校专业组可报性校验
- 专业限制校验
- 志愿数量校验
- 专业数量校验
- 服从调剂规则校验
- 平行志愿解释

### 6.4 数据中台模块

核心数据表：

```text
users                     登录账号
roles                     角色
permissions               权限点
user_roles                用户角色关系
students                  考生画像
score_segments            一分一段表
schools                   院校基础信息
majors                    专业基础信息
school_major_groups       院校专业组
group_majors              专业组内专业
admission_plans           2026 招生计划
historical_admissions     历年投档线、最低分、最低位次
subject_requirements      选科要求
school_charters           招生章程
policy_documents          政策文档
knowledge_documents       知识库文档
knowledge_chunks          知识库切片
knowledge_embeddings      知识库向量
knowledge_ingest_jobs     知识库构建任务
recommendation_results    推荐结果
volunteer_plans           志愿方案
agent_conversations       Agent 会话
agent_messages            Agent 消息
audit_logs                审计日志
```

### 6.5 推荐模块

一期推荐模型以规则和排序为主，不建议一开始训练复杂黑盒模型。

推荐流程：

```text
输入考生画像
  -> 判断目标批次
  -> 过滤不满足批次线的数据
  -> 过滤不满足选科要求的院校专业组
  -> 过滤用户明确排斥的地域、学费、院校类型
  -> 计算历年位次差
  -> 计算招生计划变化
  -> 计算院校和专业热度
  -> 计算综合风险分
  -> 计算用户偏好匹配分
  -> 生成冲、稳、保、兜底组合
  -> 输出 48 个院校专业组志愿草案
```

推荐分层：

- 冲：录取风险较高，但存在机会
- 稳：与考生位次和偏好匹配度较高
- 保：录取安全边际较大
- 兜底：防止滑档，优先保障批次录取

建议比例可以配置：

```text
冲：20% - 30%
稳：35% - 45%
保：20% - 30%
兜底：5% - 10%
```

具体比例应允许用户根据风险偏好调整。

### 6.6 知识库建设模块

Agent 知识库是本项目的核心资产之一，不能只做成“上传文件后直接问答”。建议将知识库建设设计成完整的内容生产流水线。

知识库内容类型：

- 政策文件
- 招生工作规定
- 志愿填报说明
- 院校招生章程
- 招生计划说明
- 院校官网招生简章
- 专业介绍
- 常见问答
- 运营人员沉淀的报考规则说明

知识库文档状态：

```text
draft       草稿
uploaded    已上传
parsed      已解析
chunked     已切片
embedded    已向量化
reviewing   待审核
published   已发布，可被 Agent 检索
archived    已归档，不参与新问答
failed      处理失败
```

知识库构建流程：

```text
管理端上传文档
  -> 保存原始文件到对象存储
  -> 提取文本和元数据
  -> 清洗页眉页脚、噪声、重复内容
  -> 按语义结构切片
  -> 生成 chunk 摘要和关键词
  -> 生成向量 embedding
  -> 写入 pgvector
  -> 管理员审核
  -> 发布到 Agent 可检索索引
  -> Agent 问答时返回引用来源
```

知识库元数据建议：

- 文档标题
- 文档类型
- 来源单位
- 来源 URL
- 适用省份
- 适用年份
- 适用批次
- 适用科类
- 发布时间
- 生效时间
- 失效时间
- 数据版本
- 上传人
- 审核人
- 发布状态

知识库质量要求：

- 只有 published 状态内容可以被正式 Agent 引用
- 政策类内容必须保留来源链接或原始文件页码
- 招生章程类内容应保留院校、年份和章程 URL
- 过期政策不能参与默认检索
- 删除操作建议逻辑删除，避免破坏历史问答追溯
- 每次知识库重建应产生版本号

### 6.7 RAG 与政策问答模块

知识库内容：

- 河南省教育考试院政策文件
- 招生工作规定
- 志愿填报说明
- 招生计划
- 院校招生章程
- 院校官网招生简章
- 阳光高考公开信息

问答要求：

- 政策类回答必须引用来源
- 不确定时明确提示用户核对官方文件
- 不编造不存在的批次、计划、专业组或录取规则
- 对关键结论输出原始来源链接或文档引用

推荐 RAG 检索策略：

- 先按省份、年份、批次、文档状态过滤
- 再做关键词检索和向量检索混合召回
- 对召回结果进行 rerank
- 将结构化规则结果和知识库原文片段同时提供给 Agent
- Agent 输出时展示引用来源

### 6.8 报告模块

输出内容：

- 考生基本信息
- 本科批志愿方案
- 专科批志愿方案
- 冲稳保分布
- 每个院校专业组的推荐理由
- 选科匹配说明
- 调剂风险提示
- 学费和地域提示
- 关键政策引用
- 数据更新时间
- 免责声明

## 7. API 设计草案

### 7.1 用户端 API

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me

POST /api/profile
GET  /api/profile/{id}
PUT  /api/profile/{id}

POST /api/policy/check
POST /api/admission/search-groups

POST /api/recommendations/generate
GET  /api/recommendations/{id}

POST /api/volunteer-plans
GET  /api/volunteer-plans/{id}
PUT  /api/volunteer-plans/{id}

POST /api/agent/chat

POST /api/reports/generate
GET  /api/reports/{id}
```

### 7.2 管理端 API

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

GET  /api/admin/knowledge/documents
POST /api/admin/knowledge/documents
GET  /api/admin/knowledge/documents/{id}
PUT  /api/admin/knowledge/documents/{id}
DELETE /api/admin/knowledge/documents/{id}

POST /api/admin/knowledge/documents/{id}/parse
POST /api/admin/knowledge/documents/{id}/chunk
POST /api/admin/knowledge/documents/{id}/embed
POST /api/admin/knowledge/documents/{id}/review
POST /api/admin/knowledge/documents/{id}/publish
POST /api/admin/knowledge/documents/{id}/archive

GET  /api/admin/knowledge/jobs
GET  /api/admin/knowledge/jobs/{id}
POST /api/admin/knowledge/rebuild-index

GET  /api/admin/data/admission-plans
POST /api/admin/data/admission-plans/import
GET  /api/admin/data/historical-admissions
POST /api/admin/data/historical-admissions/import

GET  /api/admin/agent/conversations
GET  /api/admin/agent/conversations/{id}
GET  /api/admin/audit-logs
```

推荐结果示例：

```json
{
  "batch": "普通本科批",
  "school_name": "示例大学",
  "major_group_name": "示例大学第 001 专业组",
  "risk_level": "稳",
  "match_score": 86.5,
  "admission_risk_score": 38.2,
  "reasons": [
    "考生位次与该专业组近年录取位次区间匹配",
    "满足该专业组选科要求",
    "符合用户地域和专业偏好"
  ],
  "warnings": [
    "建议谨慎选择是否服从调剂",
    "需核对招生章程中的身体条件和语种限制"
  ],
  "sources": [
    "2026 年招生计划",
    "历年投档数据",
    "院校招生章程"
  ]
}
```

## 8. 数据质量与风控

必须重点处理：

- 院校名称变更
- 专业名称变更
- 院校专业组代码变化
- 招生计划变化
- 中外合作、较高收费、单列专业
- 民办和公办类型识别
- 职业本科和高职专科区分
- 校区差异
- 学费差异
- 专业体检限制
- 外语语种限制
- 单科成绩限制

系统应在重要位置展示：

- 数据来源
- 数据更新时间
- 推荐不等于录取承诺
- 最终以河南省教育考试院和高校正式公布信息为准

## 9. 开发阶段规划

### 阶段一：数据与规则基础

- 建立用户账号、登录、JWT 鉴权和 RBAC 权限模型
- 建立统一前端工程，并按角色划分用户端和管理端路由
- 建立数据库模型
- 导入院校、专业、院校专业组基础数据
- 导入一分一段表
- 导入历年录取数据
- 建立 2026 河南普通本科批和普通高职（专科）批规则配置
- 完成选科可报性校验
- 建立知识库文档表、切片表、向量表和构建任务表

### 阶段二：知识库与推荐 MVP

- 实现管理端知识库文档上传
- 实现政策文件和招生章程解析
- 实现知识库切片、向量化、审核和发布
- 实现 Agent 基于知识库的政策问答
- 实现本科批院校专业组检索
- 实现专科批院校专业组检索
- 实现冲稳保风险分层
- 实现用户偏好排序
- 生成 48 个院校专业组志愿草案
- 输出推荐理由和风险提示

### 阶段三：Agent 编排与报告

- 接入对话式 Agent
- Agent 调用规则校验和推荐工具
- 接入 RAG 政策问答
- Agent 输出引用来源和可追溯依据
- 生成 PDF 或网页报告
- 支持用户手动调整志愿顺序

### 阶段四：质量增强

- 数据质量校验面板
- 知识库质量校验面板
- Agent 问答日志和引用命中分析
- 推荐结果人工复核入口
- 多方案对比
- 家长版解释报告
- 院校和专业收藏
- 历史方案版本管理

## 10. 近期建议落地顺序

建议优先完成以下事项：

1. 明确数据来源和授权方式
2. 建立统一前端工程，并规划登录页、入口选择页、用户端路由和管理端路由
3. 建立用户注册、登录、JWT 鉴权和 RBAC 权限模型
4. 建立 PostgreSQL 数据表
5. 编写河南 2026 普通本科批、普通高职（专科）批规则配置
6. 建立管理端知识库上传、解析、切片、向量化、审核、发布流程
7. 完成考生画像录入页面
8. 完成院校专业组检索 API
9. 完成选科要求过滤
10. 完成简单位次差推荐
11. 接入 Agent 对话、知识库检索和报告生成

这样可以先做出一个可验证的推荐闭环，再逐步提升智能化程度。
