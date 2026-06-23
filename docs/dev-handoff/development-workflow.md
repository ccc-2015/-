# 开发流程

## 每次开始前

1. 确认当前分支和工作树：

```powershell
git status -sb
git log --oneline -5
```

2. 如果有未提交改动，先判断是否是上次开发留下的工作。不要直接覆盖或回滚用户改动。

3. 阅读本目录下：

- `current-status.md`
- `next-steps.md`
- 本次要改模块相关代码

## 推荐开发节奏

1. 先缩小范围，只处理一个可验收能力。
2. 后端优先补 schema/service/route，再接前端 API 和页面。
3. 如果改 Agent，优先复用已有规则引擎、推荐引擎、知识库检索，不把关键判断写进提示词。
4. 如果改数据导入或知识库，必须考虑：
   - 文件类型
   - 校验失败时的错误信息
   - 数据是否会重复
   - 是否需要记录来源和版本
5. 如果改用户端推荐或方案，必须保证后端使用真实 `group_id` 做规则校验。

## 验证要求

后端改动后至少运行：

```powershell
cd backend
python -m compileall app
```

前端改动后至少运行：

```powershell
cd frontend
npm run type-check
```

涉及接口时，做最小 smoke test：

- 登录获取 token
- 调用新增或修改接口
- 验证响应关键字段
- 清理测试数据

## 提交和推送要求

重要修改必须提交并推送到 GitHub。

标准收尾流程：

```powershell
git status -sb
git diff --stat
git add <changed files>
git commit -m "<type>: <summary>"
git push origin main
git status -sb
```

提交信息建议：

- `feat: ...` 新功能
- `fix: ...` 修复问题
- `docs: ...` 文档
- `chore: ...` 工程维护

## 不要做的事

- 不要在未确认的情况下 `git reset --hard`。
- 不要回滚用户已有改动。
- 不要把推荐、政策可报性、选科判断交给 LLM 自由生成。
- 不要新增复杂依赖前不评估当前项目是否已有同类能力。
