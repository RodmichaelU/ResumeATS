from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.history_store import init_db
from app.routers import evaluate, health, history
from app.settings import settings

app = FastAPI(title="ResumeATS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _init_history_db() -> None:
    init_db()


app.include_router(health.router)
app.include_router(evaluate.router)
app.include_router(history.router)
