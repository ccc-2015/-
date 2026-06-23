from collections.abc import Generator

from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_volunteer_plan_versions()


def _migrate_sqlite_volunteer_plan_versions() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as conn:
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='volunteer_plans'")
        ).scalar_one_or_none()
        if table_exists is None:
            return

        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info('volunteer_plans')")}
        indexes = list(conn.exec_driver_sql("PRAGMA index_list('volunteer_plans')"))
        unique_index_columns = [
            [info[2] for info in conn.exec_driver_sql(f"PRAGMA index_info('{row[1]}')")]
            for row in indexes
            if row[2]
        ]
        has_legacy_unique_index = ["user_id", "batch"] in unique_index_columns
        if "version" in columns and not has_legacy_unique_index:
            return

        conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
        conn.exec_driver_sql("PRAGMA legacy_alter_table=ON")
        conn.exec_driver_sql("ALTER TABLE volunteer_plans RENAME TO volunteer_plans_legacy")
        conn.exec_driver_sql(
            """
            CREATE TABLE volunteer_plans (
                id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                batch VARCHAR(64) NOT NULL,
                version INTEGER NOT NULL,
                status VARCHAR(32) NOT NULL,
                source VARCHAR(64) NOT NULL,
                metadata_json JSON,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT uq_volunteer_plan_user_batch_version UNIQUE (user_id, batch, version),
                FOREIGN KEY(user_id) REFERENCES users (id)
            )
            """
        )
        conn.exec_driver_sql(
            """
            INSERT INTO volunteer_plans (
                id, user_id, title, batch, version, status, source, metadata_json, created_at, updated_at
            )
            SELECT id, user_id, title, batch, 1, status, source, metadata_json, created_at, updated_at
            FROM volunteer_plans_legacy
            """
        )
        conn.exec_driver_sql("DROP TABLE volunteer_plans_legacy")
        conn.exec_driver_sql("CREATE INDEX ix_volunteer_plans_user_id ON volunteer_plans (user_id)")
        conn.exec_driver_sql("CREATE INDEX ix_volunteer_plans_batch ON volunteer_plans (batch)")
        conn.exec_driver_sql("CREATE INDEX ix_volunteer_plans_status ON volunteer_plans (status)")
        conn.exec_driver_sql("PRAGMA legacy_alter_table=OFF")
        conn.exec_driver_sql("PRAGMA foreign_keys=ON")
