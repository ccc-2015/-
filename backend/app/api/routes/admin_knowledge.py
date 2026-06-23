from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.knowledge import KnowledgeDocument
from app.models.user import User
from app.schemas.knowledge import KnowledgeDocumentCreate, KnowledgeDocumentOut, KnowledgeDocumentUpdate

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
) -> list[KnowledgeDocument]:
    stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.id.desc())
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(KnowledgeDocument.title.like(like), KnowledgeDocument.content.like(like)))
    if status_filter:
        stmt = stmt.where(KnowledgeDocument.status == status_filter)
    if category:
        stmt = stmt.where(KnowledgeDocument.category == category)
    return list(db.scalars(stmt.limit(200)).all())


@router.post("/knowledge/documents", response_model=KnowledgeDocumentOut)
def create_document(
    payload: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> KnowledgeDocument:
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
    db.commit()
    db.refresh(document)
    return document


@router.get("/knowledge/documents/{document_id}", response_model=KnowledgeDocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> KnowledgeDocument:
    document = db.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    return document


@router.patch("/knowledge/documents/{document_id}", response_model=KnowledgeDocumentOut)
def update_document(
    document_id: int,
    payload: KnowledgeDocumentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> KnowledgeDocument:
    document = db.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        _validate_status(update_data["status"])
    for field, value in update_data.items():
        setattr(document, field, value)
    document.updated_by = user.id
    document.version += 1
    db.commit()
    db.refresh(document)
    return document


@router.delete("/knowledge/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    document = db.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")
    db.delete(document)
    db.commit()
