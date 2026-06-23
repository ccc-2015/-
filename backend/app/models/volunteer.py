from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VolunteerPlan(Base):
    __tablename__ = "volunteer_plans"
    __table_args__ = (UniqueConstraint("user_id", "batch", "version", name="uq_volunteer_plan_user_batch_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    batch: Mapped[str] = mapped_column(String(64), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    source: Mapped[str] = mapped_column(String(64), default="recommendation")
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items: Mapped[list["VolunteerPlanItem"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="VolunteerPlanItem.order",
    )


class VolunteerPlanItem(Base):
    __tablename__ = "volunteer_plan_items"
    __table_args__ = (UniqueConstraint("plan_id", "order", name="uq_volunteer_plan_item_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("volunteer_plans.id"), index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("school_major_groups.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    match_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    snapshot_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    plan: Mapped[VolunteerPlan] = relationship(back_populates="items")
