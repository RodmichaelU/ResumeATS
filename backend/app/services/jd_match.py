from pathlib import Path

from app.schemas import JdMatchResult
from app.services.ollama_client import chat_structured
from app.settings import settings

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

_SYSTEM_PROMPT = (PROMPTS_DIR / "jd_match_system.txt").read_text(encoding="utf-8")
_USER_TEMPLATE = (PROMPTS_DIR / "jd_match_user.txt").read_text(encoding="utf-8")


async def score_jd_match(resume_text: str, job_description: str) -> JdMatchResult:
    user_prompt = _USER_TEMPLATE.format(
        job_description=job_description, resume_text=resume_text
    )
    result = await chat_structured(
        model=settings.default_model,
        system=_SYSTEM_PROMPT,
        user=user_prompt,
        schema=JdMatchResult.model_json_schema(),
    )
    return JdMatchResult(**result)
