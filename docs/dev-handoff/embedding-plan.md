# Embedding 与向量存储方案

更新时间：2026-06-23

## 当前实现

- 当前默认 `EMBEDDING_PROVIDER=local_hash_v1`，维度 `64`。
- 后端已抽象 `app.services.embedding_service`，知识库切片和 Agent 检索只依赖 `embed_text`、`embedding_provider`、`embedding_dimensions`、`cosine_similarity`。
- SQLite 开发库仍把向量临时存放在 `knowledge_chunks.metadata_json.embedding` 中，方便本地演示和 smoke test。
- Agent 检索保留混合召回：向量相似度、token overlap、关键词命中、标题命中、标签命中。

## 真实 Embedding 候选

- `bge-m3`：中文和多语言效果较稳，适合政策、章程、问答混合语料；可自部署或调用兼容服务。
- `bge-small-zh`：成本更低，适合早期试运行，但长文本和跨领域泛化弱于 `bge-m3`。
- 厂商 embedding API：接入快，运维轻，但需要评估费用、限流、数据合规和可用性。

## 推荐落地顺序

1. 保留 `local_hash_v1` 作为开发 fallback。
2. 新增 `EMBEDDING_PROVIDER=bge_m3` 或 `openai_compatible`，在 `embedding_service` 中接真实模型。
3. 新增 `knowledge_embeddings` 表或迁移到 PostgreSQL `pgvector`。
4. 切片重建时写入真实向量，同时保留关键词混合召回。
5. Agent 引用继续返回 `document_id`、`chunk_id`、`version`、`score_detail`，并在 `score_detail` 中记录 provider。

## pgvector 目标结构

```text
knowledge_embeddings
  id
  chunk_id
  provider
  model
  dimensions
  embedding vector(dimensions)
  created_at
```

开发期可继续用 SQLite metadata；进入联调或生产前建议切 PostgreSQL + pgvector，避免 JSON 向量扫描造成性能瓶颈。
