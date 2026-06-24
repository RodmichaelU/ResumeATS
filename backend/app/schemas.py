from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

JobStatusName = Literal["pending", "running", "done", "error"]
JobStage = Literal["parsing_resume", "fetching_github", "scoring_ats", "scoring_jd_match"]


class JdMatchResult(BaseModel):
    """Our own JD-match score, separate from hiring-agent's ATS evaluation."""

    match_score: float = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    rationale: str
    recommendations: list[str] = Field(min_length=1, max_length=5)


class JobResults(BaseModel):
    ats: Optional[dict[str, Any]] = None
    jd_match: Optional[JdMatchResult] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatusName
    stage: Optional[JobStage] = None
    created_at: datetime
    error: Optional[str] = None
    results: JobResults = Field(default_factory=JobResults)


class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatusName


class HealthResponse(BaseModel):
    ollama_reachable: bool
    model_available: bool
    model: str


class HistorySummary(BaseModel):
    id: str
    created_at: datetime
    candidate_name: Optional[str] = None
    original_filename: Optional[str] = None
    ats_total_score: float
    ats_max_score: float
    jd_match_score: float


class HistoryListResponse(BaseModel):
    items: list[HistorySummary]
    total: int
    limit: int
    offset: int


class HistoryDetail(BaseModel):
    id: str
    created_at: datetime
    candidate_name: Optional[str] = None
    original_filename: Optional[str] = None
    job_description: str
    resume_text: str
    ats_total_score: float
    ats_max_score: float
    ats: dict[str, Any]
    jd_match: JdMatchResult
