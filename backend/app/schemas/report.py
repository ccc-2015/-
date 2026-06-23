from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateRequest(BaseModel):
    plan_id: int
    title: str | None = None


class ReportProfileSnapshot(BaseModel):
    name: str | None = None
    year: int | None = None
    province: str | None = None
    score: int | None = None
    rank: int | None = None
    subject_track: str | None = None
    selected_subjects: list[str] = Field(default_factory=list)
    target_batches: list[str] = Field(default_factory=list)
    city_preferences: list[str] = Field(default_factory=list)
    major_preferences: list[str] = Field(default_factory=list)
    accepts_adjustment: bool | None = None


class ReportPlanSnapshot(BaseModel):
    id: int
    title: str
    batch: str
    version: int
    item_count: int
    updated_at: datetime


class ReportSummary(BaseModel):
    risk_distribution: dict[str, int] = Field(default_factory=dict)
    top_cities: list[str] = Field(default_factory=list)
    top_majors: list[str] = Field(default_factory=list)
    adjustment_count: int = 0
    warning_count: int = 0


class ReportVolunteerItem(BaseModel):
    order: int
    group_id: int
    school_name: str | None = None
    group_name: str | None = None
    group_code: str | None = None
    subject_track: str | None = None
    city: str | None = None
    risk_level: str | None = None
    match_score: int | None = None
    suggested_adjustment: bool | None = None
    majors: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ReportPolicyCitation(BaseModel):
    title: str
    excerpt: str
    source_url: str | None = None
    document_id: int | None = None
    chunk_id: int | None = None
    version: int | None = None
    retrieval: str | None = None
    score: float | None = None
    fallback: bool = False


class ReportContent(BaseModel):
    profile: ReportProfileSnapshot
    plan: ReportPlanSnapshot
    summary: ReportSummary
    volunteer_items: list[ReportVolunteerItem] = Field(default_factory=list)
    policy_citations: list[ReportPolicyCitation] = Field(default_factory=list)
    disclaimers: list[str] = Field(default_factory=list)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_id: int | None = None
    title: str
    report_type: str
    status: str
    data_version: str
    content_json: ReportContent
    created_at: datetime
    updated_at: datetime
