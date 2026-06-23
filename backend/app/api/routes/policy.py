from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.policy import PolicyCheckRequest, PolicyCheckResponse
from app.services.policy_service import check_policy_rules

router = APIRouter()


@router.post("/check", response_model=PolicyCheckResponse)
def check_policy(payload: PolicyCheckRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PolicyCheckResponse:
    return check_policy_rules(db, user, payload.batch, payload.group_items)
