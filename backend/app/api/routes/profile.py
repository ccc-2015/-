from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.profile import StudentProfileOut, StudentProfileUpsert

router = APIRouter()


def _get_or_create_profile(db: Session, user: User) -> StudentProfile:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    if profile is not None:
        return profile

    profile = StudentProfile(
        user_id=user.id,
        name=user.display_name,
        year=2026,
        province="河南",
        selected_subjects=[],
        target_batches=["普通本科批", "普通高职（专科）批"],
        city_preferences=[],
        major_preferences=[],
        school_tier_preferences=[],
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=StudentProfileOut)
def get_my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> StudentProfile:
    return _get_or_create_profile(db, user)


@router.put("/me", response_model=StudentProfileOut)
def update_my_profile(
    payload: StudentProfileUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StudentProfile:
    profile = _get_or_create_profile(db, user)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
