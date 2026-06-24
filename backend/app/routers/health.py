import httpx
from fastapi import APIRouter

from app.schemas import HealthResponse
from app.settings import settings

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    ollama_reachable = False
    model_available = False

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.ollama_host}/api/tags")
        if resp.status_code == 200:
            ollama_reachable = True
            models = resp.json().get("models", [])
            model_available = any(
                m.get("model") == settings.default_model
                or m.get("name") == settings.default_model
                for m in models
            )
    except httpx.HTTPError:
        pass

    return HealthResponse(
        ollama_reachable=ollama_reachable,
        model_available=model_available,
        model=settings.default_model,
    )
