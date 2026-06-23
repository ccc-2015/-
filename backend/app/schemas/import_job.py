from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ImportJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data_type: str
    original_filename: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int
    preview_rows: list[dict[str, Any]] | None = None
    field_names: list[str] | None = None
    validation_errors: list[dict[str, Any]] | None = None
    created_at: datetime


class ImportConfirmRequest(BaseModel):
    field_mapping: dict[str, str]


class ImportUploadResponse(BaseModel):
    job: ImportJobOut
    required_fields: list[str]
    optional_fields: list[str]
