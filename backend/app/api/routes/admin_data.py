from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admission import ImportJob
from app.models.user import User
from app.schemas.import_job import ImportConfirmRequest, ImportJobOut, ImportUploadResponse
from app.services.import_service import confirm_import_job, create_import_job, get_import_schema, normalize_records, read_table, save_upload_file

router = APIRouter()


@router.post("/import", response_model=ImportUploadResponse)
async def upload_import_file(
    data_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> ImportUploadResponse:
    try:
        schema = get_import_schema(data_type)
        path = await save_upload_file(file)
        records = normalize_records(read_table(path))
        job = create_import_job(db, data_type, path, records, user)
        return ImportUploadResponse(job=job, required_fields=schema["required"], optional_fields=schema["optional"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/import-jobs", response_model=list[ImportJobOut])
def list_import_jobs(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[ImportJob]:
    return list(db.query(ImportJob).order_by(ImportJob.id.desc()).limit(100).all())


@router.get("/import-jobs/{job_id}", response_model=ImportJobOut)
def get_import_job(job_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> ImportJob:
    job = db.get(ImportJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


@router.post("/import-jobs/{job_id}/confirm", response_model=ImportJobOut)
def confirm_import(
    job_id: int,
    payload: ImportConfirmRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ImportJob:
    job = db.get(ImportJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found")
    try:
        return confirm_import_job(db, job, payload.field_mapping)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
