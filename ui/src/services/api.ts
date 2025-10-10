/**
 * API service for AutoGlean backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface Extractor {
  id: string;
  name: string;
  icon: string;
  description?: string;
  llm: string;
  temperature: number;
  max_tokens: number;
}

export interface ExtractionResult {
  job_id: string;
  extractor_id: string;
  file_name: string;
  result_content: string;
  result_path: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'success' | 'failure';
  result?: {
    status: string;
    job_id: string;
    result: ExtractionResult;
  };
  error?: string;
}

/**
 * Get all available extractors
 */
export async function getExtractors(): Promise<Record<string, Extractor>> {
  const response = await fetch(`${API_BASE_URL}/api/extractors`);
  if (!response.ok) {
    throw new Error('Failed to fetch extractors');
  }
  const data = await response.json();
  return data.extractors;
}

/**
 * Upload a file
 */
export async function uploadFile(file: File): Promise<{ job_id: string; file_name: string; file_path: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

/**
 * Start extraction task
 */
export async function startExtraction(jobId: string, extractorId: string): Promise<{ task_id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: jobId,
      extractor_id: extractorId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start extraction');
  }

  return response.json();
}

/**
 * Get task status
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const response = await fetch(`${API_BASE_URL}/api/task/${taskId}`);

  if (!response.ok) {
    throw new Error('Failed to get task status');
  }

  return response.json();
}

/**
 * Poll task status until completion
 */
export async function pollTaskStatus(
  taskId: string,
  onUpdate?: (status: TaskStatus) => void
): Promise<TaskStatus> {
  const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getTaskStatus(taskId);

    if (onUpdate) {
      onUpdate(status);
    }

    if (status.status === 'success' || status.status === 'failure') {
      return status;
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Task polling timeout');
}
