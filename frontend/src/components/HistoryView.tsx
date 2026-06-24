import { useEffect, useState } from "react";
import { deleteHistoryEntry, listHistory } from "../api/client";
import type { HistorySummary } from "../types/api";
import { HistoryDetailView } from "./HistoryDetailView";
import { ErrorBanner } from "./ErrorBanner";

export function HistoryView() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listHistory();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this evaluation from history?")) return;
    try {
      await deleteHistoryEntry(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry.");
    }
  }

  if (selectedId) {
    return <HistoryDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  if (loading) {
    return <p className="progress-hint">Loading history...</p>;
  }

  if (error) {
    return (
      <ErrorBanner
        title="Couldn't load history"
        message={error}
        action={{ label: "Retry", onClick: refresh }}
      />
    );
  }

  if (items.length === 0) {
    return <p className="progress-hint">No evaluations yet — completed evaluations will show up here.</p>;
  }

  return (
    <div className="history-list">
      {items.map((item) => (
        <div className="history-row" key={item.id} onClick={() => setSelectedId(item.id)}>
          <div className="history-row__main">
            <span className="history-row__name">
              {item.candidate_name ?? item.original_filename ?? "Untitled resume"}
            </span>
            <span className="history-row__date">
              {new Date(item.created_at).toLocaleString()}
            </span>
          </div>
          <div className="history-row__scores">
            <span className="history-row__score">
              ATS {item.ats_total_score.toFixed(1)}/{item.ats_max_score}
            </span>
            <span className="history-row__score">JD Match {item.jd_match_score.toFixed(0)}/100</span>
            <button
              type="button"
              className="secondary-button history-row__delete"
              onClick={(e) => handleDelete(item.id, e)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
