import type {
  AtsEvaluation,
  HistoryDetail,
  HistorySummary,
  JdMatchResult,
  JobStatusResponse,
} from "../types/api";

/**
 * Fictional sample data backing the always-available "Demo" tab, so it works with no
 * backend/Ollama running. The "Jane Smith" ATS/JD-match content below is real output
 * from an actual local Ollama run against a synthetic test resume during development --
 * not hand-written -- everything here is fictional, no real person's data.
 */

const JANE_SMITH_ATS: AtsEvaluation = {
  scores: {
    open_source: {
      score: 5,
      max: 35,
      evidence:
        "No significant open source contributions. Personal GitHub repository exists but contains only personal projects.",
    },
    self_projects: {
      score: 20,
      max: 30,
      evidence:
        "Led migration of monolith to Kubernetes microservices - demonstrates complex architectural understanding and practical experience. Built REST APIs - shows proficiency in API development.",
    },
    production: {
      score: 25,
      max: 25,
      evidence:
        "Senior Backend Engineer roles at Acme Corp and Globex Inc demonstrate production-level experience with backend services, migration strategies, and cloud deployment.",
    },
    technical_skills: {
      score: 10,
      max: 10,
      evidence:
        "Proficiency in Python, Go, Kubernetes, Docker, AWS, PostgreSQL, REST APIs - covers a broad range of relevant technical skills.",
    },
  },
  bonus_points: {
    total: 5,
    breakdown: "GSoC participation (assumed based on experience) + Startup Founder/Co-founder Experience",
  },
  deductions: { total: 0, reasons: "" },
  key_strengths: [
    "Backend Development Expertise",
    "Cloud Infrastructure Management",
    "Microservices Architecture",
    "Kubernetes Proficiency",
    "Production Experience",
  ],
  areas_for_improvement: [
    "Lack of Open Source Contributions",
    "Missing GitHub Profile Link",
    "No Portfolio Website",
  ],
};

const JANE_SMITH_JD_MATCH: JdMatchResult = {
  match_score: 85,
  matched_skills: [
    "Python (3+ years experience)",
    "Kubernetes",
    "PostgreSQL",
    "AWS (EC2, S3, RDS)",
  ],
  missing_skills: ["None"],
  rationale:
    "Jane Smith's resume demonstrates a strong alignment with the job description's requirements. She possesses 3+ years of experience with Python and Kubernetes, manages PostgreSQL databases, and has deployed services on AWS. While she doesn't explicitly list Go, her experience building backend services in both Python and Go is relevant. The candidate's experience aligns well with the core technical skills outlined.",
  recommendations: [
    "Update GitHub profile to include relevant projects or repositories.",
    "Quantify achievements within work experience descriptions (e.g., 'Reduced database query latency by X%').",
    "Highlight specific AWS services utilized beyond EC2, S3, and RDS to demonstrate a broader understanding.",
    "Consider adding a brief summary highlighting key skills and experience relevant to the Backend Software Engineer role.",
  ],
};

const JANE_SMITH_JD_TEXT =
  "We are hiring a Backend Software Engineer. Requirements: 3+ years experience with Python, Kubernetes, PostgreSQL, and AWS.";

const JANE_SMITH_RESUME_TEXT = `=== BASIC INFORMATION ===
Name: Jane Smith
Email: jane.smith@example.com

=== WORK EXPERIENCE ===
1. Senior Backend Engineer at Acme Corp (2021-2026)
   - Designed and built backend services in Python and Go
   - Led migration of monolith to Kubernetes-based microservices
   - Managed PostgreSQL database schemas for high-traffic systems
2. Software Engineer at Globex Inc (2018-2021)
   - Built REST APIs in Python (Django, Flask)
   - Deployed services on AWS (EC2, S3, RDS)

=== EDUCATION ===
B.S. Computer Science, State University (2014-2018)

=== SKILLS ===
Python, Go, Kubernetes, Docker, AWS, PostgreSQL, REST APIs, React`;

const ALEX_CHEN_ATS: AtsEvaluation = {
  scores: {
    open_source: {
      score: 28,
      max: 35,
      evidence:
        "Maintains 3 actively-starred open source libraries with regular external contributors; consistent commit history over 2+ years.",
    },
    self_projects: {
      score: 22,
      max: 30,
      evidence:
        "Built an end-to-end ML pipeline for churn prediction as a personal project, deployed with a small Flask API and basic CI.",
    },
    production: {
      score: 12,
      max: 25,
      evidence:
        "One internship as a Data Analyst; limited production/on-call experience shipping ML systems at scale.",
    },
    technical_skills: {
      score: 9,
      max: 10,
      evidence: "Strong breadth across Python, SQL, scikit-learn, PyTorch, and data visualization tooling.",
    },
  },
  bonus_points: { total: 8, breakdown: "Active open source maintainer; published a technical blog series." },
  deductions: { total: 0, reasons: "" },
  key_strengths: [
    "Open Source Contributions",
    "Machine Learning Fundamentals",
    "Self-Directed Project Delivery",
  ],
  areas_for_improvement: ["Limited Production Experience", "No Cloud Deployment Experience Listed"],
};

