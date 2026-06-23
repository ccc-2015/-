from typing import Literal

from pydantic import BaseModel, Field


class PolicyCheckItem(BaseModel):
    group_id: int
    order: int | None = None


class PolicyCheckRequest(BaseModel):
    batch: str
    group_items: list[PolicyCheckItem] = Field(default_factory=list)


class PolicyGroupCheckResult(BaseModel):
    group_id: int
    order: int | None = None
    passed: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    school_name: str | None = None
    group_name: str | None = None
    batch: str | None = None
    subject_track: str | None = None
    subject_requirements: str | None = None


class PolicyCheckResponse(BaseModel):
    passed: bool
    batch: str
    max_groups: int
    checked_group_count: int
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    explanations: list[str] = Field(default_factory=list)
    group_results: list[PolicyGroupCheckResult] = Field(default_factory=list)
    parallel_volunteer_rule: Literal["分数优先、遵循志愿、一轮投档"] = "分数优先、遵循志愿、一轮投档"
