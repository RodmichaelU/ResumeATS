import { useEffect, useState } from "react";
import { getHistoryDetail } from "../api/client";
import type { HistoryDetail } from "../types/api";
import { HiringAgentScoreCard } from "./HiringAgentScoreCard";
import { JdMatchScoreCard } from "./JdMatchScoreCard";
import { ErrorBanner } from "./ErrorBanner";

interface HistoryDetailViewProps {
  id: string;
  onBack: () => void;
}

export function HistoryDetailView({ id, onBack }: HistoryDetailViewProps) {
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    getHistoryDetail(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load entry."));
  }, [id]);

  return (
    <div className="results-view">
      <button type="button" className="secondary-button" onClick={onBack}>
        ← Back to history
      </button>

      {error && <ErrorBanner title="Couldn't load this entry" message={error} />}

      {detail && (
        <>
          <div className="history-detail-header">
            <h2>{detail.candidate_name ?? detail.original_filename ?? "Untitled resume"}</h2>
            <p className="progress-elapsed">
              Evaluated {new Date(detail.created_at).toLocaleString()}
            </p>
            <details className="history-jd-details">
              <summary>Job description used for this evaluation</summary>
              <p className="history-jd-text">{detail.job_description}</p>
            </details>
          </div>

          <div className="results-grid">
            <HiringAgentScoreCard evaluation={detail.ats} />
            <JdMatchScoreCard result={detail.jd_match} />
          </div>
        </>
      )}
    </div>
  );
}
