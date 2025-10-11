/**
 * Favorites service for managing user favorite extractors
 */

import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Get all favorite extractor IDs for the current user
 */
export async function getFavorites(): Promise<number[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/extractors?favorites_only=true`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to fetch favorites');
  }

  const extractors = await response.json();
  return extractors.map((e: any) => e.id);
}

/**
 * Add an extractor to favorites
 */
export async function addFavorite(extractorId: number): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/favorite`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to add favorite');
  }
}

/**
 * Remove an extractor from favorites
 */
export async function removeFavorite(extractorId: number): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/extractors/${extractorId}/favorite`, {
    method: 'DELETE',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to remove favorite');
  }
}

/**
 * Toggle favorite status for an extractor
 */
export async function toggleFavorite(extractorId: number, isFavorited: boolean): Promise<void> {
  if (isFavorited) {
    await removeFavorite(extractorId);
  } else {
    await addFavorite(extractorId);
  }
}
