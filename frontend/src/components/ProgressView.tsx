import { useEffect, useRef, useState } from "react";
import { pollJob } from "../api/client";
import type { JobStatusResponse } from "../types/api";

const STAGE_LABELS: Record<string, string> = {
  parsing_resume: "Parsing resume...",
  fetching_github: "Checking GitHub profile...",
  scoring_ats: "Scoring against hiring-agent's ATS criteria...",
  scoring_jd_match: "Scoring match against the job description...",
};

interface ProgressViewProps {
  jobId: string;
  onDone: (result: JobStatusResponse) => void;
  onError: (message: string) => void;
}

export function ProgressView({ jobId, onDone, onError }: ProgressViewProps) {
  const [stage, setStage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let stopped = false;
    let failureCount = 0;

    const pollInterval = setInterval(async () => {
      if (stopped) return;
      try {
        const status = await pollJob(jobId);
        if (stopped) return;
        failureCount = 0;
        setStage(status.stage);
        if (status.status === "done") {
          stopped = true;
          clearInterval(pollInterval);
          onDone(status);
        } else if (status.status === "error") {
          stopped = true;
          clearInterval(pollInterval);
          onError(status.error ?? "Evaluation failed for an unknown reason.");
        }
      } catch {
        failureCount += 1;
        if (failureCount >= 5) {
          stopped = true;
          clearInterval(pollInterval);
          onError("Lost connection to the backend while waiting for results.");
        }
      }
    }, 3000);

    const tickInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [jobId, onDone, onError]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="progress-view">
      <div className="spinner" />
      <p className="progress-stage">
        {stage ? STAGE_LABELS[stage] ?? stage : "Starting evaluation..."}
      </p>
      <p className="progress-elapsed">
        Elapsed: {minutes}:{seconds.toString().padStart(2, "0")}
      </p>
      <p className="progress-hint">
        This runs entirely on your local Ollama model and can take a few minutes,
        especially on the first run.
      </p>
    </div>
  );
}
