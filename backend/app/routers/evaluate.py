import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, UploadFile

from app.history_store import save_evaluation
from app.jobs import job_store
from app.schemas import CreateJobResponse, JobStatusResponse
from app.services.hiring_agent_runner import HiringAgentError, run_hiring_agent
from app.services.jd_match import score_jd_match
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

PDF_MAGIC = b"%PDF"


@router.post("/api/evaluate", response_model=CreateJobResponse, status_code=202)
async def create_evaluation(
    background_tasks: BackgroundTasks,
    resume: UploadFile,
    job_description: str = Form(...),
) -> CreateJobResponse:
    if not job_description.strip():
        raise HTTPException(400, "Job description cannot be empty")

    contents = await resume.read()
    if not contents:
        raise HTTPException(400, "Resume file is empty")
    filename = resume.filename or ""
    if resume.content_type != "application/pdf" and not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Resume must be a PDF file")
    if not contents.startswith(PDF_MAGIC):
        raise HTTPException(400, "Resume does not look like a valid PDF file")

    job = await job_store.create()
    job_dir = settings.runtime_jobs_dir / job.job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    pdf_path = job_dir / "resume.pdf"
    pdf_path.write_bytes(contents)

    background_tasks.add_task(_run_job, job.job_id, pdf_path, job_dir, job_description, filename)

    return CreateJobResponse(job_id=job.job_id, status=job.status)


@router.get("/api/evaluate/{job_id}", response_model=JobStatusResponse)
async def get_evaluation(job_id: str) -> JobStatusResponse:
    job = await job_store.get(job_id)
    if job is None:
        raise HTTPException(404, "Unknown job_id")
    return job.to_response()


async def _run_job(
    job_id: str,
    pdf_path: Path,
    job_dir: Path,
    job_description: str,
    original_filename: str,
) -> None:
    try:
        ats_output = await run_hiring_agent(job_id, pdf_path, job_dir)
        await job_store.set_ats_result(job_id, ats_output["evaluation"])

        await job_store.set_stage(job_id, "scoring_jd_match")
        jd_match = await score_jd_match(ats_output["resume_text"], job_description)

        await job_store.complete(job_id, jd_match)
    except HiringAgentError as exc:
        await job_store.fail(job_id, str(exc))
        return
    except Exception as exc:  # noqa: BLE001 - surface any unexpected failure to the job record
        logger.exception("Unexpected error in job %s", job_id)
        await job_store.fail(job_id, f"Unexpected error ({type(exc).__name__}): {exc}")
        return

    try:
        await save_evaluation(
            id=job_id,
            created_at=datetime.now(timezone.utc),
            candidate_name=ats_output.get("candidate_name"),
            original_filename=original_filename,
            job_description=job_description,
            resume_text=ats_output["resume_text"],
            ats_json=ats_output["evaluation"],
            jd_match=jd_match,
        )
    except Exception:  # noqa: BLE001 - history is a secondary concern, don't fail the job over it
        logger.exception("Failed to save evaluation %s to history", job_id)
