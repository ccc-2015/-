# 故障恢复手册

## 1. 不知道当前做到哪里

先看固定文档：

```powershell
Get-Content docs/dev-handoff/current-status.md
Get-Content docs/dev-handoff/next-steps.md
git log --oneline -8
git status -sb
```

## 2. 后端服务像是没加载新代码

现象：

- 本地文件已修改，但 HTTP 响应仍是旧逻辑。
- Agent 返回旧占位文案。

处理：

1. 查端口：

```powershell
netstat -ano | Select-String ':8000'
```

2. 停止对应 PID：

```powershell
Stop-Process -Id <PID> -Force
```

3. 重新启动后端：

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

4. 健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

## 3. 前端服务无法访问

1. 查端口：

```powershell
netstat -ano | Select-String ':3000'
```

2. 重新启动：

```powershell
cd frontend
npm run dev
```

3. 如果 `3000` 被占用，Next.js 可能自动使用其他端口，查看命令输出里的 URL。

## 4. Git 出现 index.lock 或权限问题

现象：

```text
Unable to create .git/index.lock: Permission denied
```

处理：

- 确认没有其他 Git 操作正在运行。
- 在受限环境中需要提升权限执行 `git add` 或 `git commit`。
- 不要手动删除 `.git/index.lock`，除非确认没有 Git 进程正在运行。

## 5. 中文 smoke test 结果异常

PowerShell here-string 通过 `python -` 传中文时，可能出现中文变成问号，导致 Agent 意图识别走错分支。

更稳的写法是用 Unicode escape：

```python
message = "\u5e73\u884c\u5fd7\u613f\u6295\u6863\u89c4\u5219\u662f\u4ec0\u4e48\uff1f"
```

或者直接从 UTF-8 文件运行测试脚本。

## 6. 数据库状态异常

开发库默认位置：

```text
backend/app/data/dev.db
```

如果需要排查数据：

- 优先通过 API 查询。
- 不要随意删除 `dev.db`，除非确认可以丢弃本地测试数据。
- 若删除 `dev.db`，后端启动时会自动建表并写入默认账号，但业务数据会丢失。

## 7. 提交后忘记推送

检查：

```powershell
git status -sb
git log --oneline -3
```

如果显示 `main...origin/main [ahead 1]`，执行：

```powershell
git push origin main
```
