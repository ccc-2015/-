from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.recommendation import RecommendationGenerateRequest, RecommendationGenerateResponse
from app.services.recommendation_service import generate_recommendations

router = APIRouter()


@router.post("/generate", response_model=RecommendationGenerateResponse)
def generate(
    payload: RecommendationGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RecommendationGenerateResponse:
    try:
        return generate_recommendations(
            db=db,
            user=user,
            batch=payload.batch,
            limit=payload.limit,
            only_eligible=payload.only_eligible,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
