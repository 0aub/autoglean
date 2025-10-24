/**
 * API service for AutoGlean backend
 */

import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface Extractor {
  id: number;
  extractor_id: string;  // UUID for extraction operations
  name_en: string;
  name_ar: string;
  icon: string;
  description_en?: string;
  description_ar?: string;
  prompt?: string;
  owner_id: number;
  owner_name_en: string;
  owner_name_ar: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
  llm: string;
  temperature: number;
  max_tokens: number;
  output_format: string;
  usage_count: number;
  rating_avg: number | null;
  rating_count: number;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
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
 * Get authorization headers
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token
    ? { 'Authorization': `Bearer ${token}` }
    : {};
}

/**
 * Get all available extractors for the current user
 */
export async function getExtractors(): Promise<Extractor[]> {
  const response = await fetch(`${API_BASE_URL}/api/extractors`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch extractors');
  }
  const data = await response.json();
  // API returns array of extractors
  return data;
}

/**
 * Create a new extractor
 */
export async function createExtractor(extractor: Omit<Extractor, 'id' | 'owner_id' | 'owner_name_en' | 'owner_name_ar' | 'usage_count' | 'rating_avg' | 'rating_count' | 'is_favorited' | 'created_at' | 'updated_at'>): Promise<Extractor> {
  const response = await fetch(`${API_BASE_URL}/api/extractors`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extractor),
  });
  if (!response.ok) {
    throw new Error('Failed to create extractor');
  }
  return response.json();
}

/**
 * Update an existing extractor
 */
export async function updateExtractor(id: number, extractor: Partial<Omit<Extractor, 'id' | 'owner_id' | 'owner_name_en' | 'owner_name_ar' | 'usage_count' | 'rating_avg' | 'rating_count' | 'is_favorited' | 'created_at' | 'updated_at'>>): Promise<Extractor> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extractor),
  });
  if (!response.ok) {
    throw new Error('Failed to update extractor');
  }
  return response.json();
}

/**
 * Delete an extractor
 */
export async function deleteExtractor(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete extractor');
  }
}

/**
 * Get list of users for sharing
 */
export async function getUsers(search?: string): Promise<Array<{
  id: number;
  full_name_en: string;
  full_name_ar: string;
  email: string;
  department_id: number;
}>> {
  const url = new URL(`${API_BASE_URL}/api/auth/users`);
  if (search) {
    url.searchParams.set('search', search);
  }

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

/**
 * Share an extractor with a user
 */
export async function shareExtractor(extractorId: number, userId: number, canEdit: boolean = false): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/share`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, can_edit: canEdit }),
  });
  if (!response.ok) {
    throw new Error('Failed to share extractor');
  }
}

/**
 * Unshare an extractor with a user
 */
export async function unshareExtractor(extractorId: number, userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/share/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to unshare extractor');
  }
}

/**
 * Get shared users for an extractor
 */
export async function getExtractorShares(extractorId: number): Promise<Array<{
  id: number;
  extractor_id: number;
  shared_with_user_id: number;
  shared_with_user_name_en: string;
  shared_with_user_name_ar: string;
  can_edit: boolean;
  shared_at: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/shares`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch shares');
  }
  return response.json();
}

/**
 * Get user's extraction job history
 */
export async function getMyJobs(extractorId?: number, status?: string, limit: number = 50, offset: number = 0): Promise<{
  total: number;
  jobs: Array<{
    id: number;
    job_id: string;
    user_id: number;
    user_name: string;
    extractor_id: number;
    extractor_name: string;
    file_name: string;
    status: string;
    result_text: string | null;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
    cached_tokens: number | null;
    model_used: string | null;
    is_cached_result: boolean;
  }>;
}> {
  let url = `${API_BASE_URL}/api/jobs?limit=${limit}&offset=${offset}`;
  if (extractorId) url += `&extractor_id=${extractorId}`;
  if (status) url += `&status=${status}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }
  return response.json();
}

/**
 * Rate an extractor
 */
export async function rateExtractor(extractorId: number, rating: number, review?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/rate`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rating, review }),
  });
  if (!response.ok) {
    throw new Error('Failed to rate extractor');
  }
}

/**
 * Get ratings for an extractor
 */
export async function getExtractorRatings(extractorId: number): Promise<Array<{
  id: number;
  extractor_id: number;
  user_id: number;
  user_name_en: string;
  user_name_ar: string;
  rating: number;
  review: string | null;
  created_at: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/ratings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch ratings');
  }
  return response.json();
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
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      job_id: jobId,
      extractor_id: extractorId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Extraction API error:', response.status, errorText);
    throw new Error(`Failed to start extraction: ${response.status} - ${errorText}`);
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
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getTaskStatus(taskId);

    if (onUpdate) {
      onUpdate(status);
    }

    if (status.status === 'success' || status.status === 'failure') {
      return status;
    }

    // Adaptive polling: fast at first (for cached results), slower later
    // First 5 attempts: 500ms (for cached/fast tasks)
    // Next 10 attempts: 1000ms
    // After that: 2000ms (for slow LLM calls)
    let delay = 2000;
    if (attempts < 5) {
      delay = 500;
    } else if (attempts < 15) {
      delay = 1000;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }

  throw new Error('Task polling timeout');
}

/**
 * Get unique departments from extractors
 */
export async function getDepartments(): Promise<Array<{
  name_en: string;
  name_ar: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/departments`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
}

/**
 * Get unique general managements from extractors
 */
export async function getGeneralManagements(): Promise<Array<{
  name_en: string;
  name_ar: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/general-managements`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch general managements');
  }
  return response.json();
}
