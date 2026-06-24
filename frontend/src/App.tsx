import { useEffect, useState } from "react";
import "./App.css";
import { UploadForm } from "./components/UploadForm";
import { ProgressView } from "./components/ProgressView";
import { ResultsView } from "./components/ResultsView";
import { ErrorBanner } from "./components/ErrorBanner";
import { HistoryView } from "./components/HistoryView";
import { checkHealth, submitEvaluation } from "./api/client";
import { useTheme } from "./hooks/useTheme";
import type { HealthResponse, JobStatusResponse } from "./types/api";

type ViewState =
  | { phase: "idle" }
  | { phase: "polling"; jobId: string }
  | { phase: "done"; result: JobStatusResponse }
  | { phase: "error"; message: string };

type Page = "evaluator" | "history";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = useState<Page>("evaluator");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ phase: "idle" });

  async function refreshHealth() {
    try {
      const result = await checkHealth();
      setHealth(result);
      setHealthError(null);
    } catch {
      setHealth(null);
      setHealthError("Could not reach the ResumeATS backend. Is it running?");
    }
  }

  useEffect(() => {
    refreshHealth();
  }, []);

  async function handleSubmit(resume: File, jobDescription: string) {
    try {
      const { job_id } = await submitEvaluation(resume, jobDescription);
      setView({ phase: "polling", jobId: job_id });
    } catch (err) {
      setView({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to submit evaluation.",
      });
    }
  }

  function handleReset() {
    setView({ phase: "idle" });
    refreshHealth();
  }

  const ollamaReady = Boolean(health?.ollama_reachable && health?.model_available);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ResumeATS</h1>
        <p>
          Score a resume with HackerRank's open-source hiring-agent ATS checker, plus a
          separate job-description match score — all running locally on Ollama.
        </p>
      </header>

      <div className="app-toolbar">
        <nav className="app-nav">
          <button
            type="button"
            className={page === "evaluator" ? "app-nav__tab app-nav__tab--active" : "app-nav__tab"}
            onClick={() => setPage("evaluator")}
          >
            Evaluate
          </button>
          <button
            type="button"
            className={page === "history" ? "app-nav__tab app-nav__tab--active" : "app-nav__tab"}
            onClick={() => setPage("history")}
          >
            History
          </button>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {page === "evaluator" && (
        <>
          {healthError && (
            <ErrorBanner
              title="Backend unreachable"
              message={healthError}
              action={{ label: "Retry", onClick: refreshHealth }}
            />
          )}

          {health && !health.ollama_reachable && (
            <ErrorBanner
              title="Ollama is not running"
              message="Start Ollama (run `ollama serve`, or open the Ollama app) and try again."
              action={{ label: "Retry", onClick: refreshHealth }}
            />
          )}

          {health && health.ollama_reachable && !health.model_available && (
            <ErrorBanner
              title="Model not pulled"
              message={`Run "ollama pull ${health.model}" and try again.`}
              action={{ label: "Retry", onClick: refreshHealth }}
            />
          )}

          <main>
            {view.phase === "idle" && (
              <UploadForm
                disabled={!ollamaReady}
                disabledReason={
                  !ollamaReady ? "Resolve the Ollama issue above before submitting." : undefined
                }
                onSubmit={handleSubmit}
              />
            )}
            {view.phase === "polling" && (
              <ProgressView
                jobId={view.jobId}
                onDone={(result) => setView({ phase: "done", result })}
                onError={(message) => setView({ phase: "error", message })}
              />
            )}
            {view.phase === "done" && <ResultsView result={view.result} onReset={handleReset} />}
            {view.phase === "error" && (
              <ErrorBanner
                title="Evaluation failed"
                message={view.message}
                action={{ label: "Try again", onClick: handleReset }}
              />
            )}
          </main>
        </>
      )}

      {page === "history" && (
        <main>
          <HistoryView />
        </main>
      )}
    </div>
  );
}

export default App;
