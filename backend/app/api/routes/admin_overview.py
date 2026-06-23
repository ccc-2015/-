from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admission import ImportJob, SchoolMajorGroup
from app.models.agent import AgentCitation, AgentConversation, AgentMessage, AgentNodeRun, AgentToolCall
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.report import Report
from app.models.user import User
from app.schemas.admin_overview import (
    AdminAgentNodeMetricOut,
    AdminAgentOpsMetricOut,
    AdminAgentOpsOut,
    AdminAgentToolMetricOut,
    AdminAuditLogOut,
    AdminDashboardOut,
    AdminKnowledgeStatusOut,
    AdminMetricOut,
)

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardOut)
def get_dashboard(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminDashboardOut:
    published_count = _count(db, KnowledgeDocument.status, "published")
    total_chunks = int(db.scalar(select(func.count(KnowledgeChunk.id))) or 0)
    metrics = [
        AdminMetricOut(label="用户数", value=str(int(db.scalar(select(func.count(User.id))) or 0)), helper="当前本地账号总数"),
        AdminMetricOut(label="院校专业组", value=str(int(db.scalar(select(func.count(SchoolMajorGroup.id))) or 0)), helper="可被推荐引擎检索的专业组"),
        AdminMetricOut(label="已发布知识", value=str(published_count), helper=f"知识切片 {total_chunks} 个"),
        AdminMetricOut(label="Agent 会话", value=str(int(db.scalar(select(func.count(AgentConversation.id))) or 0)), helper="已记录的智能问答会话"),
    ]
    documents = list(
        db.scalars(select(KnowledgeDocument).order_by(KnowledgeDocument.updated_at.desc(), KnowledgeDocument.id.desc()).limit(6)).all()
    )
    return AdminDashboardOut(
        metrics=metrics,
        knowledge_documents=[
            AdminKnowledgeStatusOut(
                id=document.id,
                title=document.title,
                category=document.category,
                source_type=document.source_type,
                status=document.status,
                version=document.version,
                chunk_count=int(
                    db.scalar(select(func.count(KnowledgeChunk.id)).where(KnowledgeChunk.document_id == document.id)) or 0
                ),
                updated_at=document.updated_at,
            )
            for document in documents
        ],
    )


@router.get("/agent/ops", response_model=AdminAgentOpsOut)
def get_agent_ops(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminAgentOpsOut:
    conversation_count = int(db.scalar(select(func.count(AgentConversation.id))) or 0)
    message_count = int(db.scalar(select(func.count(AgentMessage.id))) or 0)
    tool_call_count = int(db.scalar(select(func.count(AgentToolCall.id))) or 0)
    citation_count = int(db.scalar(select(func.count(AgentCitation.id))) or 0)
    metrics = [
        AdminAgentOpsMetricOut(label="会话数", value=str(conversation_count), helper="agent_conversations"),
        AdminAgentOpsMetricOut(label="消息数", value=str(message_count), helper="agent_messages"),
        AdminAgentOpsMetricOut(label="工具调用", value=str(tool_call_count), helper="agent_tool_calls"),
        AdminAgentOpsMetricOut(label="引用来源", value=str(citation_count), helper="agent_citations"),
    ]
    node_rows = db.execute(
        select(
            AgentNodeRun.node_name,
            func.count(AgentNodeRun.id),
            func.sum(case((AgentNodeRun.status == "success", 1), else_=0)),
            func.max(AgentNodeRun.created_at),
        )
        .group_by(AgentNodeRun.node_name)
        .order_by(func.count(AgentNodeRun.id).desc())
    ).all()
    tool_rows = db.execute(
        select(AgentToolCall.tool_name, func.count(AgentToolCall.id), func.max(AgentToolCall.created_at))
        .group_by(AgentToolCall.tool_name)
        .order_by(func.count(AgentToolCall.id).desc())
    ).all()
    return AdminAgentOpsOut(
        metrics=metrics,
        nodes=[
            AdminAgentNodeMetricOut(
                name=name,
                run_count=int(run_count or 0),
                success_count=int(success_count or 0),
                failure_count=max(int(run_count or 0) - int(success_count or 0), 0),
                last_run_at=last_run_at,
            )
            for name, run_count, success_count, last_run_at in node_rows
        ],
        tools=[
            AdminAgentToolMetricOut(name=name, call_count=int(call_count or 0), last_called_at=last_called_at)
            for name, call_count, last_called_at in tool_rows
        ],
    )


@router.get("/audit-logs", response_model=list[AdminAuditLogOut])
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminAuditLogOut]:
    events: list[AdminAuditLogOut] = []
    events.extend(_knowledge_events(db))
    events.extend(_import_events(db))
    events.extend(_user_events(db))
    events.extend(_agent_events(db))
    events.extend(_report_events(db))
    return sorted(events, key=lambda item: item.time, reverse=True)[:limit]


def _knowledge_events(db: Session) -> list[AdminAuditLogOut]:
    rows = db.execute(
        select(KnowledgeDocument, User)
        .outerjoin(User, User.id == KnowledgeDocument.updated_by)
        .order_by(KnowledgeDocument.updated_at.desc())
        .limit(50)
    ).all()
    return [
        AdminAuditLogOut(
            id=f"knowledge-{document.id}",
            time=document.updated_at,
            actor=user.display_name if user else "系统",
            action=f"知识库文档 {document.status}",
            target=document.title,
            detail=f"version={document.version}, category={document.category or '-'}",
        )
        for document, user in rows
    ]


def _import_events(db: Session) -> list[AdminAuditLogOut]:
    rows = db.execute(
        select(ImportJob, User)
        .outerjoin(User, User.id == ImportJob.created_by)
        .order_by(ImportJob.updated_at.desc())
        .limit(50)
    ).all()
    return [
        AdminAuditLogOut(
            id=f"import-{job.id}",
            time=job.updated_at,
            actor=user.display_name if user else "系统",
            action=f"数据导入 {job.status}",
            target=job.data_type,
            detail=f"{job.original_filename}，有效 {job.valid_rows}/{job.total_rows} 行",
        )
        for job, user in rows
    ]


def _user_events(db: Session) -> list[AdminAuditLogOut]:
    users = list(db.scalars(select(User).order_by(User.created_at.desc()).limit(50)).all())
    return [
        AdminAuditLogOut(
            id=f"user-{user.id}",
            time=user.created_at,
            actor="系统",
            action="账号创建",
            target=user.display_name,
            detail=f"username={user.username}, active={user.is_active}",
        )
        for user in users
    ]


def _agent_events(db: Session) -> list[AdminAuditLogOut]:
    rows = db.execute(
        select(AgentConversation, User)
        .join(User, User.id == AgentConversation.user_id)
        .order_by(AgentConversation.created_at.desc())
        .limit(50)
    ).all()
    return [
        AdminAuditLogOut(
            id=f"agent-{conversation.id}",
            time=conversation.created_at,
            actor=user.display_name,
            action="Agent 会话",
            target=conversation.title or f"conversation {conversation.id}",
            detail=f"user_id={conversation.user_id}",
        )
        for conversation, user in rows
    ]


def _report_events(db: Session) -> list[AdminAuditLogOut]:
    rows = db.execute(
        select(Report, User)
        .join(User, User.id == Report.user_id)
        .order_by(Report.created_at.desc())
        .limit(50)
    ).all()
    return [
        AdminAuditLogOut(
            id=f"report-{report.id}",
            time=report.created_at,
            actor=user.display_name,
            action="生成报告",
            target=report.title,
            detail=report.data_version,
        )
        for report, user in rows
    ]


def _count(db: Session, column, value: str) -> int:
    return int(db.scalar(select(func.count()).where(column == value)) or 0)
