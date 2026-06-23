from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin_data, admin_knowledge, admin_schools, admin_users, agent, auth, health, profile
from app.core.config import get_settings
from app.core.database import init_db
from app.services.seed_service import ensure_seed_data

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
    app.include_router(admin_data.router, prefix="/api/admin/data", tags=["admin-data"])
    app.include_router(admin_knowledge.router, prefix="/api/admin", tags=["admin-knowledge"])
    app.include_router(admin_schools.router, prefix="/api/admin", tags=["admin-schools"])
    app.include_router(admin_users.router, prefix="/api/admin", tags=["admin-users"])
    app.include_router(agent.router, prefix="/api/agent", tags=["agent"])

    @app.on_event("startup")
    def on_startup() -> None:
        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        init_db()
        ensure_seed_data()

    return app


app = create_app()
