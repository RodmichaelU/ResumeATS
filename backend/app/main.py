from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import evaluate, health
from app.settings import settings

app = FastAPI(title="ResumeATS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(evaluate.router)
