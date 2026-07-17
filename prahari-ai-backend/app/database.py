"""
Prahari AI Backend — DuckDB Connection Manager
Provides a singleton read-only connection to the ML pipeline's DuckDB database.
Falls back gracefully when the database file doesn't exist yet.
"""
import os
import sys
import logging
from contextlib import contextmanager
from typing import Optional

import duckdb

from app.config import settings

logger = logging.getLogger(__name__)

_connection: Optional[duckdb.DuckDBPyConnection] = None
_db_available: bool = False


def _try_load_fact_tables(con: duckdb.DuckDBPyConnection) -> None:
    """Attempt to load the fact_crime_agg / fact_crime_geo CSV aggregates
    that the NL2SQL agent expects. These are optional — if the CSV outputs
    don't exist yet the agent will simply have fewer tables available."""
    ml_root = os.path.dirname(settings.ml_pipeline_path_absolute)
    wide_agg = os.path.join(ml_root, "outputs", "dashboard_wide_aggregated.csv")
    geo_real = os.path.join(ml_root, "outputs", "dashboard_geo_real_only.csv")

    if os.path.exists(wide_agg):
        try:
            con.execute(
                f"CREATE OR REPLACE TABLE fact_crime_agg AS SELECT * FROM read_csv_auto('{wide_agg}')"
            )
            logger.info("Loaded fact_crime_agg from %s", wide_agg)
        except Exception as e:
            logger.warning("Could not load fact_crime_agg: %s", e)

    if os.path.exists(geo_real):
        try:
            con.execute(
                f"CREATE OR REPLACE TABLE fact_crime_geo AS SELECT * FROM read_csv_auto('{geo_real}')"
            )
            logger.info("Loaded fact_crime_geo from %s", geo_real)
        except Exception as e:
            logger.warning("Could not load fact_crime_geo: %s", e)


def init_db() -> None:
    """Called once at application startup."""
    global _connection, _db_available
    db_path = settings.db_path_absolute

    if os.path.exists(db_path):
        try:
            _connection = duckdb.connect(db_path, read_only=False)
            _try_load_fact_tables(_connection)
            _db_available = True
            logger.info("DuckDB connected: %s", db_path)
        except Exception as e:
            logger.warning("DuckDB connection failed (%s): %s. ML endpoints will report unavailable.", db_path, e)
            _db_available = False
    else:
        logger.warning(
            "DuckDB file not found at '%s'. ML endpoints will report unavailable. "
            "Run the ML pipeline (step1–step6) to populate the database.",
            db_path,
        )
        _db_available = False

    # Add the ML pipeline directory to sys.path so we can import step5/step6
    ml_path = settings.ml_pipeline_path_absolute
    if os.path.isdir(ml_path) and ml_path not in sys.path:
        sys.path.insert(0, ml_path)
        logger.info("ML pipeline path added to sys.path: %s", ml_path)


def close_db() -> None:
    global _connection
    if _connection:
        try:
            _connection.close()
        except Exception:
            pass
        _connection = None


def get_connection() -> Optional[duckdb.DuckDBPyConnection]:
    return _connection


def is_db_available() -> bool:
    return _db_available


def get_db():
    """FastAPI dependency: yields the DuckDB connection (or None)."""
    yield _connection
