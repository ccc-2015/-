from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.admission import AdmissionPlan, HistoricalAdmission, School, SchoolMajorGroup
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.admission import SearchGroupItem, SearchGroupsRequest, SearchGroupsResponse
from app.services.policy_service import _missing_required_subjects

router = APIRouter()


@router.post("/search-groups", response_model=SearchGroupsResponse)
def search_groups(
    payload: SearchGroupsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SearchGroupsResponse:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id)) if payload.use_profile else None
    year = payload.year or profile.year if profile else payload.year
    batch = payload.batch or (profile.target_batches[0] if profile and profile.target_batches else None)
    subject_track = payload.subject_track or (profile.subject_track if profile else None)

    stmt = select(SchoolMajorGroup, School).join(School, School.id == SchoolMajorGroup.school_id).where(SchoolMajorGroup.is_active == True)
    if year:
        stmt = stmt.where(SchoolMajorGroup.year == year)
    if batch:
        stmt = stmt.where(SchoolMajorGroup.batch == batch)
    if subject_track:
        stmt = stmt.where(SchoolMajorGroup.subject_track == subject_track)
    if payload.keyword:
        like = f"%{payload.keyword}%"
        stmt = stmt.where(
            or_(
                School.name.like(like),
                School.code.like(like),
                School.city.like(like),
                SchoolMajorGroup.group_code.like(like),
                SchoolMajorGroup.group_name.like(like),
            )
        )

    limit = max(1, min(payload.limit, 200))
    rows = db.execute(stmt.order_by(SchoolMajorGroup.id.desc()).limit(limit)).all()
    items = [_build_group_item(db, profile, group, school, bool(payload.only_eligible)) for group, school in rows]
    if payload.only_eligible:
        items = [item for item in items if item.eligible]

    return SearchGroupsResponse(items=items, total=len(items), used_profile=profile is not None)


@router.get("/groups/{group_id}", response_model=SearchGroupItem)
def get_group_detail(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> SearchGroupItem:
    row = db.execute(
        select(SchoolMajorGroup, School).join(School, School.id == SchoolMajorGroup.school_id).where(SchoolMajorGroup.id == group_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="School major group not found")
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    group, school = row
    return _build_group_item(db, profile, group, school, only_eligible=False)


def _build_group_item(
    db: Session,
    profile: StudentProfile | None,
    group: SchoolMajorGroup,
    school: School,
    only_eligible: bool,
) -> SearchGroupItem:
    errors: list[str] = []
    warnings: list[str] = []
    if profile is not None:
        if profile.subject_track and profile.subject_track != group.subject_track:
            errors.append("科类不匹配")
        missing = _missing_required_subjects(group.subject_requirements, profile.selected_subjects)
        if missing:
            errors.append(f"缺少再选科目：{'、'.join(missing)}")
    else:
        warnings.append("未使用考生画像，未校验选科要求")

    plan_count = db.scalar(
        select(func.sum(AdmissionPlan.plan_count)).where(
            AdmissionPlan.group_id == group.id,
            AdmissionPlan.year == group.year,
            AdmissionPlan.batch == group.batch,
            AdmissionPlan.subject_track == group.subject_track,
        )
    )
    history = db.execute(
        select(HistoricalAdmission)
        .where(
            HistoricalAdmission.group_id == group.id,
            HistoricalAdmission.batch == group.batch,
            HistoricalAdmission.subject_track == group.subject_track,
        )
        .order_by(HistoricalAdmission.year.desc())
        .limit(1)
    ).scalar_one_or_none()

    return SearchGroupItem(
        group_id=group.id,
        school_id=school.id,
        school_code=school.code,
        school_name=school.name,
        province=school.province,
        city=school.city,
        school_type=school.school_type,
        tier=school.tier,
        group_code=group.group_code,
        group_name=group.group_name,
        year=group.year,
        batch=group.batch,
        subject_track=group.subject_track,
        subject_requirements=group.subject_requirements,
        plan_count=int(plan_count) if plan_count is not None else None,
        historical_min_score=history.min_score if history else None,
        historical_min_rank=history.min_rank if history else None,
        eligible=not errors,
        eligibility_errors=errors,
        eligibility_warnings=warnings,
    )
