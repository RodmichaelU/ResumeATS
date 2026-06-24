import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.schemas import JdMatchResult, JobResults, JobStage, JobStatusName, JobStatusResponse


@dataclass
class Job:
    job_id: str
    status: JobStatusName = "pending"
    stage: JobStage | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    results: JobResults = field(default_factory=JobResults)

    def to_response(self) -> JobStatusResponse:
        return JobStatusResponse(
            job_id=self.job_id,
            status=self.status,
            stage=self.stage,
            created_at=self.created_at,
            error=self.error,
            results=self.results,
        )


class JobStore:
    """In-memory job tracker. Single-process, local single-user tool — a backend
    restart drops in-flight jobs, which is an acceptable tradeoff here."""

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> Job:
        job = Job(job_id=str(uuid.uuid4()))
        async with self._lock:
            self._jobs[job.job_id] = job
        return job

    async def get(self, job_id: str) -> Job | None:
        async with self._lock:
            return self._jobs.get(job_id)

    async def set_stage(self, job_id: str, stage: JobStage) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status = "running"
                job.stage = stage

    async def set_ats_result(self, job_id: str, ats_result: dict) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.results.ats = ats_result

    async def complete(self, job_id: str, jd_match: JdMatchResult) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.results.jd_match = jd_match
                job.status = "done"
                job.stage = None

    async def fail(self, job_id: str, error: str) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status = "error"
                job.error = error
                job.stage = None


job_store = JobStore()
