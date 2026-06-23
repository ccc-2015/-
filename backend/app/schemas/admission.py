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
