from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import Role, User, UserRole
from app.schemas.admin_user import AdminRoleOut, AdminUserCreate, AdminUserOut, AdminUserUpdate

router = APIRouter()


def _to_user_out(user: User) -> AdminUserOut:
    return AdminUserOut(
        id=user.id,
        username=user.username,
        phone=user.phone,
        display_name=user.display_name,
        is_active=user.is_active,
        roles=[user_role.role.code for user_role in user.roles],
        created_at=user.created_at,
    )


def _resolve_roles(db: Session, role_codes: list[str]) -> list[Role]:
    roles = list(db.scalars(select(Role).where(Role.code.in_(role_codes))).all())
    found = {role.code for role in roles}
    missing = sorted(set(role_codes) - found)
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown role codes: {', '.join(missing)}")
    return roles


def _replace_roles(db: Session, user: User, roles: list[Role]) -> None:
    user.roles.clear()
    db.flush()
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))


@router.get("/roles", response_model=list[AdminRoleOut])
def list_roles(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[Role]:
    return list(db.scalars(select(Role).order_by(Role.id)).all())


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUserOut]:
    stmt = select(User).order_by(User.id.desc())
    if keyword:
        like = f"%{keyword}%"
        stmt = stmt.where(or_(User.username.like(like), User.display_name.like(like), User.phone.like(like)))
    return [_to_user_out(user) for user in db.scalars(stmt.limit(200)).unique().all()]


@router.post("/users", response_model=AdminUserOut)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminUserOut:
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if payload.phone and db.scalar(select(User).where(User.phone == payload.phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")

    roles = _resolve_roles(db, payload.role_codes)
    user = User(
        username=payload.username,
        phone=payload.phone,
        display_name=payload.display_name,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
    )
    db.add(user)
    db.flush()
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return _to_user_out(user)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.phone and payload.phone != user.phone and db.scalar(select(User).where(User.phone == payload.phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.password is not None:
        user.hashed_password = get_password_hash(payload.password)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role_codes is not None:
        _replace_roles(db, user, _resolve_roles(db, payload.role_codes))

    db.commit()
    db.refresh(user)
    return _to_user_out(user)
