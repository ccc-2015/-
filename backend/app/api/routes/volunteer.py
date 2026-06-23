from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.volunteer import VolunteerPlan
from app.schemas.volunteer import VolunteerPlanCheckResponse, VolunteerPlanOut, VolunteerPlanSaveRequest
from app.services.volunteer_service import check_user_plan, delete_user_plan, get_user_plan, save_user_plan

router = APIRouter()


@router.get("/plans/current", response_model=VolunteerPlanOut | None)
def get_current_plan(
    batch: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VolunteerPlanOut | None:
    return get_user_plan(db, user, batch)


@router.put("/plans/current", response_model=VolunteerPlanOut)
def save_current_plan(
    payload: VolunteerPlanSaveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VolunteerPlanOut:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Volunteer plan must contain at least one item")
    seen_orders = [item.order for item in payload.items]
    if len(seen_orders) != len(set(seen_orders)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Volunteer plan item orders must be unique")
    return save_user_plan(
        db=db,
        user=user,
        batch=payload.batch,
        items=payload.items,
        title=payload.title,
        source=payload.source,
        metadata=payload.metadata,
    )


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    delete_user_plan(db, user, plan_id)


@router.post("/plans/{plan_id}/check", response_model=VolunteerPlanCheckResponse)
def check_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VolunteerPlanCheckResponse:
    plan = db.execute(
        select(VolunteerPlan).options(selectinload(VolunteerPlan.items)).where(VolunteerPlan.id == plan_id, VolunteerPlan.user_id == user.id)
    ).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer plan not found")
    return VolunteerPlanCheckResponse(plan=plan, policy_result=check_user_plan(db, user, plan))
