from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentProfileBase(BaseModel):
    name: str | None = None
    year: int = 2026
    province: str = "河南"
    score: int | None = Field(default=None, ge=0)
    rank: int | None = Field(default=None, ge=1)
    subject_track: str | None = None
    selected_subjects: list[str] = Field(default_factory=list)
    target_batches: list[str] = Field(default_factory=list)
    city_preferences: list[str] = Field(default_factory=list)
    major_preferences: list[str] = Field(default_factory=list)
    school_tier_preferences: list[str] = Field(default_factory=list)
    tuition_limit: int | None = Field(default=None, ge=0)
    accepts_private: bool = False
    accepts_cooperation: bool = False
    accepts_independent: bool = False
    accepts_adjustment: bool = True
    employment_preference: str | None = None
    further_study_preference: str | None = None


class StudentProfileUpsert(StudentProfileBase):
    pass


class StudentProfileOut(StudentProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
