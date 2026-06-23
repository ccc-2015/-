from datetime import datetime

from pydantic import BaseModel


class AdminAgentMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class AdminAgentToolCallOut(BaseModel):
    id: int
    tool_name: str
    arguments: dict | None = None
    result_summary: str | None = None
    created_at: datetime


class AdminAgentCitationOut(BaseModel):
    id: int
    source_type: str
    source_title: str
    source_url: str | None = None
    metadata_json: dict | None = None


class AdminAgentNodeRunOut(BaseModel):
    id: int
    thread_id: str
    node_name: str
    status: str
    output_snapshot: dict | None = None
    created_at: datetime


class AdminAgentConversationSummaryOut(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str
    title: str | None = None
    thread_id: str | None = None
    message_count: int
    tool_call_count: int
    citation_count: int
    node_run_count: int
    last_message_at: datetime | None = None
    created_at: datetime


class AdminAgentConversationDetailOut(AdminAgentConversationSummaryOut):
    messages: list[AdminAgentMessageOut]
    tool_calls: list[AdminAgentToolCallOut]
    citations: list[AdminAgentCitationOut]
    node_runs: list[AdminAgentNodeRunOut]
