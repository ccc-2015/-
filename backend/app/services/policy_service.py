import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admission import School, SchoolMajorGroup
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.policy import PolicyCheckItem, PolicyCheckResponse, PolicyGroupCheckResult

SUPPORTED_BATCHES = {"普通本科批", "普通高职（专科）批"}
SUPPORTED_SUBJECT_TRACKS = {"物理类", "历史类"}
MAX_GROUPS_BY_BATCH = {
    "普通本科批": 48,
    "普通高职（专科）批": 48,
}
KNOWN_RESELECTED_SUBJECTS = {"思想政治", "政治", "地理", "化学", "生物"}


def check_policy_rules(db: Session, user: User, batch: str, group_items: list[PolicyCheckItem]) -> PolicyCheckResponse:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    max_groups = MAX_GROUPS_BY_BATCH.get(batch, 0)
    errors: list[str] = []
    warnings: list[str] = []
    explanations = [
        "一期仅校验河南 2026 普通本科批和普通高职（专科）批。",
        "普通本科批和普通高职（专科）批均按 48 个院校专业组志愿控制。",
        "平行志愿投档原则按“分数优先、遵循志愿、一轮投档”解释。",
    ]

    if profile is None:
        errors.append("请先维护考生画像。")
    else:
        if profile.subject_track not in SUPPORTED_SUBJECT_TRACKS:
            errors.append("画像中的首选科目必须是物理类或历史类。")
        if not profile.selected_subjects:
            warnings.append("画像中未填写再选科目，无法完整校验专业组选科要求。")
        if batch not in profile.target_batches:
            warnings.append("当前批次不在画像目标批次中。")
        if profile.score is None or profile.rank is None:
            warnings.append("画像中缺少成绩或位次，后续无法完成批次线和位次匹配。")

    if batch not in SUPPORTED_BATCHES:
        errors.append("一期仅支持普通本科批和普通高职（专科）批。")

    if max_groups and len(group_items) > max_groups:
        errors.append(f"{batch}最多支持 {max_groups} 个院校专业组志愿。")

    seen_orders = [item.order for item in group_items if item.order is not None]
    if len(seen_orders) != len(set(seen_orders)):
        errors.append("志愿顺序不能重复。")

    group_results = [_check_group(db, profile, batch, item) for item in group_items]
    for result in group_results:
        errors.extend([f"志愿 {result.order or result.group_id}: {message}" for message in result.errors])
        warnings.extend([f"志愿 {result.order or result.group_id}: {message}" for message in result.warnings])

    return PolicyCheckResponse(
        passed=not errors and all(result.passed for result in group_results),
        batch=batch,
        max_groups=max_groups,
        checked_group_count=len(group_items),
        errors=errors,
        warnings=warnings,
        explanations=explanations,
        group_results=group_results,
    )


def _check_group(db: Session, profile: StudentProfile | None, requested_batch: str, item: PolicyCheckItem) -> PolicyGroupCheckResult:
    row = db.execute(
        select(SchoolMajorGroup, School).join(School, School.id == SchoolMajorGroup.school_id).where(SchoolMajorGroup.id == item.group_id)
    ).first()

    if row is None:
        return PolicyGroupCheckResult(group_id=item.group_id, order=item.order, passed=False, errors=["院校专业组不存在。"])

    group, school = row
    errors: list[str] = []
    warnings: list[str] = []

    if not group.is_active:
        errors.append("院校专业组未启用。")
    if group.batch != requested_batch:
        errors.append("院校专业组批次与当前校验批次不一致。")

    if profile is not None:
        if profile.subject_track and group.subject_track != profile.subject_track:
            errors.append("院校专业组科类与画像首选科目不一致。")
        missing_subjects = _missing_required_subjects(group.subject_requirements, profile.selected_subjects)
        if missing_subjects:
            errors.append(f"不满足再选科目要求：缺少 {'、'.join(missing_subjects)}。")
    else:
        warnings.append("缺少考生画像，无法校验科类和选科要求。")

    return PolicyGroupCheckResult(
        group_id=group.id,
        order=item.order,
        passed=not errors,
        errors=errors,
        warnings=warnings,
        school_name=school.name,
        group_name=group.group_name,
        batch=group.batch,
        subject_track=group.subject_track,
        subject_requirements=group.subject_requirements,
    )


def _missing_required_subjects(requirements: str | None, selected_subjects: list[str]) -> list[str]:
    if not requirements:
        return []

    normalized = requirements.strip()
    if normalized in {"不限", "无", "不提科目要求"}:
        return []

    selected = set(selected_subjects)
    missing: list[str] = []
    for subject in KNOWN_RESELECTED_SUBJECTS:
        if subject in normalized and subject not in selected and not (subject == "政治" and "思想政治" in selected):
            missing.append("思想政治" if subject == "政治" else subject)

    if "或" in normalized and missing:
        alternatives = [subject for subject in missing if subject in normalized]
        if alternatives and any(subject in selected for subject in KNOWN_RESELECTED_SUBJECTS if subject in normalized):
            return []

    return _unique(missing)


def _unique(items: list[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        if item not in result:
            result.append(item)
    return result
