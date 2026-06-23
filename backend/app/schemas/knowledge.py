from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeDocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str | None = None
    content: str = Field(min_length=1)
    source_type: str | None = None
    source_url: str | None = None
    tags: list[str] | None = None
    status: str = "draft"


class KnowledgeDocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = None
    content: str | None = Field(default=None, min_length=1)
    source_type: str | None = None
    source_url: str | None = None
    tags: list[str] | None = None
    status: str | None = None


class KnowledgeDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None = None
    content: str
    source_type: str | None = None
    source_url: str | None = None
    status: str
    tags: list[str] | None = None
    version: int
    created_by: int | None = None
    updated_by: int | None = None
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0


class KnowledgeChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    chunk_index: int
    content: str
    embedding_id: str | None = None
    metadata_json: dict | None = None
    embedding_provider: str | None = None
    embedding_dimensions: int | None = None
    created_at: datetime


class KnowledgeChunkRebuildResponse(BaseModel):
    document_id: int
    chunk_count: int


class KnowledgeCleaningIssue(BaseModel):
    severity: str
    message: str
    code: str


class KnowledgeCleaningReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    overall_score: int
    status: str
    text_extract_score: int
    ocr_confidence: int
    metadata_complete_score: int
    dedup_score: int
    table_parse_score: int
    policy_validity_score: int
    chunk_ready_score: int
    issues_json: list[KnowledgeCleaningIssue] | None = None
    metrics_json: dict | None = None
    created_at: datetime
    updated_at: datetime
