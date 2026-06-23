from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=64)
    phone: str | None = None
    role_codes: list[str] = Field(default_factory=lambda: ["student_user"])


class AdminUserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    phone: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    is_active: bool | None = None
    role_codes: list[str] | None = None


class AdminRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    phone: str | None = None
    display_name: str
    is_active: bool
    roles: list[str]
    created_at: datetime
