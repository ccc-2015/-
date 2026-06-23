from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    province: Mapped[str | None] = mapped_column(String(64), nullable=True)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    school_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tier: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ownership: Mapped[str | None] = mapped_column(String(64), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    groups: Mapped[list["SchoolMajorGroup"]] = relationship(back_populates="school", cascade="all, delete-orphan")


class Major(Base):
    __tablename__ = "majors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class SchoolMajorGroup(Base):
    __tablename__ = "school_major_groups"
    __table_args__ = (UniqueConstraint("year", "school_id", "group_code", name="uq_year_school_group"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    group_code: Mapped[str] = mapped_column(String(64), index=True)
    group_name: Mapped[str] = mapped_column(String(128))
    batch: Mapped[str] = mapped_column(String(64), index=True)
    subject_track: Mapped[str] = mapped_column(String(32), index=True)
    subject_requirements: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tuition_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    school: Mapped[School] = relationship(back_populates="groups")
    majors: Mapped[list["GroupMajor"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class GroupMajor(Base):
    __tablename__ = "group_majors"
    __table_args__ = (UniqueConstraint("group_id", "major_id", name="uq_group_major"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("school_major_groups.id"), index=True)
    major_id: Mapped[int] = mapped_column(ForeignKey("majors.id"), index=True)
    plan_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tuition: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    group: Mapped[SchoolMajorGroup] = relationship(back_populates="majors")
    major: Mapped[Major] = relationship()


class AdmissionPlan(Base):
    __tablename__ = "admission_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("school_major_groups.id"), nullable=True, index=True)
    major_id: Mapped[int | None] = mapped_column(ForeignKey("majors.id"), nullable=True, index=True)
    batch: Mapped[str] = mapped_column(String(64), index=True)
    subject_track: Mapped[str] = mapped_column(String(32), index=True)
    plan_count: Mapped[int] = mapped_column(Integer)
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class HistoricalAdmission(Base):
    __tablename__ = "historical_admissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("school_major_groups.id"), nullable=True, index=True)
    batch: Mapped[str] = mapped_column(String(64), index=True)
    subject_track: Mapped[str] = mapped_column(String(32), index=True)
    min_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ScoreSegment(Base):
    __tablename__ = "score_segments"
    __table_args__ = (UniqueConstraint("year", "subject_track", "score", name="uq_score_segment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    subject_track: Mapped[str] = mapped_column(String(32), index=True)
    score: Mapped[int] = mapped_column(Integer, index=True)
    rank: Mapped[int] = mapped_column(Integer)
    cumulative_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


class BatchLine(Base):
    __tablename__ = "batch_lines"
    __table_args__ = (UniqueConstraint("year", "subject_track", "batch", name="uq_batch_line"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    subject_track: Mapped[str] = mapped_column(String(32), index=True)
    batch: Mapped[str] = mapped_column(String(64), index=True)
    score: Mapped[int] = mapped_column(Integer)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data_type: Mapped[str] = mapped_column(String(64), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="uploaded", index=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    error_rows: Mapped[int] = mapped_column(Integer, default=0)
    preview_rows: Mapped[list | None] = mapped_column(JSON, nullable=True)
    field_names: Mapped[list | None] = mapped_column(JSON, nullable=True)
    field_mapping: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    validation_errors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
