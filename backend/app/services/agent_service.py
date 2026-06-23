from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import AgentCheckpoint, AgentCitation, AgentConversation, AgentMessage, AgentNodeRun, AgentThread, AgentToolCall
from app.models.user import User
from app.modules.rag_agent.graph import build_agent_graph
from app.schemas.agent import AgentChatResponse


def run_agent_chat(db: Session, user: User, message: str, conversation_id: int | None = None, thread_id: str | None = None) -> AgentChatResponse:
    if conversation_id is None:
        conversation = AgentConversation(user_id=user.id, title=message[:60])
        db.add(conversation)
        db.flush()
    else:
        conversation = db.get(AgentConversation, conversation_id)
        if conversation is None or conversation.user_id != user.id:
            conversation = AgentConversation(user_id=user.id, title=message[:60])
            db.add(conversation)
            db.flush()

    assert conversation is not None
    resolved_thread_id = thread_id or str(uuid4())

    db.add(AgentMessage(conversation_id=conversation.id, role="user", content=message))
    graph = build_agent_graph(db)
    result = graph.invoke(
        {
            "user_id": user.id,
            "conversation_id": conversation.id,
            "thread_id": resolved_thread_id,
            "message": message,
            "events": [{"type": "node_start", "node": "intent_node"}],
        }
    )
    answer = result.get("answer", "")
    db.add(AgentMessage(conversation_id=conversation.id, role="assistant", content=answer))

    thread = db.scalar(select(AgentThread).where(AgentThread.thread_id == resolved_thread_id))
    if thread is None:
        thread = AgentThread(thread_id=resolved_thread_id, user_id=user.id)
        db.add(thread)
    thread.user_id = user.id
    thread.conversation_id = conversation.id
    thread.state_snapshot = result

    for call in result.get("tool_calls", []):
        db.add(
            AgentToolCall(
                conversation_id=conversation.id,
                tool_name=call.get("tool_name", "unknown"),
                arguments=call.get("arguments"),
                result_summary=str(call.get("result", ""))[:1000],
            )
        )

    for citation in result.get("citations", []):
        db.add(
            AgentCitation(
                conversation_id=conversation.id,
                source_type=citation.get("source_type", "unknown"),
                source_title=citation.get("source_title", "未命名来源"),
                source_url=citation.get("source_url"),
                metadata_json=citation.get("metadata"),
            )
        )

    for event in result.get("events", []):
        if event.get("node"):
            db.add(
                AgentNodeRun(
                    thread_id=resolved_thread_id,
                    node_name=event["node"],
                    status=event.get("status", "success"),
                    output_snapshot=event,
                )
            )

    db.add(
        AgentCheckpoint(
            thread_id=resolved_thread_id,
            checkpoint_ns="default",
            checkpoint_id=str(uuid4()),
            state_snapshot=result,
            metadata_json={"conversation_id": conversation.id, "source": "langgraph.invoke"},
        )
    )
    db.commit()

    return AgentChatResponse(
        conversation_id=conversation.id,
        thread_id=resolved_thread_id,
        answer=answer,
        events=result.get("events", []),
        citations=result.get("citations", []),
    )
