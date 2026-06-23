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
- 志愿方案草案：用户端 `/user/plan` 使用真实推荐候选，并用真实 `group_id` 做二次规则校验。
- 知识库管理：支持文档 CRUD、发布、归档、删除。
- 知识库上传和切片：支持 `.txt`、`.md`、`.csv`、`.xlsx`、`.xls` 上传解析，自动生成 `knowledge_chunks`，支持手动重建切片和前端预览。
- 本地轻量向量：切片会生成 `local_hash_v1` hash embedding，metadata 中记录 provider、维度和向量。
- Agent MVP：LangGraph 骨架已接入推荐引擎和 published 知识库切片混合检索，返回工具调用、引用来源和检索分数。

## 仍未完成

- 知识库清洗质量报告：还没有 OCR 置信度、表格错位、重复文档、过期文档检测。
- 生产级向量检索：当前是本地 hash embedding 混合检索，不是外部 embedding 模型或 pgvector。
- 志愿方案保存：目前 `/user/plan` 是推荐候选草案，未持久化用户自定义排序。
- 报告生成：`/user/reports` 仍是静态展示，PDF/网页报告/表格导出未实现。
- 管理端运营：对话日志、Agent 运营、审计日志、用户管理部分页面仍未完全接真实接口。
- 数据版本：推荐、知识库引用和导入任务尚未形成统一数据版本号。
- 自动化测试：已有手动 smoke test，缺 pytest/接口测试和前端测试。

## 最近关键提交

- `65cddbf feat: add knowledge upload and chunked agent retrieval`
- `0f51853 feat: add recommendation MVP`
- `af6a27d feat: add score and admission search APIs`
- `aa5b995 feat: add policy rule checks`
- `63d9424 feat: add core admission data imports`

## 当前建议基线

继续开发前先确认：

```powershell
git status -sb
git log --oneline -5
```

期望状态是 `main...origin/main`，无未提交改动。
