# ResumeATS

Upload a resume PDF and a job description, and get back two independent scores:

1. **ATS Score** — from HackerRank's open-source [hiring-agent](https://github.com/interviewstreet/hiring-agent), used completely unmodified (vendored as a git submodule).
2. **JD Match Score** — a separate score for how well the resume matches the specific job description you provide.

Everything runs locally on [Ollama](https://ollama.com/) — no API keys, no cloud calls.

## Architecture

```
ResumeATS/
├── vendor/hiring-agent/   # git submodule, unmodified
├── backend/               # FastAPI app that orchestrates both scorers
└── frontend/              # React + Vite + TypeScript UI
```

- The backend runs hiring-agent in its own subprocess (via `backend/scripts/run_hiring_agent.py`),
  which composes hiring-agent's own public classes (`PDFHandler`, `ResumeEvaluator`, `github.py`) the
  same way its own `score.py` does, but emits progress markers and skips the CSV/cache side effects we
  don't need.
- The JD-match score is new code (`backend/app/services/jd_match.py`), calling the same local Ollama
  model with its own prompt and schema.
- A full evaluation involves ~8 sequential LLM calls (6 for resume section parsing, 1 for the ATS
  evaluation, 1 for JD matching, plus an optional GitHub-enrichment call if the resume has a GitHub
  link). On a small local model this typically takes **1-3 minutes**. The UI polls a job status endpoint
  and shows progress so this doesn't look stuck.

## Running it

Once first-time setup (below) is done, starting the app again is just three commands.

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173**.

Ollama runs as a background service (started via `brew services start ollama`), so it should already be
running. If the app shows a red "Ollama is not running" banner, run:

```bash
brew services start ollama
```

## First-time setup

### 1. Install and start Ollama

```bash
brew install ollama        # or download from https://ollama.com/download
brew services start ollama # or: ollama serve
ollama pull gemma3:4b      # ~3.3GB download, the default model
```

Other models that work well: `gemma3:12b` (better quality, needs more RAM/VRAM), `gemma3:1b` or
`qwen3:1.7b` (faster, lower quality). If you use a different model, update `DEFAULT_MODEL` in
`backend/.env` (see below).

### 2. Clone submodules

If you haven't already:

```bash
git submodule update --init --recursive
```

### 3. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r ../vendor/hiring-agent/requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

`backend/.env` is the single source of truth for which model/provider is used — it's passed explicitly
into the hiring-agent subprocess's environment, so `vendor/hiring-agent/.env` is not required.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Usage

1. Make sure the green health banner at the top is clear (it checks that Ollama is reachable and the
   configured model is pulled).
2. Drop a resume PDF and paste a job description.
3. Click **Evaluate resume** and wait — this runs entirely on your local model and can take a few
   minutes, especially on the first run or with a larger model.
4. You'll get two cards: the hiring-agent ATS score (category breakdown, bonus, deductions, strengths,
   areas for improvement) and the JD match score (matched/missing skills, rationale, recommendations).

## Troubleshooting

- **"Ollama is not running"** — run `ollama serve` or open the Ollama app, then click Retry.
- **"Model not pulled"** — run the `ollama pull <model>` command shown in the banner.
- **An evaluation seems stuck forever / every evaluation after one failed hangs** — Ollama's local
  server processes one request at a time per model. If a previous evaluation was killed abruptly (e.g.
  you force-quit the backend mid-run, or a job hit `JOB_TIMEOUT_SECONDS`), Ollama can occasionally be
  left waiting on the dropped connection. Restart it: `brew services restart ollama` (or `ollama serve`
  again).
- **A job fails immediately with "no data could be extracted from the PDF"** — hiring-agent uses
  PyMuPDF for text extraction; scanned/image-only PDFs with no extractable text won't work. If text
  extraction itself succeeded but every section still failed, it usually means the local model is
  struggling with this resume — try a larger model (e.g. `gemma3:12b`).
- **A job is slow or stuck right after a GitHub profile link is detected** — hiring-agent makes one
  GitHub API call per repo to enrich the evaluation. Unauthenticated calls are capped at 60/hour, which
  exhausts quickly for profiles with several repos; hiring-agent will proactively sleep until the quota
  resets (logged, but not surfaced in the UI's stage label). Set `GITHUB_TOKEN` in `backend/.env` to
  raise this to 5000/hour (see the config reference below).
- Each job's working files (uploaded PDF, hiring-agent's result JSON) are kept under
  `backend/runtime/jobs/<job_id>/` for inspection/debugging — they're gitignored and safe to delete.

## Configuration reference (`backend/.env`)

| Variable               | Default                       | Purpose                                                  |
| ----------------------- | ------------------------------ | --------------------------------------------------------- |
| `LLM_PROVIDER`          | `ollama`                       | Passed through to hiring-agent (Ollama-only in this app)  |
| `DEFAULT_MODEL`         | `gemma3:4b`                    | Model used for both the ATS evaluation and JD matching    |
| `OLLAMA_HOST`           | `http://localhost:11434`       | Ollama server address                                     |
| `HIRING_AGENT_DIR`      | `../vendor/hiring-agent`       | Path to the vendored submodule                            |
| `JOB_TIMEOUT_SECONDS`   | `600`                          | Max time before a job is marked failed                    |
| `CORS_ORIGIN`           | `http://localhost:5173`        | Allowed frontend origin                                   |
| `GITHUB_TOKEN`          | unset                          | Optional; raises GitHub API rate limit from 60/hr to 5000/hr for the GitHub-enrichment step |

## Updating hiring-agent

The submodule is pinned to a specific commit. To pull in upstream changes:

```bash
cd vendor/hiring-agent
git fetch origin
git checkout origin/main   # or a specific tag/commit
cd ../..
git add vendor/hiring-agent
git commit -m "Update hiring-agent submodule"
```

Re-run the verification steps below afterward, since hiring-agent's internals (e.g. template paths,
function signatures) could change between versions.

## Verifying changes

1. `ollama serve` running with the configured model pulled.
2. Submit a resume with a GitHub link and one without, confirming both complete and the GitHub-enrichment
   branch (slower, hits the GitHub API) only triggers when expected.
3. Stop Ollama and confirm the health banner correctly blocks submission.
4. Upload a non-PDF file and confirm it's rejected client-side and server-side.
