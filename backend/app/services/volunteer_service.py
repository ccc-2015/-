from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.volunteer import VolunteerPlan, VolunteerPlanItem
from app.schemas.policy import PolicyCheckItem, PolicyCheckResponse
from app.schemas.volunteer import VolunteerPlanItemIn
from app.services.policy_service import check_policy_rules


def get_user_plan(db: Session, user: User, batch: str | None = None) -> VolunteerPlan | None:
    stmt = (
        select(VolunteerPlan)
        .options(selectinload(VolunteerPlan.items))
        .where(VolunteerPlan.user_id == user.id)
        .order_by(VolunteerPlan.updated_at.desc())
    )
    if batch:
        stmt = stmt.where(VolunteerPlan.batch == batch)
    return db.execute(stmt.limit(1)).scalar_one_or_none()


def save_user_plan(
    db: Session,
    user: User,
    batch: str,
    items: list[VolunteerPlanItemIn],
    title: str | None,
    source: str,
    metadata: dict | None,
) -> VolunteerPlan:
    plan = db.scalar(select(VolunteerPlan).where(VolunteerPlan.user_id == user.id, VolunteerPlan.batch == batch))
    if plan is None:
        plan = VolunteerPlan(user_id=user.id, batch=batch, title=title or f"{batch}志愿方案", source=source)
        db.add(plan)
        db.flush()
    else:
        plan.title = title or plan.title
        plan.source = source

    plan.status = "draft"
    plan.metadata_json = metadata
    plan.updated_at = datetime.utcnow()
    db.execute(delete(VolunteerPlanItem).where(VolunteerPlanItem.plan_id == plan.id))
    for item in sorted(items, key=lambda value: value.order):
        db.add(
            VolunteerPlanItem(
                plan_id=plan.id,
                group_id=item.group_id,
                order=item.order,
                risk_level=item.risk_level,
                match_score=item.match_score,
                notes=item.notes,
                snapshot_json=item.snapshot,
            )
        )
    db.commit()
    return _refresh_plan(db, plan.id)


def delete_user_plan(db: Session, user: User, plan_id: int) -> None:
    plan = db.scalar(select(VolunteerPlan).where(VolunteerPlan.id == plan_id, VolunteerPlan.user_id == user.id))
    if plan is None:
        return
    db.delete(plan)
    db.commit()


def check_user_plan(db: Session, user: User, plan: VolunteerPlan) -> PolicyCheckResponse:
    group_items = [PolicyCheckItem(group_id=item.group_id, order=item.order) for item in sorted(plan.items, key=lambda value: value.order)]
    return check_policy_rules(db, user, plan.batch, group_items)


def _refresh_plan(db: Session, plan_id: int) -> VolunteerPlan:
    plan = db.execute(
        select(VolunteerPlan).options(selectinload(VolunteerPlan.items)).where(VolunteerPlan.id == plan_id)
    ).scalar_one()
    return plan
