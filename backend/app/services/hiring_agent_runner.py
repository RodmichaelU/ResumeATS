import asyncio
import json
import os
import sys
from pathlib import Path

from app.jobs import job_store
from app.settings import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
WRAPPER_SCRIPT = BACKEND_DIR / "scripts" / "run_hiring_agent.py"

_VALID_STAGES = {"parsing_resume", "fetching_github", "scoring_ats"}


class HiringAgentError(Exception):
    pass


async def run_hiring_agent(job_id: str, pdf_path: Path, job_dir: Path) -> dict:
    """Run the vendored hiring-agent pipeline on a resume PDF in its own subprocess.

    Returns the parsed contents of the wrapper script's --out JSON:
    {"evaluation": <EvaluationData dict>, "resume_text": str, "candidate_name": str | None}
    """
    out_path = job_dir / "result.json"

    env = os.environ.copy()
    env["LLM_PROVIDER"] = settings.llm_provider
    env["DEFAULT_MODEL"] = settings.default_model

    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        str(WRAPPER_SCRIPT),
        "--pdf",
        str(pdf_path),
        "--out",
        str(out_path),
        "--hiring-agent-dir",
        str(settings.hiring_agent_path),
        # hiring-agent's TemplateManager loads Jinja templates from a relative
        # "prompts/templates" path resolved against CWD, with no override hook —
        # PDFHandler/ResumeEvaluator/github.py all construct it with defaults. So
        # the subprocess CWD must be hiring-agent's own directory, not the job dir,
        # or every template render silently fails. pdf_path/out_path are absolute,
        # so this doesn't affect where the PDF is read from or the result written.
        cwd=str(settings.hiring_agent_path),
        env=env,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )

    error_message: str | None = None

    async def read_stderr() -> None:
        nonlocal error_message
        assert proc.stderr is not None
        async for raw_line in proc.stderr:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if line.startswith("##STAGE## "):
                stage = line.removeprefix("##STAGE## ").strip()
                if stage in _VALID_STAGES:
                    await job_store.set_stage(job_id, stage)  # type: ignore[arg-type]
            elif line.startswith("##ERROR## "):
                error_message = line.removeprefix("##ERROR## ").strip()

    try:
        await asyncio.wait_for(
            asyncio.gather(proc.wait(), read_stderr()),
            timeout=settings.job_timeout_seconds,
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise HiringAgentError(
            f"ATS evaluation timed out after {settings.job_timeout_seconds}s"
        )

    if proc.returncode != 0:
        raise HiringAgentError(error_message or "hiring-agent process failed unexpectedly")

    if not out_path.exists():
        raise HiringAgentError("hiring-agent process exited successfully but produced no output")

    with open(out_path, "r", encoding="utf-8") as f:
        return json.load(f)
