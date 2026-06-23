from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_student_profile_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    year: Mapped[int] = mapped_column(Integer, default=2026, index=True)
    province: Mapped[str] = mapped_column(String(64), default="河南")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subject_track: Mapped[str | None] = mapped_column(String(32), nullable=True)
    selected_subjects: Mapped[list[str]] = mapped_column(JSON, default=list)
    target_batches: Mapped[list[str]] = mapped_column(JSON, default=list)
    city_preferences: Mapped[list[str]] = mapped_column(JSON, default=list)
    major_preferences: Mapped[list[str]] = mapped_column(JSON, default=list)
    school_tier_preferences: Mapped[list[str]] = mapped_column(JSON, default=list)
    tuition_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accepts_private: Mapped[bool] = mapped_column(Boolean, default=False)
    accepts_cooperation: Mapped[bool] = mapped_column(Boolean, default=False)
    accepts_independent: Mapped[bool] = mapped_column(Boolean, default=False)
    accepts_adjustment: Mapped[bool] = mapped_column(Boolean, default=True)
    employment_preference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    further_study_preference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
