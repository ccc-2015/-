# 下一步开发路线

## 优先级 1：知识库检索质量

目标：把当前本地 `local_hash_v1` 混合检索升级为更接近生产的可解释检索链路。

建议步骤：

1. 增加知识库切片质量字段或质量报告表。
2. 增加重复文档、空内容、低质量切片检查。
3. 评估真实 embedding 模型和成本。
4. 选择向量存储方案：开发期可保留 SQLite metadata，最终建议 PostgreSQL + pgvector。
5. 将 `local_hash_v1` 替换为真实 embedding，并保留关键词混合召回。
6. Agent 引用展示 chunk、document、version、source_url、score、score_detail。

验收点：

- 上传一份政策文档后，Agent 能命中具体切片。
- 引用中包含 `document_id`、`chunk_id`、`version`、`score_detail`。
- 不发布的文档不会被 Agent 检索。

## 优先级 2：志愿方案持久化

目标：用户可以把推荐候选保存成自己的志愿方案。

建议步骤：

1. 新增方案表：`volunteer_plans`、`volunteer_plan_items`。
2. 后端接口：
   - 创建方案
   - 更新排序
   - 获取方案
   - 删除方案
   - 对方案做政策校验
3. 前端 `/user/plan` 支持保存、调整顺序、重新校验。

验收点：

- 用户能保存本科批方案。
- 刷新页面后方案仍存在。
- 二次校验使用保存后的顺序和 `group_id`。

## 优先级 3：报告生成

目标：把画像、推荐、方案、政策引用汇总成可分享报告。

建议步骤：

1. 新增 reports 表。
2. 支持网页报告生成。
3. 后续再支持 PDF 或表格导出。
4. 报告中包含：
   - 考生画像
   - 推荐分布
   - 志愿列表
   - 每项推荐理由
   - 风险提示
   - 政策引用
   - 免责声明

验收点：

- `/user/reports` 不再是静态数据。
- 报告能从已保存方案生成。
- 报告记录生成时间和数据版本。

## 优先级 4：管理端运营闭环

目标：让管理员看到真实运营状态。

建议步骤：

1. `/admin` 指标改为真实 API。
2. `/admin/chat-logs` 接 agent_conversations、agent_messages、tool_calls、citations。
3. `/admin/agent-ops` 展示节点运行次数、失败次数、工具命中。
4. `/admin/audit-logs` 增加审计表和接口。

验收点：

- 管理员能查看真实 Agent 会话。
- 能看到每次回答调用了哪些工具和引用了哪些文档。

## 优先级 5：自动化测试

目标：减少每次改动后的回归风险。

建议步骤：

1. 后端加 pytest。
2. 覆盖：
   - 登录
   - 画像保存
   - 数据导入
   - 推荐生成
   - 政策校验
   - 知识库上传和切片
   - Agent 推荐/政策意图
3. 前端先保持 `npm run type-check`，后续再加页面级测试。

验收点：

- 新增后端测试命令。
- CI 或本地一条命令可跑核心接口测试。
