from typing import Any, TypedDict


class AgentState(TypedDict, total=False):
    user_id: int
    conversation_id: int | None
    thread_id: str
    message: str
    intent: str
    missing_fields: list[str]
    tool_calls: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    answer: str
    events: list[dict[str, Any]]
