from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admission import AdmissionPlan, BatchLine, HistoricalAdmission, Major, School, SchoolMajorGroup, ScoreSegment
from app.models.user import User
from app.schemas.admission import AdmissionPlanOut, BatchLineOut, HistoricalAdmissionOut, MajorOut, SchoolGroupOut, SchoolOut, ScoreSegmentOut

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


@router.get("/batch-lines", response_model=list[BatchLineOut])
def list_batch_lines(
    year: int | None = None,
    subject_track: str | None = None,
    batch: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[BatchLine]:
    stmt = select(BatchLine).order_by(BatchLine.year.desc(), BatchLine.subject_track, BatchLine.batch)
    if year:
        stmt = stmt.where(BatchLine.year == year)
    if subject_track:
        stmt = stmt.where(BatchLine.subject_track == subject_track)
    if batch:
        stmt = stmt.where(BatchLine.batch == batch)
    return list(db.scalars(stmt.limit(200)).all())


@router.get("/score-segments", response_model=list[ScoreSegmentOut])
def list_score_segments(
    year: int | None = None,
    subject_track: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[ScoreSegment]:
    stmt = select(ScoreSegment).order_by(ScoreSegment.year.desc(), ScoreSegment.subject_track, ScoreSegment.score.desc())
    if year:
        stmt = stmt.where(ScoreSegment.year == year)
    if subject_track:
        stmt = stmt.where(ScoreSegment.subject_track == subject_track)
    return list(db.scalars(stmt.limit(200)).all())


@router.get("/admission-plans", response_model=list[AdmissionPlanOut])
def list_admission_plans(
    year: int | None = None,
    batch: str | None = None,
    subject_track: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdmissionPlan]:
    stmt = select(AdmissionPlan).order_by(AdmissionPlan.year.desc(), AdmissionPlan.id.desc())
    if year:
        stmt = stmt.where(AdmissionPlan.year == year)
    if batch:
        stmt = stmt.where(AdmissionPlan.batch == batch)
    if subject_track:
        stmt = stmt.where(AdmissionPlan.subject_track == subject_track)
    return list(db.scalars(stmt.limit(200)).all())


@router.get("/historical-admissions", response_model=list[HistoricalAdmissionOut])
def list_historical_admissions(
    year: int | None = None,
    batch: str | None = None,
    subject_track: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[HistoricalAdmission]:
    stmt = select(HistoricalAdmission).order_by(HistoricalAdmission.year.desc(), HistoricalAdmission.id.desc())
    if year:
        stmt = stmt.where(HistoricalAdmission.year == year)
    if batch:
        stmt = stmt.where(HistoricalAdmission.batch == batch)
    if subject_track:
        stmt = stmt.where(HistoricalAdmission.subject_track == subject_track)
    return list(db.scalars(stmt.limit(200)).all())
