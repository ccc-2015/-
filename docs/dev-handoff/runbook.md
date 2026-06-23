# 本地运行手册

## 默认账号

- 管理端：`admin` / `123456`
- 用户端：`student` / `123456`

## 启动后端

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

期望返回：

```text
status
------
ok
```

## 启动前端

```powershell
cd frontend
npm run dev
```

访问：

- 前端：http://127.0.0.1:3000
- 后端 OpenAPI：http://127.0.0.1:8000/docs

## 常用验证命令

后端语法编译：

```powershell
cd backend
python -m compileall app
```

前端类型检查：

```powershell
cd frontend
npm run type-check
```

Git 状态：

```powershell
git status -sb
git log --oneline -5
```

端口检查：

```powershell
netstat -ano | Select-String ':8000'
netstat -ano | Select-String ':3000'
```

## 关键页面

用户端：

- `/user/profile`：考生画像
- `/user/recommend`：推荐结果
- `/user/plan`：志愿方案草案和规则校验
- `/user/chat`：Agent 对话

管理端：

- `/admin/data-import`：招生数据导入
- `/admin/universities`：院校数据
- `/admin/majors`：专业数据
- `/admin/score-lines`：批次线、一分一段、计划和历年录取
- `/admin/knowledge`：知识库文档、上传解析、切片预览

## 当前重要接口

- `POST /api/auth/login`
- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/admin/data/import`
- `POST /api/admin/data/import-jobs/{job_id}/confirm`
- `POST /api/recommendations/generate`
- `POST /api/policy/check`
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
- `POST /api/admin/knowledge/documents/upload`
- `POST /api/admin/knowledge/documents/{document_id}/chunks/rebuild`
- `GET /api/admin/knowledge/documents/{document_id}/chunks`
- `GET /api/admin/knowledge/documents/{document_id}/cleaning-report`
- `POST /api/agent/chat`
