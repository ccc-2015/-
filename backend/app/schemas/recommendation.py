from pydantic import BaseModel, Field


class RecommendationGenerateRequest(BaseModel):
    batch: str | None = None
    limit: int = 30
    only_eligible: bool = True


class RecommendationItemOut(BaseModel):
    group_id: int
    school_id: int
    school_code: str
    school_name: str
    province: str | None = None
    city: str | None = None
    school_type: str | None = None
    tier: str | None = None
    group_code: str
    group_name: str
    year: int
    batch: str
    subject_track: str
    subject_requirements: str | None = None
    risk_level: str
    match_score: int
    admission_risk_score: int
    suggested_adjustment: bool
    plan_count: int | None = None
    historical_min_score: float | None = None
    historical_min_rank: int | None = None
    rank_gap: int | None = None
    majors: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class RecommendationGenerateResponse(BaseModel):
    profile_id: int
    batch: str | None = None
    items: list[RecommendationItemOut]
    warnings: list[str] = Field(default_factory=list)
