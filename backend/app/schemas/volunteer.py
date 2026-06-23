from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.policy import PolicyCheckResponse


class VolunteerPlanItemIn(BaseModel):
    group_id: int
    order: int
    risk_level: str | None = None
    match_score: int | None = None
    notes: str | None = None
    snapshot: dict | None = None


class VolunteerPlanSaveRequest(BaseModel):
    title: str | None = None
    batch: str
    items: list[VolunteerPlanItemIn] = Field(default_factory=list)
    source: str = "recommendation"
    metadata: dict | None = None


class VolunteerPlanItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    order: int
    risk_level: str | None = None
    match_score: int | None = None
    notes: str | None = None
    snapshot_json: dict | None = None


class VolunteerPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    batch: str
    version: int
    status: str
    source: str
    metadata_json: dict | None = None
    created_at: datetime
    updated_at: datetime
    items: list[VolunteerPlanItemOut] = Field(default_factory=list)


class VolunteerPlanCopyRequest(BaseModel):
    title: str | None = None


class VolunteerPlanExportItem(BaseModel):
    order: int
    group_id: int
    school_code: str | None = None
    school_name: str | None = None
    group_code: str | None = None
    group_name: str | None = None
    subject_track: str | None = None
    city: str | None = None
    risk_level: str | None = None
    match_score: int | None = None
    suggested_adjustment: bool | None = None
    majors: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    plan_count: int | None = None
    historical_min_rank: int | None = None
    notes: str | None = None


class VolunteerPlanExportResponse(BaseModel):
    plan_id: int
    title: str
    batch: str
    version: int
    status: str
    exported_at: datetime
    item_count: int
    items: list[VolunteerPlanExportItem] = Field(default_factory=list)


class VolunteerPlanCheckResponse(BaseModel):
    plan: VolunteerPlanOut
    policy_result: PolicyCheckResponse
