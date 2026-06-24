import { useState } from "react";
import { mockGetHistoryDetail, mockListHistory, mockPollJob, mockSubmitEvaluation } from "../api/mockData";
import type { HistoryDetail, JobStatusResponse } from "../types/api";
import { UploadForm } from "./UploadForm";
import { ProgressView } from "./ProgressView";
import { ResultsView } from "./ResultsView";
import { ErrorBanner } from "./ErrorBanner";
import { HiringAgentScoreCard } from "./HiringAgentScoreCard";
import { JdMatchScoreCard } from "./JdMatchScoreCard";

type DemoState =
  | { phase: "idle" }
  | { phase: "polling"; jobId: string }
  | { phase: "done"; result: JobStatusResponse }
  | { phase: "error"; message: string }
  | { phase: "example"; detail: HistoryDetail };

const DEMO_HINT =
  "This tab is simulated with sample data — no backend or Ollama is actually involved.";

export function DemoView() {
  const [state, setState] = useState<DemoState>({ phase: "idle" });
  const examples = mockListHistory().items;

  function handleSubmit(_resume: File, _jobDescription: string) {
    const jobId = mockSubmitEvaluation();
    setState({ phase: "polling", jobId });
  }

  function handleReset() {
    setState({ phase: "idle" });
  }

  function showExample(id: string) {
    const detail = mockGetHistoryDetail(id);
    if (detail) setState({ phase: "example", detail });
  }

  return (
    <div className="demo-view">
      <p className="demo-note">🎭 {DEMO_HINT}</p>

      {state.phase === "idle" && (
        <>
          <UploadForm disabled={false} onSubmit={handleSubmit} />
          <div className="demo-examples">
            <p className="demo-examples__label">Or jump straight to a sample result:</p>
            <div className="demo-examples__list">
              {examples.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="secondary-button"
                  onClick={() => showExample(item.id)}
                >
                  {item.candidate_name ?? item.original_filename ?? "Sample result"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {state.phase === "polling" && (
        <ProgressView
          jobId={state.jobId}
          pollFn={mockPollJob}
          hint={DEMO_HINT}
          onDone={(result) => setState({ phase: "done", result })}
          onError={(message) => setState({ phase: "error", message })}
        />
      )}

      {state.phase === "done" && <ResultsView result={state.result} onReset={handleReset} />}

      {state.phase === "error" && (
        <ErrorBanner
          title="Demo error"
          message={state.message}
          action={{ label: "Try again", onClick: handleReset }}
        />
      )}

      {state.phase === "example" && (
        <div className="results-view">
          <button type="button" className="secondary-button" onClick={handleReset}>
            ← Back
          </button>
          <div className="results-grid">
            <HiringAgentScoreCard evaluation={state.detail.ats} />
            <JdMatchScoreCard result={state.detail.jd_match} />
          </div>
        </div>
      )}
    </div>
  );
}
