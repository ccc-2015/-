from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.admission import BatchLine, ScoreSegment
from app.models.user import User
from app.schemas.admission import BatchLineOut, RankLookupResponse

router = APIRouter()


@router.get("/rank", response_model=RankLookupResponse)
def get_rank(
    year: int = Query(...),
    subject_track: str = Query(...),
    score: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RankLookupResponse:
    segment = db.scalar(
        select(ScoreSegment)
        .where(ScoreSegment.year == year, ScoreSegment.subject_track == subject_track, ScoreSegment.score <= score)
        .order_by(ScoreSegment.score.desc())
        .limit(1)
    )
    return RankLookupResponse(
        year=year,
        subject_track=subject_track,
        score=score,
        rank=segment.rank if segment else None,
        matched_score=segment.score if segment else None,
        cumulative_count=segment.cumulative_count if segment else None,
    )


@router.get("/batch-lines", response_model=list[BatchLineOut])
def get_batch_lines(
    year: int | None = None,
    subject_track: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BatchLine]:
    stmt = select(BatchLine).order_by(BatchLine.year.desc(), BatchLine.subject_track, BatchLine.batch)
    if year:
        stmt = stmt.where(BatchLine.year == year)
    if subject_track:
        stmt = stmt.where(BatchLine.subject_track == subject_track)
    return list(db.scalars(stmt.limit(100)).all())
