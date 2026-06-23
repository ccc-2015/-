from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.agent import (
    AgentCitation,
    AgentConversation,
    AgentMessage,
    AgentNodeRun,
    AgentThread,
    AgentToolCall,
)
from app.models.user import User
from app.schemas.admin_agent import (
    AdminAgentCitationOut,
    AdminAgentConversationDetailOut,
    AdminAgentConversationSummaryOut,
    AdminAgentMessageOut,
    AdminAgentNodeRunOut,
    AdminAgentToolCallOut,
)

router = APIRouter()


@router.get("/agent/conversations", response_model=list[AdminAgentConversationSummaryOut])
def list_agent_conversations(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminAgentConversationSummaryOut]:
    conversations = db.execute(
        select(AgentConversation, User)
        .join(User, User.id == AgentConversation.user_id)
        .order_by(AgentConversation.id.desc())
        .limit(limit)
    ).all()
    return [_conversation_summary(db, conversation, user) for conversation, user in conversations]


@router.get("/agent/conversations/{conversation_id}", response_model=AdminAgentConversationDetailOut)
def get_agent_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminAgentConversationDetailOut:
    row = db.execute(
        select(AgentConversation, User)
        .join(User, User.id == AgentConversation.user_id)
        .where(AgentConversation.id == conversation_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent conversation not found")

    conversation, user = row
    summary = _conversation_summary(db, conversation, user)
    messages = list(
        db.scalars(
            select(AgentMessage)
            .where(AgentMessage.conversation_id == conversation.id)
            .order_by(AgentMessage.created_at.asc(), AgentMessage.id.asc())
        ).all()
    )
    tool_calls = list(
        db.scalars(
            select(AgentToolCall)
            .where(AgentToolCall.conversation_id == conversation.id)
            .order_by(AgentToolCall.created_at.asc(), AgentToolCall.id.asc())
        ).all()
    )
    citations = list(
        db.scalars(
            select(AgentCitation)
            .where(AgentCitation.conversation_id == conversation.id)
            .order_by(AgentCitation.id.asc())
        ).all()
    )
    thread_ids = _thread_ids(db, conversation.id)
    node_runs = list(
        db.scalars(
            select(AgentNodeRun)
            .where(AgentNodeRun.thread_id.in_(thread_ids))
            .order_by(AgentNodeRun.created_at.asc(), AgentNodeRun.id.asc())
        ).all()
    ) if thread_ids else []
    return AdminAgentConversationDetailOut(
        **summary.model_dump(),
        messages=[
            AdminAgentMessageOut(id=item.id, role=item.role, content=item.content, created_at=item.created_at)
            for item in messages
        ],
        tool_calls=[
            AdminAgentToolCallOut(
                id=item.id,
                tool_name=item.tool_name,
                arguments=item.arguments,
                result_summary=item.result_summary,
                created_at=item.created_at,
            )
            for item in tool_calls
        ],
        citations=[
            AdminAgentCitationOut(
                id=item.id,
                source_type=item.source_type,
                source_title=item.source_title,
                source_url=item.source_url,
                metadata_json=item.metadata_json,
            )
            for item in citations
        ],
        node_runs=[
            AdminAgentNodeRunOut(
                id=item.id,
                thread_id=item.thread_id,
                node_name=item.node_name,
                status=item.status,
                output_snapshot=item.output_snapshot,
                created_at=item.created_at,
            )
            for item in node_runs
        ],
    )


def _conversation_summary(db: Session, conversation: AgentConversation, user: User) -> AdminAgentConversationSummaryOut:
    thread_ids = _thread_ids(db, conversation.id)
    return AdminAgentConversationSummaryOut(
        id=conversation.id,
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        title=conversation.title,
        thread_id=thread_ids[0] if thread_ids else None,
        message_count=_count(db, AgentMessage.conversation_id, conversation.id),
        tool_call_count=_count(db, AgentToolCall.conversation_id, conversation.id),
        citation_count=_count(db, AgentCitation.conversation_id, conversation.id),
        node_run_count=_node_run_count(db, thread_ids),
        last_message_at=db.scalar(
            select(func.max(AgentMessage.created_at)).where(AgentMessage.conversation_id == conversation.id)
        ),
        created_at=conversation.created_at,
    )


def _thread_ids(db: Session, conversation_id: int) -> list[str]:
    return list(
        db.scalars(
            select(AgentThread.thread_id)
            .where(AgentThread.conversation_id == conversation_id)
            .order_by(AgentThread.updated_at.desc(), AgentThread.id.desc())
        ).all()
    )


def _count(db: Session, column, value: int) -> int:
    return int(db.scalar(select(func.count()).where(column == value)) or 0)


def _node_run_count(db: Session, thread_ids: list[str]) -> int:
    if not thread_ids:
        return 0
    return int(db.scalar(select(func.count()).where(AgentNodeRun.thread_id.in_(thread_ids))) or 0)
