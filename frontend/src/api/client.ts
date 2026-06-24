import type { CreateJobResponse, HealthResponse, JobStatusResponse } from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // response body wasn't JSON — fall back to statusText
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  return handleResponse<HealthResponse>(res);
}

export async function submitEvaluation(
  resume: File,
  jobDescription: string,
): Promise<CreateJobResponse> {
  const formData = new FormData();
  formData.append("resume", resume);
  formData.append("job_description", jobDescription);

  const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<CreateJobResponse>(res);
}

export async function pollJob(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/evaluate/${jobId}`);
  return handleResponse<JobStatusResponse>(res);
}
