# 当前项目状态

更新时间：2026-06-23

## 已完成主线

- 基础工程：FastAPI 后端、Next.js 前端、SQLite 开发库、登录和角色入口。
- 认证权限：后端登录、`/api/auth/me`、管理端权限依赖。
- 考生画像：`/api/profile/me` 读取和更新，用户端画像页已接真实接口。
- 招生数据导入：支持 `schools`、`majors`、`school_major_groups`、`batch_lines`、`score_segments`、`admission_plans`、`historical_admissions`。
- 数据查询：管理端院校、专业、批次线、一分一段、招生计划、历年录取查询。
- 规则校验：`/api/policy/check` 支持批次、选科、志愿数量和专业组可报性校验。
- 院校专业组搜索：`/api/admission/search-groups` 支持按画像和条件筛选。
- 推荐 MVP：`/api/recommendations/generate` 基于画像、计划、历史录取和偏好生成推荐。
- 志愿方案：用户端 `/user/plan` 使用真实推荐候选，可按用户和批次保存多个版本、读取、更新、复制、删除，支持上移/下移调整顺序，已保存方案可按快照导出 JSON，并用当前或已保存的 `group_id` 顺序做二次规则校验。
- 知识库管理：支持文档 CRUD、发布、归档、删除。
- 知识库上传和切片：支持 `.txt`、`.md`、`.csv`、`.xlsx`、`.xls` 上传解析，自动生成 `knowledge_chunks`，支持手动重建切片和前端预览。
- 知识库清洗质量报告：后端已生成 `knowledge_cleaning_reports`，管理端可查看综合评分、文本抽取、元数据、去重、表格结构、政策有效期、切片就绪度和疑似重复文档；低质量、缺来源、过期年份、无切片或完全重复文档会被发布前拦截。
- 本地轻量向量：切片会生成 `local_hash_v1` hash embedding，并写入结构化 `knowledge_embeddings`；metadata 中仍保留向量作为兼容 fallback，后端已抽象 `embedding_service`，后续可切换真实 embedding provider。
- Agent MVP：LangGraph 骨架已接入推荐引擎和 published 知识库切片混合检索，返回工具调用、引用来源、`document_id`、`chunk_id`、`version` 和 `score_detail`，用户端聊天页可查看引用追溯信息。
- 报告生成：已新增 `reports` 表，`/api/reports/generate` 可从已保存志愿方案生成网页报告快照，报告政策依据会优先引用 published 知识库切片并记录 `document_id`、`chunk_id`、`version`、检索方式和分数；`/api/reports/{report_id}/export` 支持 CSV 表格导出；用户端 `/user/reports` 已接真实接口并展示考生画像、推荐分布、志愿列表、推荐理由、风险提示、政策依据和免责声明。
- 本地演示数据：新增 `backend/scripts/seed_demo_data.py`，可重复写入默认学生画像、演示招生数据和 published 政策知识文档，用于本地跑通“画像 -> 推荐 -> 志愿方案 -> 报告 -> 知识引用”链路。

## 仍未完成

- 知识库深度清洗：当前质量报告是规则评分，尚未接 OCR 置信度、表格错位定位和更精细的语义相似去重。
- 生产级向量检索：当前是可配置 provider 的本地 hash embedding 混合检索，并已有 `knowledge_embeddings` 结构化表；尚未接外部 embedding 模型或 pgvector。
- 志愿方案增强：当前已支持持久化保存、多版本、复制、上移/下移排序、规则校验和 JSON 快照导出，但还没有表格/PDF 导出、拖拽排序和统一数据版本引用。
- 报告生成：网页报告和 CSV 表格导出已可从已保存方案生成，政策依据已接 published 知识库并写入报告数据版本；PDF 导出、报告分享链接和更完整的统一数据版本引用仍未完成。
- 管理端运营：对话日志、Agent 运营、审计日志、用户管理部分页面仍未完全接真实接口。
- 数据版本：推荐、知识库引用和导入任务尚未形成统一数据版本号。
- 自动化测试：已有手动 smoke test，缺 pytest/接口测试和前端测试。

## 最近关键提交

- `0e6c456 feat: add local hybrid knowledge retrieval`
- `beadac7 docs: add development handoff runbook`
- `65cddbf feat: add knowledge upload and chunked agent retrieval`
- `0f51853 feat: add recommendation MVP`
- `af6a27d feat: add score and admission search APIs`

## 当前建议基线

继续开发前先确认：

```powershell
git status -sb
git log --oneline -5
```

期望状态是 `main...origin/main`，无未提交改动。
