import type { JdMatchResult } from "../types/api";

export function JdMatchScoreCard({ result }: { result: JdMatchResult }) {
  return (
    <div className="score-card">
      <h2>Job Description Match</h2>
      <p className="score-total">
        {result.match_score.toFixed(0)} <span className="score-total__max">/ 100</span>
      </p>

      <div className="score-section">
        <h3>Rationale</h3>
        <p>{result.rationale}</p>
      </div>

      <div className="skill-columns">
        <div>
          <h3>Matched skills</h3>
          <div className="chip-list">
            {result.matched_skills.length === 0 && (
              <span className="chip-empty">None identified</span>
            )}
            {result.matched_skills.map((skill, i) => (
              <span className="chip chip--match" key={i}>
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Missing skills</h3>
          <div className="chip-list">
            {result.missing_skills.length === 0 && (
              <span className="chip-empty">None identified</span>
            )}
            {result.missing_skills.map((skill, i) => (
              <span className="chip chip--missing" key={i}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="score-section">
        <h3>Recommendations</h3>
        <ul>
          {result.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
