from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from sqlalchemy import select

from app.core.database import SessionLocal, init_db
from app.models.admission import (
    AdmissionPlan,
    BatchLine,
    GroupMajor,
    HistoricalAdmission,
    Major,
    School,
    SchoolMajorGroup,
    ScoreSegment,
)
from app.models.knowledge import KnowledgeDocument
from app.models.profile import StudentProfile
from app.models.user import User
from app.services.knowledge_service import rebuild_document_chunks
from app.services.seed_service import ensure_seed_data


DEMO_YEAR = 2026


def main() -> None:
    init_db()
    ensure_seed_data()
    db = SessionLocal()
    try:
        student = db.scalar(select(User).where(User.username == "student"))
        if student is None:
            raise RuntimeError("Default student user was not created.")

        _seed_profile(db, student)
        schools = _seed_schools(db)
        majors = _seed_majors(db)
        groups = _seed_groups(db, schools)
        _seed_group_majors(db, groups, majors)
        _seed_admissions(db, groups)
        _seed_score_data(db)
        _seed_knowledge(db)
        db.commit()
    finally:
        db.close()
    print("Demo data is ready. Accounts: admin/123456, student/123456")


def _seed_profile(db, user: User) -> None:
    profile = db.scalar(select(StudentProfile).where(StudentProfile.user_id == user.id))
    if profile is None:
        profile = StudentProfile(user_id=user.id, name=user.display_name)
        db.add(profile)
    profile.name = "李同学"
    profile.year = DEMO_YEAR
    profile.province = "河南"
    profile.score = 586
    profile.rank = 36000
    profile.subject_track = "物理类"
    profile.selected_subjects = ["化学", "生物"]
    profile.target_batches = ["普通本科批"]
    profile.city_preferences = ["郑州", "洛阳"]
    profile.major_preferences = ["计算机", "软件", "电气"]
    profile.school_tier_preferences = ["省重点", "普通本科"]
    profile.tuition_limit = 18000
    profile.accepts_private = False
    profile.accepts_cooperation = False
    profile.accepts_independent = False
    profile.accepts_adjustment = True
    profile.employment_preference = "希望优先考虑就业面较宽的工科专业。"
    profile.further_study_preference = "接受继续读研。"


def _seed_schools(db) -> dict[str, School]:
    specs = [
        ("DEMO1001", "中原理工大学", "河南", "郑州", "理工", "省重点", "公办"),
        ("DEMO1002", "洛阳工程学院", "河南", "洛阳", "理工", "普通本科", "公办"),
        ("DEMO1003", "河南数字经济学院", "河南", "郑州", "综合", "普通本科", "公办"),
        ("DEMO1004", "华北智能制造大学", "河南", "新乡", "理工", "普通本科", "公办"),
        ("DEMO1005", "郑州应用技术学院", "河南", "郑州", "应用型", "普通本科", "民办"),
    ]
    schools: dict[str, School] = {}
    for code, name, province, city, school_type, tier, ownership in specs:
        school = db.scalar(select(School).where(School.code == code))
        if school is None:
            school = School(code=code, name=name)
            db.add(school)
            db.flush()
        school.province = province
        school.city = city
        school.school_type = school_type
        school.tier = tier
        school.ownership = ownership
        school.website = f"https://example.com/{code.lower()}"
        school.description = f"{name}为本地演示院校数据，用于跑通推荐、方案和报告流程。"
        schools[code] = school
    return schools


def _seed_majors(db) -> dict[str, Major]:
    specs = [
        ("080901", "计算机科学与技术", "工学", "本科"),
        ("080902", "软件工程", "工学", "本科"),
        ("080601", "电气工程及其自动化", "工学", "本科"),
        ("080701", "电子信息工程", "工学", "本科"),
        ("120801", "电子商务", "管理学", "本科"),
        ("080910", "数据科学与大数据技术", "工学", "本科"),
    ]
    majors: dict[str, Major] = {}
    for code, name, category, level in specs:
        major = db.scalar(select(Major).where(Major.code == code))
        if major is None:
            major = Major(code=code, name=name)
            db.add(major)
            db.flush()
        major.category = category
        major.level = level
        major.description = f"{name}演示专业。"
        majors[code] = major
    return majors


def _seed_groups(db, schools: dict[str, School]) -> list[SchoolMajorGroup]:
    specs = [
        ("DEMO1001", "001", "中原理工大学第001专业组", "物理类", "化学", "学费按河南省物价部门核定标准执行"),
        ("DEMO1002", "002", "洛阳工程学院第002专业组", "物理类", "不限", None),
        ("DEMO1003", "003", "河南数字经济学院第003专业组", "物理类", "化学", None),
        ("DEMO1004", "004", "华北智能制造大学第004专业组", "物理类", "化学", None),
        ("DEMO1005", "005", "郑州应用技术学院第005专业组", "物理类", "不限", "民办院校，学费较高，请核对收费标准"),
    ]
    groups: list[SchoolMajorGroup] = []
    for school_code, group_code, name, subject_track, requirements, tuition_note in specs:
        school = schools[school_code]
        group = db.scalar(
            select(SchoolMajorGroup).where(
                SchoolMajorGroup.year == DEMO_YEAR,
                SchoolMajorGroup.school_id == school.id,
                SchoolMajorGroup.group_code == group_code,
            )
        )
        if group is None:
            group = SchoolMajorGroup(
                year=DEMO_YEAR,
                school_id=school.id,
                group_code=group_code,
                group_name=name,
                batch="普通本科批",
                subject_track=subject_track,
                subject_requirements=requirements,
            )
            db.add(group)
            db.flush()
        group.group_name = name
        group.batch = "普通本科批"
        group.subject_track = subject_track
        group.subject_requirements = requirements
        group.tuition_note = tuition_note
        group.is_active = True
        groups.append(group)
    return groups


