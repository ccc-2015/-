from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import Role, User, UserRole


def ensure_seed_data() -> None:
    db = SessionLocal()
    try:
        roles = {
            "student_user": "考生用户",
            "admin": "系统管理员",
            "data_admin": "数据管理员",
            "kb_admin": "知识库管理员",
            "advisor": "报考顾问",
        }

        role_models: dict[str, Role] = {}
        for code, name in roles.items():
            role = db.scalar(select(Role).where(Role.code == code))
            if role is None:
                role = Role(code=code, name=name)
                db.add(role)
                db.flush()
            role_models[code] = role

        if db.scalar(select(User).where(User.username == "admin")) is None:
            user = User(
                username="admin",
                phone="13800000002",
                display_name="系统管理员",
                hashed_password=get_password_hash("123456"),
                is_active=True,
            )
            db.add(user)
            db.flush()
            for code in ["admin", "data_admin", "kb_admin"]:
                db.add(UserRole(user_id=user.id, role_id=role_models[code].id))

        if db.scalar(select(User).where(User.username == "student")) is None:
            user = User(
                username="student",
                phone="13800000001",
                display_name="李同学",
                hashed_password=get_password_hash("123456"),
                is_active=True,
            )
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=role_models["student_user"].id))

        db.commit()
    finally:
        db.close()