const ALEX_CHEN_JD_MATCH: JdMatchResult = {
  match_score: 58,
  matched_skills: ["Python", "SQL", "Machine Learning Fundamentals", "scikit-learn"],
  missing_skills: ["Kubernetes", "Production AWS/Cloud Experience", "3+ years professional experience"],
  rationale:
    "Alex's technical foundation in Python and ML is a strong match for the core skills listed, but the role calls for production cloud deployment experience and several years of professional backend work that Alex's resume doesn't yet demonstrate.",
  recommendations: [
    "Highlight any cloud platform exposure, even from personal projects.",
    "Quantify the impact of the churn-prediction project (e.g., accuracy improvement, data volume).",
    "Consider contract or freelance backend work to build production experience before applying.",
  ],
};

const ALEX_CHEN_JD_TEXT =
  "Looking for a Machine Learning Engineer with 3+ years of experience deploying ML models to production on AWS or GCP, strong Python skills, and familiarity with Kubernetes.";

const ALEX_CHEN_RESUME_TEXT = `=== BASIC INFORMATION ===
Name: Alex Chen
Email: alex.chen@example.com

=== WORK EXPERIENCE ===
1. Data Analyst Intern at Northwind Analytics (2025)
   - Built dashboards and ad-hoc SQL analyses for the product team

=== PROJECTS ===
1. Churn Prediction Pipeline (personal project)
   - End-to-end ML pipeline using scikit-learn and PyTorch, deployed via a small Flask API

=== EDUCATION ===
B.S. Data Science, Riverdale University (2022-2026)

=== SKILLS ===
Python, SQL, scikit-learn, PyTorch, pandas, Matplotlib`;

const JANE_SMITH_ID = "demo-jane-smith";
const ALEX_CHEN_ID = "demo-alex-chen";

const mockHistoryDetails: Record<string, HistoryDetail> = {
  [JANE_SMITH_ID]: {
    id: JANE_SMITH_ID,
    created_at: "2026-06-20T18:45:20.135305Z",
    candidate_name: "Jane Smith",
    original_filename: "jane_smith_resume.pdf",
    job_description: JANE_SMITH_JD_TEXT,
    resume_text: JANE_SMITH_RESUME_TEXT,
    ats_total_score: 65,
    ats_max_score: 120,
    ats: JANE_SMITH_ATS,
    jd_match: JANE_SMITH_JD_MATCH,
  },
  [ALEX_CHEN_ID]: {
    id: ALEX_CHEN_ID,
    created_at: "2026-06-18T09:12:00.000000Z",
    candidate_name: "Alex Chen",
    original_filename: "alex_chen_resume.pdf",
    job_description: ALEX_CHEN_JD_TEXT,
    resume_text: ALEX_CHEN_RESUME_TEXT,
    ats_total_score: 71,
    ats_max_score: 120,
    ats: ALEX_CHEN_ATS,
    jd_match: ALEX_CHEN_JD_MATCH,
  },
};

const mockHistoryOrder = [JANE_SMITH_ID, ALEX_CHEN_ID];

function summaryFor(id: string): HistorySummary {
  const d = mockHistoryDetails[id];
  return {
    id: d.id,
    created_at: d.created_at,
    candidate_name: d.candidate_name,
    original_filename: d.original_filename,
    ats_total_score: d.ats_total_score,
    ats_max_score: d.ats_max_score,
    jd_match_score: d.jd_match.match_score,
  };
}

export function mockListHistory(): { items: HistorySummary[]; total: number } {
  const items = mockHistoryOrder.map(summaryFor);
  return { items, total: items.length };
}

export function mockGetHistoryDetail(id: string): HistoryDetail | null {
  return mockHistoryDetails[id] ?? null;
}

const DEMO_JOB_ID = "demo-job";
const DEMO_STAGE_TIMELINE: { atMs: number; stage: JobStatusResponse["stage"] }[] = [
  { atMs: 0, stage: "parsing_resume" },
  { atMs: 3000, stage: "scoring_ats" },
  { atMs: 6000, stage: "scoring_jd_match" },
  { atMs: 9000, stage: null },
];

const demoJobStartTimes = new Map<string, number>();

export function mockSubmitEvaluation(): string {
  demoJobStartTimes.set(DEMO_JOB_ID, Date.now());
  return DEMO_JOB_ID;
}

export async function mockPollJob(jobId: string): Promise<JobStatusResponse> {
  const startedAt = demoJobStartTimes.get(jobId) ?? Date.now();
  const elapsed = Date.now() - startedAt;
  const current = [...DEMO_STAGE_TIMELINE].reverse().find((step) => elapsed >= step.atMs)!;

  if (current.stage === null) {
    return {
      job_id: jobId,
      status: "done",
      stage: null,
      created_at: new Date(startedAt).toISOString(),
      error: null,
      results: { ats: JANE_SMITH_ATS, jd_match: JANE_SMITH_JD_MATCH },
    };
  }

  return {
    job_id: jobId,
    status: "running",
    stage: current.stage,
    created_at: new Date(startedAt).toISOString(),
    error: null,
    results: { ats: null, jd_match: null },
  };
}
