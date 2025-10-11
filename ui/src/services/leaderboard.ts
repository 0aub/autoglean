/**
 * Leaderboard service
 */

import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface ExtractorLeaderboardEntry {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  owner_name_en: string;
  owner_name_ar: string;
  usage_count: number;
  rating_avg: number | null;
  rating_count: number;
}

export interface UserLeaderboardEntry {
  id: number;
  full_name_en: string;
  full_name_ar: string;
  department_en: string;
  department_ar: string;
  extractor_count: number;
  total_usage: number;
  rating_avg: number | null;
  rating_count: number;
}

export interface DepartmentLeaderboardEntry {
  department_en: string;
  department_ar: string;
  user_count: number;
  extractor_count: number;
  total_usage: number;
  rating_avg: number | null;
  rating_count: number;
}

export interface LeaderboardResponse {
  top_extractors_by_usage: ExtractorLeaderboardEntry[];
  top_extractors_by_rating: ExtractorLeaderboardEntry[];
  top_users_by_extractor_count: UserLeaderboardEntry[];
  top_users_by_usage: UserLeaderboardEntry[];
  top_users_by_rating: UserLeaderboardEntry[];
  top_departments_by_extractor_count: DepartmentLeaderboardEntry[];
  top_departments_by_usage: DepartmentLeaderboardEntry[];
  top_departments_by_rating: DepartmentLeaderboardEntry[];
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/leaderboard?limit=${limit}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}
