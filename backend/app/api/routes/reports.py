from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.report import ReportGenerateRequest, ReportOut
from app.services.report_service import build_report_csv, generate_report_from_plan, get_user_report, list_user_reports, report_to_out

router = APIRouter()


@router.get("", response_model=list[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ReportOut]:
    return [report_to_out(report) for report in list_user_reports(db, user)]


@router.post("/generate", response_model=ReportOut)
def generate_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
    report = generate_report_from_plan(db, user, payload.plan_id, title=payload.title)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer plan not found")
    return report_to_out(report)


@router.get("/{report_id}/export")
def export_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    report = get_user_report(db, user, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    filename = quote(f"{report.title}-{report.id}.csv")
    return Response(
        content=build_report_csv(report),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
    report = get_user_report(db, user, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report_to_out(report)
