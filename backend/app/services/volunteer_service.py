from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.volunteer import VolunteerPlan, VolunteerPlanItem
from app.schemas.policy import PolicyCheckItem, PolicyCheckResponse
from app.schemas.volunteer import VolunteerPlanExportItem, VolunteerPlanExportResponse, VolunteerPlanItemIn
from app.services.policy_service import check_policy_rules


def list_user_plans(db: Session, user: User, batch: str | None = None) -> list[VolunteerPlan]:
    stmt = (
        select(VolunteerPlan)
        .options(selectinload(VolunteerPlan.items))
        .where(VolunteerPlan.user_id == user.id)
        .order_by(VolunteerPlan.updated_at.desc())
    )
    if batch:
        stmt = stmt.where(VolunteerPlan.batch == batch)
    return list(db.scalars(stmt).all())


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
    plan_id: int | None = None,
) -> VolunteerPlan:
    plan = None
    if plan_id is not None:
        plan = db.scalar(select(VolunteerPlan).where(VolunteerPlan.id == plan_id, VolunteerPlan.user_id == user.id))
        if plan is None:
            raise LookupError("Volunteer plan not found")
        if plan is not None and plan.batch != batch:
            raise ValueError("Volunteer plan batch cannot be changed")

    if plan is None:
        version = _next_plan_version(db, user.id, batch)
        plan = VolunteerPlan(
            user_id=user.id,
            batch=batch,
            version=version,
            title=title or f"{batch}志愿方案 V{version}",
            source=source,
        )
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


def copy_user_plan(db: Session, user: User, plan_id: int, title: str | None = None) -> VolunteerPlan | None:
    source_plan = _get_owned_plan(db, user, plan_id)
    if source_plan is None:
        return None

    version = _next_plan_version(db, user.id, source_plan.batch)
    plan = VolunteerPlan(
        user_id=user.id,
        batch=source_plan.batch,
        version=version,
        title=title or f"{source_plan.title} 副本 V{version}",
        status="draft",
        source=source_plan.source,
        metadata_json=_clone_metadata(source_plan.metadata_json, source_plan.id, version),
    )
    db.add(plan)
    db.flush()
    for item in sorted(source_plan.items, key=lambda value: value.order):
        db.add(
            VolunteerPlanItem(
                plan_id=plan.id,
                group_id=item.group_id,
                order=item.order,
                risk_level=item.risk_level,
                match_score=item.match_score,
                notes=item.notes,
                snapshot_json=item.snapshot_json,
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


def export_user_plan(db: Session, user: User, plan_id: int) -> VolunteerPlanExportResponse | None:
    plan = _get_owned_plan(db, user, plan_id)
    if plan is None:
        return None

    items = [_export_item(item) for item in sorted(plan.items, key=lambda value: value.order)]
    return VolunteerPlanExportResponse(
        plan_id=plan.id,
        title=plan.title,
        batch=plan.batch,
        version=plan.version,
        status=plan.status,
        exported_at=datetime.utcnow(),
        item_count=len(items),
        items=items,
    )


def _refresh_plan(db: Session, plan_id: int) -> VolunteerPlan:
    plan = db.execute(
        select(VolunteerPlan).options(selectinload(VolunteerPlan.items)).where(VolunteerPlan.id == plan_id)
    ).scalar_one()
    return plan


def _get_owned_plan(db: Session, user: User, plan_id: int) -> VolunteerPlan | None:
    return db.execute(
        select(VolunteerPlan)
        .options(selectinload(VolunteerPlan.items))
        .where(VolunteerPlan.id == plan_id, VolunteerPlan.user_id == user.id)
    ).scalar_one_or_none()


def _next_plan_version(db: Session, user_id: int, batch: str) -> int:
    max_version = db.scalar(select(func.max(VolunteerPlan.version)).where(VolunteerPlan.user_id == user_id, VolunteerPlan.batch == batch))
    return int(max_version or 0) + 1


def _clone_metadata(metadata: dict | None, source_plan_id: int, version: int) -> dict:
    cloned = dict(metadata or {})
    cloned.update({"copied_from_plan_id": source_plan_id, "version": version})
    return cloned


def _export_item(item: VolunteerPlanItem) -> VolunteerPlanExportItem:
    snapshot = item.snapshot_json if isinstance(item.snapshot_json, dict) else {}
    return VolunteerPlanExportItem(
        order=item.order,
        group_id=item.group_id,
        school_code=_snapshot_str(snapshot, "school_code"),
        school_name=_snapshot_str(snapshot, "school_name"),
        group_code=_snapshot_str(snapshot, "group_code"),
        group_name=_snapshot_str(snapshot, "group_name"),
        subject_track=_snapshot_str(snapshot, "subject_track"),
        city=_snapshot_str(snapshot, "city"),
        risk_level=item.risk_level or _snapshot_str(snapshot, "risk_level"),
        match_score=item.match_score,
        suggested_adjustment=_snapshot_bool(snapshot, "suggested_adjustment"),
        majors=_snapshot_str_list(snapshot, "majors"),
        reasons=_snapshot_str_list(snapshot, "reasons"),
        warnings=_snapshot_str_list(snapshot, "warnings"),
        plan_count=_snapshot_int(snapshot, "plan_count"),
        historical_min_rank=_snapshot_int(snapshot, "historical_min_rank"),
        notes=item.notes,
    )


def _snapshot_str(snapshot: dict, key: str) -> str | None:
    value = snapshot.get(key)
    return value if isinstance(value, str) else None


def _snapshot_int(snapshot: dict, key: str) -> int | None:
    value = snapshot.get(key)
    return value if isinstance(value, int) else None


def _snapshot_bool(snapshot: dict, key: str) -> bool | None:
    value = snapshot.get(key)
    return value if isinstance(value, bool) else None


def _snapshot_str_list(snapshot: dict, key: str) -> list[str]:
    value = snapshot.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]
