from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserMe

router = APIRouter()
settings = get_settings()


def build_user_me(user: User) -> UserMe:
    roles = [user_role.role.code for user_role in user.roles]
    default_portal = "admin" if set(roles).intersection({"admin", "data_admin", "kb_admin", "advisor"}) else "user"
    permissions = ["user:read_self", "user:write_self"]
    if default_portal == "admin":
        permissions.extend(["admin:users", "admin:data", "admin:knowledge", "admin:agent", "admin:audit"])
    return UserMe(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=roles,
        permissions=permissions,
        default_portal=default_portal,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    token = create_access_token(
        subject=user.username,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra={"roles": [user_role.role.code for user_role in user.roles]},
    )
    return TokenResponse(access_token=token, user=build_user_me(user))


@router.get("/me", response_model=UserMe)
def me(user: User = Depends(get_current_user)) -> UserMe:
    return build_user_me(user)