def _seed_group_majors(db, groups: list[SchoolMajorGroup], majors: dict[str, Major]) -> None:
    mapping = [
        (0, ["080901", "080902", "080910"]),
        (1, ["080601", "080701", "080902"]),
        (2, ["080901", "080910", "120801"]),
        (3, ["080601", "080701", "080910"]),
        (4, ["080902", "120801", "080901"]),
    ]
    for group_index, major_codes in mapping:
        group = groups[group_index]
        for code in major_codes:
            major = majors[code]
            row = db.scalar(
                select(GroupMajor).where(
                    GroupMajor.group_id == group.id,
                    GroupMajor.major_id == major.id,
                )
            )
            if row is None:
                row = GroupMajor(group_id=group.id, major_id=major.id)
                db.add(row)
            row.plan_count = 20 + group_index * 5
            row.tuition = 5000 + group_index * 800
            row.duration = "四年"


def _seed_admissions(db, groups: list[SchoolMajorGroup]) -> None:
    plan_counts = [86, 64, 72, 58, 96]
    historical_ranks = [33000, 39000, 36500, 31000, 52000]
    for group, plan_count, min_rank in zip(groups, plan_counts, historical_ranks, strict=True):
        plan = db.scalar(
            select(AdmissionPlan).where(
                AdmissionPlan.year == DEMO_YEAR,
                AdmissionPlan.group_id == group.id,
                AdmissionPlan.batch == group.batch,
                AdmissionPlan.subject_track == group.subject_track,
            )
        )
        if plan is None:
            plan = AdmissionPlan(
                year=DEMO_YEAR,
                school_id=group.school_id,
                group_id=group.id,
                batch=group.batch,
                subject_track=group.subject_track,
                plan_count=plan_count,
            )
            db.add(plan)
        plan.plan_count = plan_count

        history = db.scalar(
            select(HistoricalAdmission).where(
                HistoricalAdmission.year == 2025,
                HistoricalAdmission.group_id == group.id,
                HistoricalAdmission.batch == group.batch,
                HistoricalAdmission.subject_track == group.subject_track,
            )
        )
        if history is None:
            history = HistoricalAdmission(year=2025, school_id=group.school_id, group_id=group.id, batch=group.batch, subject_track=group.subject_track)
            db.add(history)
        history.min_score = 560 - (min_rank - 30000) / 2000
        history.min_rank = min_rank
        history.avg_score = (history.min_score or 0) + 8
        history.max_score = (history.min_score or 0) + 18
        history.plan_count = plan_count


def _seed_score_data(db) -> None:
    line = db.scalar(
        select(BatchLine).where(
            BatchLine.year == DEMO_YEAR,
            BatchLine.subject_track == "物理类",
            BatchLine.batch == "普通本科批",
        )
    )
    if line is None:
        line = BatchLine(year=DEMO_YEAR, subject_track="物理类", batch="普通本科批", score=465, rank=98000)
        db.add(line)
    line.score = 465
    line.rank = 98000
    for score, rank in [(600, 26000), (586, 36000), (570, 50000), (540, 76000), (465, 98000)]:
        segment = db.scalar(
            select(ScoreSegment).where(
                ScoreSegment.year == DEMO_YEAR,
                ScoreSegment.subject_track == "物理类",
                ScoreSegment.score == score,
            )
        )
        if segment is None:
            segment = ScoreSegment(year=DEMO_YEAR, subject_track="物理类", score=score, rank=rank)
            db.add(segment)
        segment.rank = rank
        segment.cumulative_count = rank


def _seed_knowledge(db) -> None:
    title = "2026 河南普通批志愿填报演示政策"
    document = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.title == title))
    content = """
河南省 2026 年普通本科批和普通高职（专科）批均以院校专业组为志愿单位。
普通本科批最多可填报 48 个院校专业组志愿，普通高职（专科）批最多可填报 48 个院校专业组志愿。
平行志愿投档按照分数优先、遵循志愿、一轮投档的原则执行。
考生填报专业组时，应核对首选科目、再选科目要求、招生计划、学费标准、体检要求和是否服从专业调剂。
不服从专业调剂可能增加退档风险，正式填报前应以河南省教育考试院和高校正式公布信息为准。
""".strip()
    if document is None:
        document = KnowledgeDocument(
            title=title,
            category="policy",
            content=content,
            source_type="demo",
            source_url="https://example.com/henan-2026-demo-policy",
            status="published",
            tags=["普通本科批", "平行志愿", "调剂"],
        )
        db.add(document)
        db.flush()
    else:
        document.category = "policy"
        document.content = content
        document.source_type = "demo"
        document.source_url = "https://example.com/henan-2026-demo-policy"
        document.status = "published"
        document.tags = ["普通本科批", "平行志愿", "调剂"]
    rebuild_document_chunks(db, document)


if __name__ == "__main__":
    main()
