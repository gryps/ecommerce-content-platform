from sqlalchemy import inspect, text

from app.config import settings
from app.core.database import get_engine, migrate_workbench_schema, reset_engine_for_tests


def test_fresh_database_bootstraps_current_schema_and_stamps_head(tmp_path, monkeypatch):
    monkeypatch.setattr(
        settings,
        "workbench_database_url",
        f"sqlite:///{tmp_path / 'fresh-workbench.db'}",
    )
    reset_engine_for_tests()
    try:
        migrate_workbench_schema()

        engine = get_engine()
        tables = set(inspect(engine).get_table_names())
        assert "alembic_version" in tables
        assert "wb_products" in tables
        assert "wb_ai_video_projects" in tables
        with engine.connect() as connection:
            version = connection.execute(text("select version_num from alembic_version")).scalar_one()
        assert version == "o07h9i1j4k58"
    finally:
        reset_engine_for_tests()
