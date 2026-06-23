from collections import Counter
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.profile import StudentProfile
from app.models.report import Report
from app.models.user import User
from app.models.volunteer import VolunteerPlan
from app.schemas.report import (
    ReportContent,
    ReportOut,
    ReportPlanSnapshot,
    ReportProfileSnapshot,
    ReportSummary,
    ReportVolunteerItem,
)


def list_user_reports(db: Session, user: User) -> list[Report]:
    return list(
        db.scalars(select(Report).where(Report.user_id == user.id).order_by(Report.updated_at.desc())).all()
    )


def get_user_report(db: Session, user: User, report_id: int) -> Report | None:
    return db.scalar(select(Report).where(Report.id == report_id, Report.user_id == user.id))


def generate_report_from_plan(db: Session, user: User, plan_id: int, title: str | None = None) -> Report | None:
    plan = db.execute(
        select(VolunteerPlan)
        .options(selectinload(VolunteerPlan.items))
        .where(VolunteerPlan.id == plan_id, VolunteerPlan.user_id == user.id)
    ).scalar_one_or_none()
    if plan is None:
        return None

    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    content = build_report_content(profile, plan)
    report = Report(
        user_id=user.id,
        plan_id=plan.id,
        title=title or f"{plan.batch}志愿分析报告 V{plan.version}",
        report_type="volunteer_plan",
        status="generated",
        data_version=build_data_version(plan),
        content_json=content.model_dump(mode="json"),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def build_report_content(profile: StudentProfile | None, plan: VolunteerPlan) -> ReportContent:
    items = [_build_volunteer_item(item) for item in sorted(plan.items, key=lambda value: value.order)]
    risk_counter = Counter(item.risk_level or "待评估" for item in items)
    cities = [item.city for item in items if item.city]
    majors = [major for item in items for major in item.majors]
    warning_count = sum(len(item.warnings) for item in items)
    adjustment_count = sum(1 for item in items if item.suggested_adjustment)
    return ReportContent(
        profile=_build_profile_snapshot(profile),
        plan=ReportPlanSnapshot(
            id=plan.id,
            title=plan.title,
            batch=plan.batch,
            version=plan.version,
            item_count=len(items),
            updated_at=plan.updated_at,
        ),
        summary=ReportSummary(
            risk_distribution=dict(risk_counter),
            top_cities=_top_values(cities, limit=5),
            top_majors=_top_values(majors, limit=8),
            adjustment_count=adjustment_count,
            warning_count=warning_count,
        ),
        volunteer_items=items,
        policy_citations=[
            "普通本科批和普通高职（专科）批均按 48 个院校专业组志愿控制。",
            "平行志愿投档原则按“分数优先、遵循志愿、一轮投档”解释。",
            "专业组可报性以批次、首选科目和再选科目要求校验结果为准。",
        ],
        disclaimers=[
            "本报告为报考辅助决策材料，不替代考生本人最终填报决定。",
            "推荐结果不承诺录取，最终以河南省教育考试院和高校正式公布信息为准。",
            "请在正式填报前再次核对招生计划、院校章程、体检要求、学费和专业备注。",
        ],
    )


def build_data_version(plan: VolunteerPlan) -> str:
    metadata = plan.metadata_json or {}
    explicit_version = metadata.get("data_version")
    if isinstance(explicit_version, str) and explicit_version.strip():
        return explicit_version.strip()
    return f"plan:{plan.id}:v{plan.version}:updated:{plan.updated_at.isoformat()}"


def report_to_out(report: Report) -> ReportOut:
    return ReportOut(
        id=report.id,
        user_id=report.user_id,
        plan_id=report.plan_id,
        title=report.title,
        report_type=report.report_type,
        status=report.status,
        data_version=report.data_version,
        content_json=ReportContent.model_validate(report.content_json),
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


def _build_profile_snapshot(profile: StudentProfile | None) -> ReportProfileSnapshot:
    if profile is None:
        return ReportProfileSnapshot()
    return ReportProfileSnapshot(
        name=profile.name,
        year=profile.year,
        province=profile.province,
        score=profile.score,
        rank=profile.rank,
        subject_track=profile.subject_track,
        selected_subjects=profile.selected_subjects or [],
        target_batches=profile.target_batches or [],
        city_preferences=profile.city_preferences or [],
        major_preferences=profile.major_preferences or [],
        accepts_adjustment=profile.accepts_adjustment,
    )


def _build_volunteer_item(item) -> ReportVolunteerItem:
    snapshot = item.snapshot_json if isinstance(item.snapshot_json, dict) else {}
    return ReportVolunteerItem(
        order=item.order,
        group_id=item.group_id,
        school_name=_snapshot_str(snapshot, "school_name"),
        group_name=_snapshot_str(snapshot, "group_name"),
        group_code=_snapshot_str(snapshot, "group_code"),
        subject_track=_snapshot_str(snapshot, "subject_track"),
        city=_snapshot_str(snapshot, "city"),
        risk_level=item.risk_level or _snapshot_str(snapshot, "risk_level"),
        match_score=item.match_score,
        suggested_adjustment=_snapshot_bool(snapshot, "suggested_adjustment"),
        majors=_snapshot_str_list(snapshot, "majors"),
        reasons=_snapshot_str_list(snapshot, "reasons"),
        warnings=_snapshot_str_list(snapshot, "warnings"),
    )


def _top_values(values: list[str], limit: int) -> list[str]:
    return [value for value, _ in Counter(values).most_common(limit)]


def _snapshot_str(snapshot: dict, key: str) -> str | None:
    value = snapshot.get(key)
    return value if isinstance(value, str) else None


def _snapshot_bool(snapshot: dict, key: str) -> bool | None:
    value = snapshot.get(key)
    return value if isinstance(value, bool) else None


def _snapshot_str_list(snapshot: dict, key: str) -> list[str]:
    value = snapshot.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]
