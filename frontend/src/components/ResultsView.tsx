import type { JobStatusResponse } from "../types/api";
import { HiringAgentScoreCard } from "./HiringAgentScoreCard";
import { JdMatchScoreCard } from "./JdMatchScoreCard";

interface ResultsViewProps {
  result: JobStatusResponse;
  onReset: () => void;
}

export function ResultsView({ result, onReset }: ResultsViewProps) {
  return (
    <div className="results-view">
      <div className="results-grid">
        {result.results.ats && <HiringAgentScoreCard evaluation={result.results.ats} />}
        {result.results.jd_match && <JdMatchScoreCard result={result.results.jd_match} />}
      </div>
      <button type="button" className="secondary-button" onClick={onReset}>
        Evaluate another resume
      </button>
    </div>
  );
}
