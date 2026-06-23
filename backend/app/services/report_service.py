import csv
from collections import Counter
from datetime import datetime
from io import StringIO

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.profile import StudentProfile
from app.models.report import Report
from app.models.user import User
from app.models.volunteer import VolunteerPlan
from app.modules.rag_agent.tools import search_published_knowledge
from app.schemas.report import (
    ReportContent,
    ReportOut,
    ReportPlanSnapshot,
    ReportProfileSnapshot,
    ReportSummary,
    ReportVolunteerItem,
    ReportPolicyCitation,
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
    content = build_report_content(db, profile, plan)
    report = Report(
        user_id=user.id,
        plan_id=plan.id,
        title=title or f"{plan.batch}志愿分析报告 V{plan.version}",
        report_type="volunteer_plan",
        status="generated",
        data_version=build_data_version(plan, content.policy_citations),
        content_json=content.model_dump(mode="json"),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def build_report_content(db: Session, profile: StudentProfile | None, plan: VolunteerPlan) -> ReportContent:
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
        policy_citations=_build_policy_citations(db, plan),
        disclaimers=[
            "本报告为报考辅助决策材料，不替代考生本人最终填报决定。",
            "推荐结果不承诺录取，最终以河南省教育考试院和高校正式公布信息为准。",
            "请在正式填报前再次核对招生计划、院校章程、体检要求、学费和专业备注。",
        ],
    )


def build_data_version(plan: VolunteerPlan, citations: list[ReportPolicyCitation] | None = None) -> str:
    metadata = plan.metadata_json or {}
    explicit_version = metadata.get("data_version")
    if isinstance(explicit_version, str) and explicit_version.strip():
        base = explicit_version.strip()
    else:
        base = f"plan:{plan.id}:v{plan.version}:updated:{plan.updated_at.isoformat()}"
    knowledge_refs = [
        f"doc:{citation.document_id}:v{citation.version or '-'}:chunk:{citation.chunk_id or '-'}"
        for citation in citations or []
        if not citation.fallback and citation.document_id
    ]
    if not knowledge_refs:
        return base
    return f"{base}|kb:{','.join(knowledge_refs)}"


def report_to_out(report: Report) -> ReportOut:
    content = _parse_report_content(report.content_json)
    return ReportOut(
        id=report.id,
        user_id=report.user_id,
        plan_id=report.plan_id,
        title=report.title,
        report_type=report.report_type,
        status=report.status,
        data_version=report.data_version,
        content_json=content,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


def build_report_csv(report: Report) -> str:
    content = _parse_report_content(report.content_json)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["报告标题", report.title])
    writer.writerow(["生成时间", report.created_at.isoformat()])
    writer.writerow(["数据版本", report.data_version])
    writer.writerow(["方案标题", content.plan.title])
    writer.writerow(["批次", content.plan.batch])
    writer.writerow(["方案版本", f"V{content.plan.version}"])
    writer.writerow([])
    writer.writerow(["考生画像"])
    writer.writerow(["姓名", "年份", "省份", "成绩", "位次", "科类", "选科", "目标批次", "接受调剂"])
    writer.writerow(
        [
            content.profile.name or "",
            content.profile.year or "",
            content.profile.province or "",
            content.profile.score or "",
            content.profile.rank or "",
            content.profile.subject_track or "",
            "、".join(content.profile.selected_subjects),
            "、".join(content.profile.target_batches),
            "是" if content.profile.accepts_adjustment else "否",
        ]
    )
    writer.writerow([])
    writer.writerow(["推荐分布"])
    writer.writerow(["风险层级", "数量"])
    for risk, count in content.summary.risk_distribution.items():
        writer.writerow([risk, count])
    writer.writerow(["建议服从调剂数量", content.summary.adjustment_count])
    writer.writerow(["风险提示数量", content.summary.warning_count])
    writer.writerow([])
    writer.writerow(["志愿列表"])
    writer.writerow(["序号", "院校", "专业组", "专业组代码", "科类", "城市", "风险", "匹配分", "调剂建议", "专业建议", "推荐理由", "风险提示"])
    for item in content.volunteer_items:
        writer.writerow(
            [
                item.order,
                item.school_name or "",
                item.group_name or "",
                item.group_code or "",
                item.subject_track or "",
                item.city or "",
                item.risk_level or "",
                item.match_score if item.match_score is not None else "",
                "建议服从调剂" if item.suggested_adjustment else "谨慎不服从",
                "、".join(item.majors),
                "；".join(item.reasons),
                "；".join(item.warnings),
            ]
        )
    writer.writerow([])
    writer.writerow(["政策依据"])
    writer.writerow(["标题", "摘录", "来源 URL", "文档 ID", "切片 ID", "版本"])
    for citation in content.policy_citations:
        writer.writerow([citation.title, citation.excerpt, citation.source_url or "", citation.document_id or "", citation.chunk_id or "", citation.version or ""])
    writer.writerow([])
    writer.writerow(["免责声明"])
    for disclaimer in content.disclaimers:
        writer.writerow([disclaimer])
    return "\ufeff" + output.getvalue()


def _parse_report_content(value: dict) -> ReportContent:
    normalized = dict(value or {})
    citations = normalized.get("policy_citations") or []
    if citations and all(isinstance(item, str) for item in citations):
        normalized["policy_citations"] = [
            {
                "title": "内置规则说明",
                "excerpt": item,
                "fallback": True,
            }
            for item in citations
        ]
    return ReportContent.model_validate(normalized)


def _build_policy_citations(db: Session, plan: VolunteerPlan) -> list[ReportPolicyCitation]:
    query = f"{plan.batch} 平行志愿 投档 调剂 专业组 选科 规则"
    try:
        results = search_published_knowledge(db, query=query, limit=3)
    except ValueError:
        results = {"items": []}
    citations = [_knowledge_item_to_citation(item) for item in results.get("items", []) if isinstance(item, dict)]
    if citations:
        return citations
    return [
        ReportPolicyCitation(
            title="内置规则说明",
            excerpt="普通本科批和普通高职（专科）批均按 48 个院校专业组志愿控制。",
            fallback=True,
        ),
        ReportPolicyCitation(
            title="内置规则说明",
            excerpt="平行志愿投档原则按“分数优先、遵循志愿、一轮投档”解释。",
            fallback=True,
        ),
        ReportPolicyCitation(
            title="内置规则说明",
            excerpt="专业组可报性以批次、首选科目和再选科目要求校验结果为准。",
            fallback=True,
        ),
    ]


def _knowledge_item_to_citation(item: dict) -> ReportPolicyCitation:
    score_detail = item.get("score_detail") if isinstance(item.get("score_detail"), dict) else {}
    return ReportPolicyCitation(
        title=str(item.get("title") or "知识库引用"),
        excerpt=str(item.get("excerpt") or ""),
        source_url=item.get("source_url") if isinstance(item.get("source_url"), str) else None,
        document_id=item.get("id") if isinstance(item.get("id"), int) else None,
        chunk_id=item.get("chunk_id") if isinstance(item.get("chunk_id"), int) else None,
        version=item.get("version") if isinstance(item.get("version"), int) else None,
        retrieval=score_detail.get("retrieval") if isinstance(score_detail.get("retrieval"), str) else None,
        score=float(item["score"]) if isinstance(item.get("score"), (float, int)) else None,
        fallback=False,
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
