export type JobStatusName = "pending" | "running" | "done" | "error";

export type JobStage =
  | "parsing_resume"
  | "fetching_github"
  | "scoring_ats"
  | "scoring_jd_match";

export interface CategoryScore {
  score: number;
  max: number;
  evidence: string;
}

export interface AtsScores {
  open_source: CategoryScore;
  self_projects: CategoryScore;
  production: CategoryScore;
  technical_skills: CategoryScore;
}

export interface BonusPoints {
  total: number;
  breakdown: string;
}

export interface Deductions {
  total: number;
  reasons: string;
}

export interface AtsEvaluation {
  scores: AtsScores;
  bonus_points: BonusPoints;
  deductions: Deductions;
  key_strengths: string[];
  areas_for_improvement: string[];
}

export interface JdMatchResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
  recommendations: string[];
}

export interface JobResults {
  ats: AtsEvaluation | null;
  jd_match: JdMatchResult | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatusName;
  stage: JobStage | null;
  created_at: string;
  error: string | null;
  results: JobResults;
}

export interface CreateJobResponse {
  job_id: string;
  status: JobStatusName;
}

export interface HealthResponse {
  ollama_reachable: boolean;
  model_available: boolean;
  model: string;
}
