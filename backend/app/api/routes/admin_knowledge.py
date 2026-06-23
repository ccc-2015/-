from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.user import User
from app.schemas.knowledge import (
    KnowledgeChunkOut,
    KnowledgeChunkRebuildResponse,
    KnowledgeCleaningReportOut,
    KnowledgeDocumentCreate,
    KnowledgeDocumentOut,
    KnowledgeDocumentUpdate,
)
from app.services.knowledge_service import create_document_from_upload, rebuild_document_chunks, refresh_cleaning_report, save_knowledge_upload

router = APIRouter()

ALLOWED_STATUSES = {"draft", "published", "archived"}


def _validate_status(value: str) -> None:
    if value not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid knowledge status")


@router.get("/knowledge/documents", response_model=list[KnowledgeDocumentOut])
def list_documents(
    keyword: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[KnowledgeDocumentOut]:
    stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.id.desc())
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(KnowledgeDocument.title.like(like), KnowledgeDocument.content.like(like)))
    if status_filter:
        stmt = stmt.where(KnowledgeDocument.status == status_filter)
    if category:
        stmt = stmt.where(KnowledgeDocument.category == category)
    documents = list(db.scalars(stmt.limit(200)).all())
    return [_document_out(db, document) for document in documents]


@router.post("/knowledge/documents", response_model=KnowledgeDocumentOut)
def create_document(
    payload: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> KnowledgeDocumentOut:
    _validate_status(payload.status)
    document = KnowledgeDocument(
        title=payload.title,
        category=payload.category,
        content=payload.content,
        source_type=payload.source_type,
        source_url=payload.source_url,
        status=payload.status,
        tags=payload.tags,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(document)
    db.flush()
    rebuild_document_chunks(db, document)
    db.commit()
    db.refresh(document)
    return _document_out(db, document)


@router.post("/knowledge/documents/upload", response_model=KnowledgeDocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    category: str | None = Form(default=None),
    source_type: str | None = Form(default=None),
    source_url: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    status_value: str = Form(default="draft", alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> KnowledgeDocumentOut:
    _validate_status(status_value)
    try:
        path = await save_knowledge_upload(file)
        document = create_document_from_upload(
            db=db,
            user=user,
            path=path,
            title=title,
            category=category,
            source_type=source_type,
            source_url=source_url,
            status=status_value,
            tags=_split_tags(tags),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _document_out(db, document)


@router.get("/knowledge/documents/{document_id}", response_model=KnowledgeDocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> KnowledgeDocumentOut:
    document = _get_document_or_404(db, document_id)
    return _document_out(db, document)


@router.patch("/knowledge/documents/{document_id}", response_model=KnowledgeDocumentOut)
def update_document(
    document_id: int,
    payload: KnowledgeDocumentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> KnowledgeDocumentOut:
    document = _get_document_or_404(db, document_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        _validate_status(update_data["status"])
    for field, value in update_data.items():
        setattr(document, field, value)
    document.updated_by = user.id
    document.version += 1
    db.flush()
    rebuild_document_chunks(db, document)
    db.commit()
    db.refresh(document)
    return _document_out(db, document)


@router.delete("/knowledge/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    document = _get_document_or_404(db, document_id)
    db.delete(document)
    db.commit()


@router.post("/knowledge/documents/{document_id}/chunks/rebuild", response_model=KnowledgeChunkRebuildResponse)
def rebuild_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> KnowledgeChunkRebuildResponse:
    document = _get_document_or_404(db, document_id)
    chunk_count = rebuild_document_chunks(db, document)
    db.commit()
    return KnowledgeChunkRebuildResponse(document_id=document.id, chunk_count=chunk_count)


@router.get("/knowledge/documents/{document_id}/cleaning-report", response_model=KnowledgeCleaningReportOut)
def get_cleaning_report(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> KnowledgeCleaningReportOut:
    document = _get_document_or_404(db, document_id)
    report = refresh_cleaning_report(db, document)
    db.commit()
    db.refresh(report)
    return report


@router.get("/knowledge/documents/{document_id}/chunks", response_model=list[KnowledgeChunkOut])
def list_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[KnowledgeChunk]:
    _get_document_or_404(db, document_id)
    return list(
        db.scalars(
            select(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id).order_by(KnowledgeChunk.chunk_index).limit(500)
        ).all()
    )


def _get_document_or_404(db: Session, document_id: int) -> KnowledgeDocument:
    document = db.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return document


def _document_out(db: Session, document: KnowledgeDocument) -> KnowledgeDocumentOut:
    chunk_count = db.scalar(select(func.count()).select_from(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id)) or 0
    return KnowledgeDocumentOut(
        id=document.id,
        title=document.title,
        category=document.category,
        content=document.content,
        source_type=document.source_type,
        source_url=document.source_url,
        status=document.status,
        tags=document.tags,
        version=document.version,
        created_by=document.created_by,
        updated_by=document.updated_by,
        created_at=document.created_at,
        updated_at=document.updated_at,
        chunk_count=chunk_count,
    )


def _split_tags(value: str | None) -> list[str] | None:
    if not value:
        return None
    tags = [item.strip() for item in value.replace("，", ",").replace("、", ",").split(",")]
    return [item for item in tags if item] or None
