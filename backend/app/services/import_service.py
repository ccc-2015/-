from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.admission import ImportJob, Major, School, SchoolMajorGroup
from app.models.user import User

settings = get_settings()

IMPORT_SCHEMAS: dict[str, dict[str, list[str]]] = {
    "schools": {
        "required": ["code", "name"],
        "optional": ["province", "city", "school_type", "tier", "ownership", "website", "description"],
    },
    "majors": {
        "required": ["code", "name"],
        "optional": ["category", "level", "description"],
    },
    "school_major_groups": {
        "required": ["year", "school_code", "group_code", "group_name", "batch", "subject_track"],
        "optional": ["subject_requirements", "tuition_note"],
    },
}


def get_import_schema(data_type: str) -> dict[str, list[str]]:
    if data_type not in IMPORT_SCHEMAS:
        raise ValueError(f"Unsupported data_type: {data_type}")
    return IMPORT_SCHEMAS[data_type]


async def save_upload_file(file: UploadFile) -> Path:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    target = settings.upload_dir / file.filename
    suffix = target.suffix
    stem = target.stem
    counter = 1
    while target.exists():
        target = settings.upload_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    content = await file.read()
    target.write_bytes(content)
    return target


def read_table(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    raise ValueError("Only .xlsx, .xls and .csv files are supported")


def normalize_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    clean = df.where(pd.notnull(df), None)
    return clean.to_dict(orient="records")


def validate_records(records: list[dict[str, Any]], required_fields: list[str]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    for index, row in enumerate(records):
        missing = [field for field in required_fields if row.get(field) in (None, "")]
        if missing:
            errors.append({"row": index + 2, "missing_fields": missing})
    return errors


def create_import_job(db: Session, data_type: str, path: Path, records: list[dict[str, Any]], user: User) -> ImportJob:
    schema = get_import_schema(data_type)
    errors = validate_records(records, schema["required"])
    job = ImportJob(
        data_type=data_type,
        original_filename=path.name,
        stored_path=str(path),
        status="validated" if not errors else "validation_failed",
        total_rows=len(records),
        valid_rows=len(records) - len(errors),
        error_rows=len(errors),
        preview_rows=records[:20],
        field_names=list(records[0].keys()) if records else [],
        validation_errors=errors,
        created_by=user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def confirm_import_job(db: Session, job: ImportJob, field_mapping: dict[str, str]) -> ImportJob:
    schema = get_import_schema(job.data_type)
    path = Path(job.stored_path)
    records = normalize_records(read_table(path))
    mapped = [_map_record(record, field_mapping) for record in records]
    errors = validate_records(mapped, schema["required"])
    if errors:
        job.status = "validation_failed"
        job.validation_errors = errors
        job.error_rows = len(errors)
        job.valid_rows = len(mapped) - len(errors)
        db.commit()
        db.refresh(job)
        return job

    if job.data_type == "schools":
        _import_schools(db, mapped)
    elif job.data_type == "majors":
        _import_majors(db, mapped)
    elif job.data_type == "school_major_groups":
        _import_school_groups(db, mapped)
    else:
        raise ValueError(f"Unsupported data_type: {job.data_type}")

    job.status = "imported"
    job.field_mapping = field_mapping
    job.valid_rows = len(mapped)
    job.error_rows = 0
    job.validation_errors = []
    db.commit()
    db.refresh(job)
    return job


def _map_record(record: dict[str, Any], field_mapping: dict[str, str]) -> dict[str, Any]:
    if not field_mapping:
        return record
    return {target: record.get(source) for source, target in field_mapping.items()}


def _import_schools(db: Session, records: list[dict[str, Any]]) -> None:
    for row in records:
        code = str(row["code"]).strip()
        school = db.scalar(select(School).where(School.code == code))
        if school is None:
            school = School(code=code, name=str(row["name"]).strip())
            db.add(school)
        school.name = str(row["name"]).strip()
        school.province = _optional_str(row.get("province"))
        school.city = _optional_str(row.get("city"))
        school.school_type = _optional_str(row.get("school_type"))
        school.tier = _optional_str(row.get("tier"))
        school.ownership = _optional_str(row.get("ownership"))
        school.website = _optional_str(row.get("website"))
        school.description = _optional_str(row.get("description"))


def _import_majors(db: Session, records: list[dict[str, Any]]) -> None:
    for row in records:
        code = str(row["code"]).strip()
        major = db.scalar(select(Major).where(Major.code == code))
        if major is None:
            major = Major(code=code, name=str(row["name"]).strip())
            db.add(major)
        major.name = str(row["name"]).strip()
        major.category = _optional_str(row.get("category"))
        major.level = _optional_str(row.get("level"))
        major.description = _optional_str(row.get("description"))


def _import_school_groups(db: Session, records: list[dict[str, Any]]) -> None:
    for row in records:
        school_code = str(row["school_code"]).strip()
        school = db.scalar(select(School).where(School.code == school_code))
        if school is None:
            raise ValueError(f"Missing school for school_code={school_code}")
        year = int(row["year"])
        group_code = str(row["group_code"]).strip()
        group = db.scalar(
            select(SchoolMajorGroup).where(
                SchoolMajorGroup.year == year,
                SchoolMajorGroup.school_id == school.id,
                SchoolMajorGroup.group_code == group_code,
            )
        )
        if group is None:
            group = SchoolMajorGroup(
                year=year,
                school_id=school.id,
                group_code=group_code,
                group_name=str(row["group_name"]).strip(),
                batch=str(row["batch"]).strip(),
                subject_track=str(row["subject_track"]).strip(),
            )
            db.add(group)
        group.group_name = str(row["group_name"]).strip()
        group.batch = str(row["batch"]).strip()
        group.subject_track = str(row["subject_track"]).strip()
        group.subject_requirements = _optional_str(row.get("subject_requirements"))
        group.tuition_note = _optional_str(row.get("tuition_note"))


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
