from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admission import Major, School, SchoolMajorGroup
from app.models.user import User
from app.schemas.admission import MajorOut, SchoolGroupOut, SchoolOut

router = APIRouter()


@router.get("/universities", response_model=list[SchoolOut])
def list_schools(
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[School]:
    stmt = select(School).order_by(School.id.desc())
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(School.name.like(like), School.code.like(like), School.city.like(like)))
    return list(db.scalars(stmt.limit(200)).all())


@router.get("/majors", response_model=list[MajorOut])
def list_majors(
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Major]:
    stmt = select(Major).order_by(Major.id.desc())
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(Major.name.like(like), Major.code.like(like), Major.category.like(like)))
    return list(db.scalars(stmt.limit(200)).all())


@router.get("/school-major-groups", response_model=list[SchoolGroupOut])
def list_school_groups(
    year: int | None = None,
    batch: str | None = None,
    subject_track: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[SchoolMajorGroup]:
    stmt = select(SchoolMajorGroup).order_by(SchoolMajorGroup.id.desc())
    if year:
        stmt = stmt.where(SchoolMajorGroup.year == year)
    if batch:
        stmt = stmt.where(SchoolMajorGroup.batch == batch)
    if subject_track:
        stmt = stmt.where(SchoolMajorGroup.subject_track == subject_track)
    return list(db.scalars(stmt.limit(200)).all())
