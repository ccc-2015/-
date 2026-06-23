from pydantic import BaseModel, ConfigDict


class SchoolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    province: str | None = None
    city: str | None = None
    school_type: str | None = None
    tier: str | None = None
    ownership: str | None = None
    website: str | None = None
    description: str | None = None


class MajorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    category: str | None = None
    level: str | None = None
    description: str | None = None


class SchoolGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    school_id: int
    group_code: str
    group_name: str
    batch: str
    subject_track: str
    subject_requirements: str | None = None
    tuition_note: str | None = None
    is_active: bool


class BatchLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    subject_track: str
    batch: str
    score: int
    rank: int | None = None


class ScoreSegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    subject_track: str
    score: int
    rank: int
    cumulative_count: int | None = None


class AdmissionPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    school_id: int
    group_id: int | None = None
    major_id: int | None = None
    batch: str
    subject_track: str
    plan_count: int
    raw_data: dict | None = None


class HistoricalAdmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    school_id: int
    group_id: int | None = None
    batch: str
    subject_track: str
    min_score: float | None = None
    min_rank: int | None = None
    avg_score: float | None = None
    max_score: float | None = None
    plan_count: int | None = None
    raw_data: dict | None = None


class RankLookupResponse(BaseModel):
    year: int
    subject_track: str
    score: int
    rank: int | None = None
    matched_score: int | None = None
    cumulative_count: int | None = None
    source: str = "score_segments"


class SearchGroupsRequest(BaseModel):
    keyword: str | None = None
    year: int | None = None
    batch: str | None = None
    subject_track: str | None = None
    use_profile: bool = True
    only_eligible: bool = True
    limit: int = 50


class SearchGroupItem(BaseModel):
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
    plan_count: int | None = None
    historical_min_score: float | None = None
    historical_min_rank: int | None = None
    eligible: bool
    eligibility_errors: list[str] = []
    eligibility_warnings: list[str] = []


class SearchGroupsResponse(BaseModel):
    items: list[SearchGroupItem]
    total: int
    used_profile: bool
