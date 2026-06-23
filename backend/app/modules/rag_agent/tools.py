from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admission import School, SchoolMajorGroup


def search_school_groups(db: Session, keyword: str | None = None) -> dict:
    stmt = select(SchoolMajorGroup, School).join(School, School.id == SchoolMajorGroup.school_id)
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(School.name.like(like))
    rows = db.execute(stmt.limit(5)).all()
    return {
        "count": len(rows),
        "items": [
            {
                "school_name": school.name,
                "group_name": group.group_name,
                "batch": group.batch,
                "subject_track": group.subject_track,
                "subject_requirements": group.subject_requirements,
            }
            for group, school in rows
        ],
    }


def get_data_summary(db: Session) -> dict:
    school_count = db.scalar(select(func.count()).select_from(School)) or 0
    group_count = db.scalar(select(func.count()).select_from(SchoolMajorGroup)) or 0
    return {"school_count": school_count, "group_count": group_count}
