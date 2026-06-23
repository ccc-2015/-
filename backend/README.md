# 河南高考智能报考 Agent 后端

后端采用 FastAPI + SQLAlchemy + LangGraph。FastAPI 负责登录、权限、管理端接口和 HTTP 服务入口；LangGraph 负责 Agent 的有状态编排、工具调用和执行轨迹记录。

## 启动

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

首次启动会自动创建 SQLite 开发数据库 `app/data/dev.db`，并写入默认账号。

## 默认账号

- 管理端：`admin` / `123456`
- 用户端：`student` / `123456`

## 已实现接口

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/profile/me`
- `PUT /api/profile/me`
- `GET /api/score/rank`
- `GET /api/score/batch-lines`
- `POST /api/policy/check`
- `POST /api/admission/search-groups`
- `GET /api/admission/groups/{group_id}`
- `POST /api/recommendations/generate`
- `GET /api/volunteer/plans/current`
- `PUT /api/volunteer/plans/current`
- `GET /api/volunteer/plans`
- `PUT /api/volunteer/plans/{plan_id}`
- `POST /api/volunteer/plans/{plan_id}/copy`
- `GET /api/volunteer/plans/{plan_id}/export`
- `DELETE /api/volunteer/plans/{plan_id}`
- `POST /api/volunteer/plans/{plan_id}/check`
- `GET /api/reports`
- `POST /api/reports/generate`
- `GET /api/reports/{report_id}`
- `GET /api/reports/{report_id}/export`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/{user_id}`
- `GET /api/admin/roles`
- `POST /api/admin/data/import`
- `GET /api/admin/data/import-jobs`
- `GET /api/admin/data/import-jobs/{job_id}`
- `POST /api/admin/data/import-jobs/{job_id}/confirm`
- `GET /api/admin/universities`
- `GET /api/admin/majors`
- `GET /api/admin/school-major-groups`
- `GET /api/admin/batch-lines`
- `GET /api/admin/score-segments`
- `GET /api/admin/admission-plans`
- `GET /api/admin/historical-admissions`
- `GET /api/admin/knowledge/documents`
- `POST /api/admin/knowledge/documents`
- `POST /api/admin/knowledge/documents/upload`
- `GET /api/admin/knowledge/documents/{document_id}`
- `PATCH /api/admin/knowledge/documents/{document_id}`
- `DELETE /api/admin/knowledge/documents/{document_id}`
- `POST /api/admin/knowledge/documents/{document_id}/chunks/rebuild`
- `GET /api/admin/knowledge/documents/{document_id}/chunks`
- `GET /api/admin/knowledge/documents/{document_id}/cleaning-report`
- `POST /api/agent/chat`

## 当前数据导入类型

管理端文件导入已支持：

- `schools`
- `majors`
- `school_major_groups`
- `batch_lines`
- `score_segments`
- `admission_plans`
- `historical_admissions`

当前知识库已支持文本型文档的创建、查询、发布、归档、删除，以及 `.txt`、`.md`、`.csv`、`.xlsx`、`.xls` 文件上传解析和切片重建。切片会通过 `embedding_service` 生成 `local_hash_v1` 轻量向量，并同步生成清洗质量报告，覆盖文本抽取、元数据、去重、表格结构、政策有效期和切片就绪度评分。Agent 政策问答使用向量相似度、关键词命中、标题和标签的混合排序。志愿方案已支持按用户和批次保存多个版本、读取、更新、复制、删除、快照导出和规则校验。报告已支持从已保存志愿方案生成网页快照并导出 CSV 表格。后续建议按规划书继续补齐真实 embedding/pgvector 检索、PDF 导出和管理端运营闭环。
