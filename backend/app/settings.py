from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    llm_provider: str = "ollama"
    default_model: str = "gemma3:4b"
    ollama_host: str = "http://localhost:11434"
    hiring_agent_dir: str = "../vendor/hiring-agent"
    job_timeout_seconds: int = 600
    cors_origin: str = "http://localhost:5173"
    github_token: str | None = None

    @property
    def hiring_agent_path(self) -> Path:
        path = Path(self.hiring_agent_dir)
        if not path.is_absolute():
            path = (BACKEND_DIR / path).resolve()
        return path

    @property
    def runtime_jobs_dir(self) -> Path:
        return BACKEND_DIR / "runtime" / "jobs"


settings = Settings()
