from datetime import datetime

from pydantic import BaseModel


class AdminMetricOut(BaseModel):
    label: str
    value: str
    helper: str


class AdminKnowledgeStatusOut(BaseModel):
    id: int
    title: str
    category: str | None = None
    source_type: str | None = None
    status: str
    version: int
    chunk_count: int
    updated_at: datetime


class AdminDashboardOut(BaseModel):
    metrics: list[AdminMetricOut]
    knowledge_documents: list[AdminKnowledgeStatusOut]


class AdminAgentOpsMetricOut(BaseModel):
    label: str
    value: str
    helper: str


class AdminAgentNodeMetricOut(BaseModel):
    name: str
    run_count: int
    success_count: int
    failure_count: int
    last_run_at: datetime | None = None


class AdminAgentToolMetricOut(BaseModel):
    name: str
    call_count: int
    last_called_at: datetime | None = None


class AdminAgentOpsOut(BaseModel):
    metrics: list[AdminAgentOpsMetricOut]
    nodes: list[AdminAgentNodeMetricOut]
    tools: list[AdminAgentToolMetricOut]


class AdminAuditLogOut(BaseModel):
    id: str
    time: datetime
    actor: str
    action: str
    target: str
    detail: str | None = None
