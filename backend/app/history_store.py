import asyncio
import json
import sqlite3
from datetime import datetime

from app.schemas import HistoryDetail, HistorySummary, JdMatchResult
from app.settings import settings

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS evaluations (
    id                  TEXT PRIMARY KEY,
    created_at          TEXT NOT NULL,
    candidate_name      TEXT,
    original_filename   TEXT,
    job_description     TEXT NOT NULL,
    resume_text         TEXT NOT NULL,
    ats_total_score     REAL NOT NULL,
    ats_max_score       REAL NOT NULL,
    jd_match_score      REAL NOT NULL,
    ats_json            TEXT NOT NULL,
    jd_match_json       TEXT NOT NULL
)
"""

_CREATE_INDEX_SQL = (
    "CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC)"
)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.history_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the evaluations table if it doesn't exist. Synchronous; call once at
    FastAPI startup, not at module import time (keeps importing this module free of
    filesystem side effects)."""
    settings.history_db_path.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute(_CREATE_TABLE_SQL)
        conn.execute(_CREATE_INDEX_SQL)


def compute_ats_total(evaluation: dict) -> tuple[float, float]:
    """Mirrors the total-score formula in frontend/src/components/HiringAgentScoreCard.tsx
    (sum of capped category scores + bonus - deductions, clamped to [0, categoryMax + 20]).
    Keep both in sync if hiring-agent's EvaluationData rubric ever changes."""
    scores = evaluation["scores"]
    category_total = sum(min(cat["score"], cat["max"]) for cat in scores.values())
    category_max = sum(cat["max"] for cat in scores.values())
    bonus = evaluation.get("bonus_points", {}).get("total", 0)
    deductions = evaluation.get("deductions", {}).get("total", 0)
    max_possible = category_max + 20
    total = min(max(category_total + bonus - deductions, 0), max_possible)
    return total, max_possible


def _row_to_summary(row: sqlite3.Row) -> HistorySummary:
    return HistorySummary(
        id=row["id"],
        created_at=datetime.fromisoformat(row["created_at"]),
        candidate_name=row["candidate_name"],
        original_filename=row["original_filename"],
        ats_total_score=row["ats_total_score"],
        ats_max_score=row["ats_max_score"],
        jd_match_score=row["jd_match_score"],
    )


def _row_to_detail(row: sqlite3.Row) -> HistoryDetail:
    return HistoryDetail(
        id=row["id"],
        created_at=datetime.fromisoformat(row["created_at"]),
        candidate_name=row["candidate_name"],
        original_filename=row["original_filename"],
        job_description=row["job_description"],
        resume_text=row["resume_text"],
        ats_total_score=row["ats_total_score"],
        ats_max_score=row["ats_max_score"],
        ats=json.loads(row["ats_json"]),
        jd_match=JdMatchResult(**json.loads(row["jd_match_json"])),
    )


def _save_sync(
    *,
    id: str,
    created_at: datetime,
    candidate_name: str | None,
    original_filename: str | None,
    job_description: str,
    resume_text: str,
    ats_total_score: float,
    ats_max_score: float,
    jd_match_score: float,
    ats_json: dict,
    jd_match_json: dict,
) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO evaluations (id, created_at, candidate_name, original_filename, "
            "job_description, resume_text, ats_total_score, ats_max_score, jd_match_score, "
            "ats_json, jd_match_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                id,
                created_at.isoformat(),
                candidate_name,
                original_filename,
                job_description,
                resume_text,
                ats_total_score,
                ats_max_score,
                jd_match_score,
                json.dumps(ats_json),
                json.dumps(jd_match_json),
            ),
        )


async def save_evaluation(
    *,
    id: str,
    created_at: datetime,
    candidate_name: str | None,
    original_filename: str | None,
    job_description: str,
    resume_text: str,
    ats_json: dict,
    jd_match: JdMatchResult,
) -> None:
    ats_total_score, ats_max_score = compute_ats_total(ats_json)
    await asyncio.to_thread(
        _save_sync,
        id=id,
        created_at=created_at,
        candidate_name=candidate_name,
        original_filename=original_filename,
        job_description=job_description,
        resume_text=resume_text,
        ats_total_score=ats_total_score,
        ats_max_score=ats_max_score,
        jd_match_score=jd_match.match_score,
        ats_json=ats_json,
        jd_match_json=jd_match.model_dump(),
    )


def _list_sync(limit: int, offset: int) -> tuple[list[sqlite3.Row], int]:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM evaluations").fetchone()[0]
        rows = conn.execute(
            "SELECT id, created_at, candidate_name, original_filename, "
            "ats_total_score, ats_max_score, jd_match_score FROM evaluations "
            "ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return rows, total


async def list_evaluations(limit: int = 20, offset: int = 0) -> tuple[list[HistorySummary], int]:
    rows, total = await asyncio.to_thread(_list_sync, limit, offset)
    return [_row_to_summary(r) for r in rows], total


def _get_sync(id: str) -> sqlite3.Row | None:
    with _connect() as conn:
        return conn.execute("SELECT * FROM evaluations WHERE id = ?", (id,)).fetchone()


async def get_evaluation(id: str) -> HistoryDetail | None:
    row = await asyncio.to_thread(_get_sync, id)
    return _row_to_detail(row) if row else None


def _delete_sync(id: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM evaluations WHERE id = ?", (id,))
        return cur.rowcount > 0


async def delete_evaluation(id: str) -> bool:
    return await asyncio.to_thread(_delete_sync, id)
