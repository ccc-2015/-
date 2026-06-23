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
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/{user_id}`
- `GET /api/admin/roles`
- `POST /api/admin/data/import`
- `GET /api/admin/data/import-jobs`
- `POST /api/admin/data/import-jobs/{job_id}/confirm`
- `GET /api/admin/universities`
- `GET /api/admin/majors`
- `GET /api/admin/school-major-groups`
- `GET /api/admin/knowledge/documents`
- `POST /api/admin/knowledge/documents`
- `PATCH /api/admin/knowledge/documents/{document_id}`
- `DELETE /api/admin/knowledge/documents/{document_id}`
- `POST /api/agent/chat`

## 当前数据导入类型

管理端文件导入已支持：

- `schools`
- `majors`
- `school_major_groups`

后续建议按规划书继续补齐招生计划、历年录取、一分一段、批次线和知识库切片向量化流程。
