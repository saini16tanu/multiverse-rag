// All calls to the FastAPI backend live here.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export const BACKEND_DOWN =
  "Backend is not running. Start it with: uv run uvicorn api:app --reload --port 8000";

export type UploadResult = {
  file: string;
  pages: number;
  chunks: number;
  avg_chunk_length: number;
  chunk_method: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  dimensions: number;
};

export type Status = {
  has_pdf: boolean;
  file: string | null;
  pages: number;
  chunks: number;
  avg_chunk_length?: number | null;
};

export type Source = { page: number; snippet: string };
export type AskResult = { answer: string; sources: Source[] };
export type HistoryItem = { role: "user" | "bot"; text: string };

/** Error with a message that is safe to show to the user. */
export class ApiError extends Error {
  backendDown: boolean;
  constructor(message: string, backendDown = false) {
    super(message);
    this.backendDown = backendDown;
  }
}

/** fetch + JSON, with friendly error messages. */
async function request<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
  } catch {
    // network error = the server is not running (or not reachable)
    throw new ApiError(BACKEND_DOWN, true);
  } finally {
    if (timer) clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* body was not JSON */
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const msg = typeof detail === "string" ? detail : `Something went wrong (error ${res.status}).`;
    throw new ApiError(msg);
  }
  return data as T;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const r = await request<{ status: string }>("/health", undefined, 4000);
    return r.status === "ok";
  } catch {
    return false;
  }
}

export function getStatus(): Promise<Status> {
  return request<Status>("/status", undefined, 8000);
}

export function uploadPdf(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResult>("/upload", { method: "POST", body: form });
}

export function askQuestion(question: string, history: HistoryItem[]): Promise<AskResult> {
  return request<AskResult>("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
}
