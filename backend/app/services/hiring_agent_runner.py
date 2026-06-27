import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

from app.jobs import job_store
from app.settings import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
WRAPPER_SCRIPT = BACKEND_DIR / "scripts" / "run_hiring_agent.py"

_VALID_STAGES = {"parsing_resume", "fetching_github", "scoring_ats"}


class HiringAgentError(Exception):
    pass


def _run_subprocess(
    cmd: list[str],
    cwd: str,
    env: dict,
    loop: asyncio.AbstractEventLoop,
    job_id: str,
    timeout: int,
) -> tuple[int, str | None]:
    """Blocking subprocess runner executed in a thread pool worker."""
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    error_message: str | None = None

    try:
        for raw_line in proc.stderr:
            line = raw_line.strip()
            if line.startswith("##STAGE## "):
                stage = line.removeprefix("##STAGE## ").strip()
                if stage in _VALID_STAGES:
                    asyncio.run_coroutine_threadsafe(
                        job_store.set_stage(job_id, stage),  # type: ignore[arg-type]
                        loop,
                    )
            elif line.startswith("##ERROR## "):
                error_message = line.removeprefix("##ERROR## ").strip()

        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        raise HiringAgentError(f"ATS evaluation timed out after {timeout}s")

    return proc.returncode, error_message


async def run_hiring_agent(job_id: str, pdf_path: Path, job_dir: Path) -> dict:
    """Run the vendored hiring-agent pipeline on a resume PDF in a thread worker.

    Returns the parsed contents of the wrapper script's --out JSON:
    {"evaluation": <EvaluationData dict>, "resume_text": str, "candidate_name": str | None}
    """
    out_path = job_dir / "result.json"

    env = os.environ.copy()
    env["LLM_PROVIDER"] = settings.llm_provider
    env["DEFAULT_MODEL"] = settings.default_model
    if settings.github_token:
        env["GITHUB_TOKEN"] = settings.github_token

    cmd = [
        sys.executable,
        str(WRAPPER_SCRIPT),
        "--pdf", str(pdf_path),
        "--out", str(out_path),
        "--hiring-agent-dir", str(settings.hiring_agent_path),
    ]

    loop = asyncio.get_running_loop()

    returncode, error_message = await asyncio.to_thread(
        _run_subprocess,
        cmd,
        str(settings.hiring_agent_path),
        env,
        loop,
        job_id,
        settings.job_timeout_seconds,
    )

    if returncode != 0:
        raise HiringAgentError(error_message or "hiring-agent process failed unexpectedly")

    if not out_path.exists():
        raise HiringAgentError("hiring-agent process exited successfully but produced no output")

    with open(out_path, "r", encoding="utf-8") as f:
        return json.load(f)
