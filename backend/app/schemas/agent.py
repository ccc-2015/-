from typing import Any

from pydantic import BaseModel


class AgentChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    thread_id: str | None = None


class AgentChatResponse(BaseModel):
    conversation_id: int
    thread_id: str
    answer: str
    events: list[dict[str, Any]]
    citations: list[dict[str, Any]]
