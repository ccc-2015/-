from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admission import AdmissionPlan, GroupMajor, HistoricalAdmission, Major, School, SchoolMajorGroup
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.recommendation import RecommendationGenerateResponse, RecommendationItemOut
from app.services.policy_service import _missing_required_subjects


def generate_recommendations(
    db: Session,
    user: User,
    batch: str | None,
    limit: int,
    only_eligible: bool,
) -> RecommendationGenerateResponse:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    if profile is None:
        raise ValueError("请先维护考生画像。")

    warnings = _profile_warnings(profile)
    target_batch = batch or (profile.target_batches[0] if profile.target_batches else None)
    if target_batch is None:
        warnings.append("画像中未填写目标批次，无法生成推荐。")
        return RecommendationGenerateResponse(profile_id=profile.id, batch=None, items=[], warnings=warnings)
    if profile.subject_track is None:
        warnings.append("画像中未填写科类，无法匹配院校专业组。")
        return RecommendationGenerateResponse(profile_id=profile.id, batch=target_batch, items=[], warnings=warnings)

    bounded_limit = max(1, min(limit, 100))
    rows = db.execute(
        select(SchoolMajorGroup, School)
        .join(School, School.id == SchoolMajorGroup.school_id)
        .where(
            SchoolMajorGroup.is_active == True,
            SchoolMajorGroup.year == profile.year,
            SchoolMajorGroup.batch == target_batch,
            SchoolMajorGroup.subject_track == profile.subject_track,
        )
        .order_by(SchoolMajorGroup.id.desc())
        .limit(300)
    ).all()

    items: list[RecommendationItemOut] = []
    skipped_by_policy = 0
    for group, school in rows:
        item = _build_recommendation_item(db, profile, group, school)
        if only_eligible and any(warning.startswith("不满足选科要求") for warning in item.warnings):
            skipped_by_policy += 1
            continue
        items.append(item)

    items.sort(key=lambda item: (-item.match_score, item.admission_risk_score, item.school_name, item.group_code))
    if skipped_by_policy:
        warnings.append(f"已过滤 {skipped_by_policy} 个不满足当前画像选科要求的院校专业组。")
    if not items:
        warnings.append("未检索到可推荐的院校专业组，请先导入院校专业组、招生计划和历年录取数据。")

    return RecommendationGenerateResponse(
        profile_id=profile.id,
        batch=target_batch,
        items=items[:bounded_limit],
        warnings=warnings,
    )


def _build_recommendation_item(
    db: Session,
    profile: StudentProfile,
    group: SchoolMajorGroup,
    school: School,
) -> RecommendationItemOut:
    missing_subjects = _missing_required_subjects(group.subject_requirements, profile.selected_subjects)
    plan_count = _plan_count(db, group)
    history = _latest_history(db, group)
    majors = _major_names(db, group.id)
    risk_level, admission_risk_score, rank_gap, risk_warning = _classify_risk(profile.rank, history.min_rank if history else None)
    match_score = _match_score(profile, school, group, majors, plan_count, missing_subjects, history)

    reasons = _build_reasons(profile, school, group, plan_count, history, rank_gap, majors, not missing_subjects)
    warnings = _build_warnings(profile, missing_subjects, history, risk_warning, group)
    sources = ["student_profiles", "school_major_groups"]
    if plan_count is not None:
        sources.append("admission_plans")
    if history is not None:
        sources.append("historical_admissions")

    return RecommendationItemOut(
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
        risk_level=risk_level,
        match_score=match_score,
        admission_risk_score=admission_risk_score,
        suggested_adjustment=profile.accepts_adjustment,
        plan_count=plan_count,
        historical_min_score=history.min_score if history else None,
        historical_min_rank=history.min_rank if history else None,
        rank_gap=rank_gap,
        majors=majors,
        reasons=reasons,
        warnings=warnings,
        sources=sources,
    )


def _plan_count(db: Session, group: SchoolMajorGroup) -> int | None:
    total = db.scalar(
        select(func.sum(AdmissionPlan.plan_count)).where(
            AdmissionPlan.group_id == group.id,
            AdmissionPlan.year == group.year,
            AdmissionPlan.batch == group.batch,
            AdmissionPlan.subject_track == group.subject_track,
        )
    )
    return int(total) if total is not None else None


def _latest_history(db: Session, group: SchoolMajorGroup) -> HistoricalAdmission | None:
    return db.execute(
        select(HistoricalAdmission)
        .where(
            HistoricalAdmission.group_id == group.id,
            HistoricalAdmission.batch == group.batch,
            HistoricalAdmission.subject_track == group.subject_track,
        )
        .order_by(HistoricalAdmission.year.desc())
        .limit(1)
    ).scalar_one_or_none()


