from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.admission import AdmissionPlan, HistoricalAdmission, School, SchoolMajorGroup
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.profile import StudentProfile
from app.models.user import User
from app.services.recommendation_service import generate_recommendations


def search_school_groups(db: Session, keyword: str | None = None) -> dict:
    stmt = select(SchoolMajorGroup, School).join(School, School.id == SchoolMajorGroup.school_id)
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(School.name.like(like))
    rows = db.execute(stmt.limit(5)).all()
    return {
        "count": len(rows),
        "items": [
            {
                "school_name": school.name,
                "group_name": group.group_name,
                "batch": group.batch,
                "subject_track": group.subject_track,
                "subject_requirements": group.subject_requirements,
            }
            for group, school in rows
        ],
    }


def get_data_summary(db: Session) -> dict:
    school_count = db.scalar(select(func.count()).select_from(School)) or 0
    group_count = db.scalar(select(func.count()).select_from(SchoolMajorGroup)) or 0
    plan_count = db.scalar(select(func.count()).select_from(AdmissionPlan)) or 0
    history_count = db.scalar(select(func.count()).select_from(HistoricalAdmission)) or 0
    published_knowledge_count = db.scalar(
        select(func.count()).select_from(KnowledgeDocument).where(KnowledgeDocument.status == "published")
    ) or 0
    return {
        "school_count": school_count,
        "group_count": group_count,
        "plan_count": plan_count,
        "historical_admission_count": history_count,
        "published_knowledge_count": published_knowledge_count,
    }


def get_student_profile_summary(db: Session, user_id: int) -> dict:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user_id))
    if profile is None:
        return {"exists": False}
    return {
        "exists": True,
        "year": profile.year,
        "province": profile.province,
        "score": profile.score,
        "rank": profile.rank,
        "subject_track": profile.subject_track,
        "selected_subjects": profile.selected_subjects,
        "target_batches": profile.target_batches,
    }


def generate_user_recommendations(db: Session, user_id: int, limit: int = 5) -> dict:
    user = db.get(User, user_id)
    if user is None:
        return {"ok": False, "error": "用户不存在，无法生成推荐。"}
    try:
        response = generate_recommendations(db=db, user=user, batch=None, limit=limit, only_eligible=True)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}

    return {
        "ok": True,
        "profile_id": response.profile_id,
        "batch": response.batch,
        "warnings": response.warnings,
        "items": [
            {
                "school_name": item.school_name,
                "group_name": item.group_name,
                "group_code": item.group_code,
                "batch": item.batch,
                "risk_level": item.risk_level,
                "match_score": item.match_score,
                "admission_risk_score": item.admission_risk_score,
                "plan_count": item.plan_count,
                "historical_min_rank": item.historical_min_rank,
                "rank_gap": item.rank_gap,
                "majors": item.majors,
                "reasons": item.reasons,
                "warnings": item.warnings,
                "sources": item.sources,
            }
            for item in response.items[:limit]
        ],
    }


def search_published_knowledge(db: Session, query: str, limit: int = 5) -> dict:
    keywords = _extract_keywords(query)
    stmt = (
        select(KnowledgeChunk, KnowledgeDocument)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
        .where(KnowledgeDocument.status == "published")
    )
    if keywords:
        conditions = []
        for keyword in keywords[:6]:
            like = f"%{keyword}%"
            conditions.extend([KnowledgeDocument.title.like(like), KnowledgeChunk.content.like(like)])
        stmt = stmt.where(or_(*conditions))

    rows = list(db.execute(stmt.order_by(KnowledgeDocument.updated_at.desc(), KnowledgeChunk.chunk_index).limit(limit)).all())
    if rows:
        items = [
            {
                "id": document.id,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "title": document.title,
                "category": document.category,
                "source_type": document.source_type,
                "source_url": document.source_url,
                "version": document.version,
                "excerpt": chunk.content[:240],
                "tags": document.tags or [],
            }
            for chunk, document in rows
        ]
        return {"count": len(items), "items": items}

    documents = list(db.scalars(select(KnowledgeDocument).where(KnowledgeDocument.status == "published").order_by(KnowledgeDocument.updated_at.desc()).limit(limit)).all())
    return {
        "count": len(documents),
        "items": [
            {
                "id": document.id,
                "chunk_id": None,
                "chunk_index": None,
                "title": document.title,
                "category": document.category,
                "source_type": document.source_type,
                "source_url": document.source_url,
                "version": document.version,
                "excerpt": document.content[:240],
                "tags": document.tags or [],
            }
            for document in documents
        ],
    }


def _extract_keywords(query: str) -> list[str]:
    candidates = [
        "平行志愿",
        "普通本科批",
        "普通高职",
        "专科批",
        "批次",
        "投档",
        "录取",
        "调剂",
        "选科",
        "退档",
        "招生章程",
        "政策",
        "规则",
    ]
    keywords = [candidate for candidate in candidates if candidate in query]
    keywords.extend(part.strip() for part in query.replace("，", " ").replace("。", " ").split() if part.strip())
    deduped: list[str] = []
    for keyword in keywords:
        if keyword and keyword not in deduped:
            deduped.append(keyword)
    return deduped
