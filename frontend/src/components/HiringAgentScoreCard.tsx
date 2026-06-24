import type { AtsEvaluation, CategoryScore } from "../types/api";

const CATEGORY_LABELS: Record<string, string> = {
  open_source: "Open Source",
  self_projects: "Self Projects",
  production: "Production Experience",
  technical_skills: "Technical Skills",
};

export function HiringAgentScoreCard({ evaluation }: { evaluation: AtsEvaluation }) {
  const categoryEntries = Object.entries(evaluation.scores) as [string, CategoryScore][];
  const categoryTotal = categoryEntries.reduce(
    (sum, [, cat]) => sum + Math.min(cat.score, cat.max),
    0,
  );
  const categoryMax = categoryEntries.reduce((sum, [, cat]) => sum + cat.max, 0);
  const bonus = evaluation.bonus_points?.total ?? 0;
  const deductions = evaluation.deductions?.total ?? 0;
  // Mirrored in backend/app/history_store.py's compute_ats_total() for the history
  // list view's denormalized score column — keep both in sync if this changes.
  const maxPossible = categoryMax + 20;
  const total = Math.min(Math.max(categoryTotal + bonus - deductions, 0), maxPossible);

  return (
    <div className="score-card">
      <h2>hiring-agent ATS Score</h2>
      <p className="score-total">
        {total.toFixed(1)} <span className="score-total__max">/ {maxPossible}</span>
      </p>

      <div className="category-list">
        {categoryEntries.map(([key, cat]) => (
          <div className="category-row" key={key}>
            <div className="category-row__header">
              <span>{CATEGORY_LABELS[key] ?? key}</span>
              <span>
                {Math.min(cat.score, cat.max)} / {cat.max}
              </span>
            </div>
            <div className="bar">
              <div
                className="bar__fill"
                style={{ width: `${(Math.min(cat.score, cat.max) / cat.max) * 100}%` }}
              />
            </div>
            <p className="category-evidence">{cat.evidence}</p>
          </div>
        ))}
      </div>

      {bonus > 0 && (
        <div className="score-section">
          <h3>Bonus: +{bonus}</h3>
          <p>{evaluation.bonus_points.breakdown}</p>
        </div>
      )}

      {deductions > 0 && (
        <div className="score-section">
          <h3>Deductions: -{deductions}</h3>
          <p>{evaluation.deductions.reasons}</p>
        </div>
      )}

      <div className="score-section">
        <h3>Key strengths</h3>
        <ul>
          {evaluation.key_strengths.map((strength, i) => (
            <li key={i}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="score-section">
        <h3>Areas for improvement</h3>
        <ul>
          {evaluation.areas_for_improvement.map((area, i) => (
            <li key={i}>{area}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