def _major_names(db: Session, group_id: int) -> list[str]:
    rows = db.execute(
        select(Major.name)
        .join(GroupMajor, GroupMajor.major_id == Major.id)
        .where(GroupMajor.group_id == group_id)
        .order_by(Major.name)
        .limit(6)
    ).scalars()
    return list(rows)


def _classify_risk(candidate_rank: int | None, historical_min_rank: int | None) -> tuple[str, int, int | None, str | None]:
    if candidate_rank is None:
        return "待评估", 50, None, "画像中缺少位次，无法按历史最低位次评估风险。"
    if historical_min_rank is None:
        return "待评估", 50, None, "缺少历年最低位次，风险等级仅作待评估展示。"

    rank_gap = historical_min_rank - candidate_rank
    risk_score = _clamp(50 - round(rank_gap / 1000), 5, 95)
    if rank_gap >= 20000:
        return "兜底", risk_score, rank_gap, None
    if rank_gap >= 5000:
        return "保", risk_score, rank_gap, None
    if rank_gap >= -5000:
        return "稳", risk_score, rank_gap, None
    return "冲", risk_score, rank_gap, "考生位次低于最近历史最低位次，需谨慎排序。"


def _match_score(
    profile: StudentProfile,
    school: School,
    group: SchoolMajorGroup,
    majors: list[str],
    plan_count: int | None,
    missing_subjects: list[str],
    history: HistoricalAdmission | None,
) -> int:
    score = 55
    if not missing_subjects:
        score += 15
    if plan_count:
        score += 5 if plan_count < 50 else 10
    if history and history.min_rank:
        score += 8
    if school.city and school.city in profile.city_preferences:
        score += 8
    if school.tier and school.tier in profile.school_tier_preferences:
        score += 6
    if _matches_major_preference(profile.major_preferences, group.group_name, majors):
        score += 10
    return _clamp(score, 0, 100)


def _matches_major_preference(preferences: list[str], group_name: str, majors: list[str]) -> bool:
    haystack = f"{group_name} {' '.join(majors)}"
    return any(preference and preference in haystack for preference in preferences)


def _build_reasons(
    profile: StudentProfile,
    school: School,
    group: SchoolMajorGroup,
    plan_count: int | None,
    history: HistoricalAdmission | None,
    rank_gap: int | None,
    majors: list[str],
    eligible: bool,
) -> list[str]:
    reasons: list[str] = []
    if eligible:
        reasons.append("满足当前画像科类和再选科目要求。")
    if rank_gap is not None:
        direction = "优于或等于" if rank_gap >= 0 else "低于"
        reasons.append(f"考生位次{direction}最近历史最低位次 {abs(rank_gap)} 名。")
    if plan_count is not None:
        reasons.append(f"当前招生计划合计 {plan_count} 人。")
    if school.city and school.city in profile.city_preferences:
        reasons.append(f"{school.city}匹配地域偏好。")
    if school.tier and school.tier in profile.school_tier_preferences:
        reasons.append(f"{school.tier}匹配院校层次偏好。")
    if _matches_major_preference(profile.major_preferences, group.group_name, majors):
        reasons.append("专业组或专业名称匹配专业偏好。")
    if history is None:
        reasons.append("暂未找到历年录取记录，仅基于画像和计划数据展示。")
    return reasons


def _build_warnings(
    profile: StudentProfile,
    missing_subjects: list[str],
    history: HistoricalAdmission | None,
    risk_warning: str | None,
    group: SchoolMajorGroup,
) -> list[str]:
    warnings: list[str] = []
    if missing_subjects:
        warnings.append(f"不满足选科要求：缺少 {'、'.join(missing_subjects)}。")
    if profile.rank is None:
        warnings.append("画像缺少位次，无法进行冲稳保判断。")
    if history is None:
        warnings.append("缺少历年录取数据，不能计算稳定风险区间。")
    if risk_warning:
        warnings.append(risk_warning)
    if not profile.accepts_adjustment:
        warnings.append("画像显示不接受调剂，需重点核对专业组内专业范围。")
    if group.tuition_note:
        warnings.append(f"学费备注：{group.tuition_note}")
    return warnings


def _profile_warnings(profile: StudentProfile) -> list[str]:
    warnings: list[str] = []
    if profile.score is None:
        warnings.append("画像中缺少成绩。")
    if profile.rank is None:
        warnings.append("画像中缺少位次。")
    if not profile.selected_subjects:
        warnings.append("画像中未填写再选科目，选科校验可能不完整。")
    return warnings


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))
