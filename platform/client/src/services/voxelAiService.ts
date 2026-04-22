/**
 * Voxel AI Service - Generate voxels from text prompts using MiniMax API
 *
 * Provides AI-powered voxel generation for the Voxel Builder feature.
 * Calls backend API which uses MiniMax API for generation.
 */

import { Voxel, VoxelColor } from '../stores/voxelStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface VoxelGenParams {
  prompt: string;
  gridSize?: number;
  /** Preferred colors (optional, AI may suggest colors) */
  preferredColors?: VoxelColor[];
}

export interface VoxelGenResult {
  voxels: Voxel[];
  description: string;
  model: string;
  success: boolean;
  error?: string;
}

/**
 * POST /api/ai/voxel-generate
 * Generate voxel structure from text prompt using MiniMax API
 */
export async function generateVoxelsFromPrompt(params: VoxelGenParams): Promise<VoxelGenResult> {
  try {
    const response = await fetch(`${API_BASE}/api/ai/voxel-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        grid_size: params.gridSize || 16,
        preferred_colors: params.preferredColors,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        voxels: [],
        description: '',
        model: '',
        success: false,
        error: err.error || `Generation failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      voxels: data.voxels || [],
      description: data.description || '',
      model: data.model || 'MiniMax',
      success: true,
    };
  } catch (err) {
    return {
      voxels: [],
      description: '',
      model: '',
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Demo voxel structures for testing
 */
export const DEMO_VOXEL_STRUCTURES: Record<string, Voxel[]> = {
  'cherry-blossom-tree': [
    // Trunk
    { x: 7, y: 0, z: 7, color: '#8b4513' },
    { x: 7, y: 1, z: 7, color: '#8b4513' },
    { x: 7, y: 2, z: 7, color: '#8b4513' },
    { x: 7, y: 3, z: 7, color: '#8b4513' },
    { x: 7, y: 4, z: 7, color: '#8b4513' },
    // Foliage (pink blossom)
    { x: 6, y: 4, z: 6, color: '#ffb7c5' },
    { x: 7, y: 4, z: 6, color: '#ffb7c5' },
    { x: 8, y: 4, z: 6, color: '#ffb7c5' },
    { x: 6, y: 4, z: 7, color: '#ffb7c5' },
    { x: 8, y: 4, z: 7, color: '#ffb7c5' },
    { x: 6, y: 4, z: 8, color: '#ffb7c5' },
    { x: 7, y: 4, z: 8, color: '#ffb7c5' },
    { x: 8, y: 4, z: 8, color: '#ffb7c5' },
    { x: 7, y: 5, z: 6, color: '#ffb7c5' },
    { x: 7, y: 5, z: 7, color: '#ff69b4' },
    { x: 7, y: 5, z: 8, color: '#ffb7c5' },
    { x: 6, y: 5, z: 7, color: '#ffb7c5' },
    { x: 8, y: 5, z: 7, color: '#ffb7c5' },
    { x: 7, y: 6, z: 7, color: '#ff69b4' },
  ],
  'simple-robot': [
    // Body
    { x: 7, y: 1, z: 7, color: '#3b82f6' },
    { x: 8, y: 1, z: 7, color: '#3b82f6' },
    { x: 7, y: 2, z: 7, color: '#3b82f6' },
    { x: 8, y: 2, z: 7, color: '#3b82f6' },
    { x: 7, y: 3, z: 7, color: '#3b82f6' },
    { x: 8, y: 3, z: 7, color: '#3b82f6' },
    // Head
    { x: 7, y: 4, z: 7, color: '#60a5fa' },
    { x: 8, y: 4, z: 7, color: '#60a5fa' },
    { x: 7, y: 5, z: 7, color: '#60a5fa' },
    { x: 8, y: 5, z: 7, color: '#60a5fa' },
    // Eyes
    { x: 7, y: 5, z: 6, color: '#22c55e' },
    { x: 8, y: 5, z: 6, color: '#22c55e' },
    // Antenna
    { x: 7, y: 6, z: 7, color: '#ef4444' },
    { x: 8, y: 6, z: 7, color: '#ef4444' },
    { x: 7, y: 7, z: 7, color: '#ef4444' },
    { x: 8, y: 7, z: 7, color: '#ef4444' },
    // Arms
    { x: 6, y: 2, z: 7, color: '#3b82f6' },
    { x: 6, y: 3, z: 7, color: '#3b82f6' },
    { x: 9, y: 2, z: 7, color: '#3b82f6' },
    { x: 9, y: 3, z: 7, color: '#3b82f6' },
    // Legs
    { x: 7, y: 0, z: 6, color: '#1e40af' },
    { x: 8, y: 0, z: 6, color: '#1e40af' },
    { x: 7, y: 0, z: 8, color: '#1e40af' },
    { x: 8, y: 0, z: 8, color: '#1e40af' },
  ],
  'house': [
    // Foundation
    { x: 5, y: 0, z: 5, color: '#78716c' },
    { x: 6, y: 0, z: 5, color: '#78716c' },
    { x: 7, y: 0, z: 5, color: '#78716c' },
    { x: 8, y: 0, z: 5, color: '#78716c' },
    { x: 9, y: 0, z: 5, color: '#78716c' },
    { x: 5, y: 0, z: 6, color: '#78716c' },
    { x: 9, y: 0, z: 6, color: '#78716c' },
    { x: 5, y: 0, z: 7, color: '#78716c' },
    { x: 9, y: 0, z: 7, color: '#78716c' },
    { x: 5, y: 0, z: 8, color: '#78716c' },
    { x: 6, y: 0, z: 8, color: '#78716c' },
    { x: 7, y: 0, z: 8, color: '#78716c' },
    { x: 8, y: 0, z: 8, color: '#78716c' },
    { x: 9, y: 0, z: 8, color: '#78716c' },
    // Walls
    { x: 5, y: 1, z: 5, color: '#f5f5f4' },
    { x: 6, y: 1, z: 5, color: '#f5f5f4' },
    { x: 7, y: 1, z: 5, color: '#f5f5f4' },
    { x: 8, y: 1, z: 5, color: '#f5f5f4' },
    { x: 9, y: 1, z: 5, color: '#f5f5f4' },
    { x: 5, y: 2, z: 5, color: '#f5f5f4' },
    { x: 9, y: 2, z: 5, color: '#f5f5f4' },
    { x: 5, y: 3, z: 5, color: '#f5f5f4' },
    { x: 9, y: 3, z: 5, color: '#f5f5f4' },
    { x: 5, y: 4, z: 5, color: '#f5f5f4' },
    { x: 9, y: 4, z: 5, color: '#f5f5f4' },
    { x: 5, y: 1, z: 8, color: '#f5f5f4' },
    { x: 6, y: 1, z: 8, color: '#f5f5f4' },
    { x: 7, y: 1, z: 8, color: '#f5f5f4' },
    { x: 8, y: 1, z: 8, color: '#f5f5f4' },
    { x: 9, y: 1, z: 8, color: '#f5f5f4' },
    { x: 5, y: 2, z: 8, color: '#f5f5f4' },
    { x: 9, y: 2, z: 8, color: '#f5f5f4' },
    { x: 5, y: 3, z: 8, color: '#f5f5f4' },
    { x: 9, y: 3, z: 8, color: '#f5f5f4' },
    { x: 5, y: 4, z: 8, color: '#f5f5f4' },
    { x: 9, y: 4, z: 8, color: '#f5f5f4' },
    // Door
    { x: 7, y: 1, z: 8, color: '#8b4513' },
    { x: 7, y: 2, z: 8, color: '#8b4513' },
    { x: 7, y: 3, z: 8, color: '#8b4513' },
    // Windows
    { x: 6, y: 2, z: 5, color: '#87ceeb' },
    { x: 8, y: 2, z: 5, color: '#87ceeb' },
    // Roof
    { x: 6, y: 5, z: 5, color: '#dc2626' },
    { x: 7, y: 5, z: 5, color: '#dc2626' },
    { x: 8, y: 5, z: 5, color: '#dc2626' },
    { x: 6, y: 5, z: 6, color: '#dc2626' },
    { x: 7, y: 5, z: 6, color: '#dc2626' },
    { x: 8, y: 5, z: 6, color: '#dc2626' },
    { x: 6, y: 5, z: 7, color: '#dc2626' },
    { x: 7, y: 5, z: 7, color: '#dc2626' },
    { x: 8, y: 5, z: 7, color: '#dc2626' },
    { x: 7, y: 6, z: 6, color: '#dc2626' },
    { x: 7, y: 6, z: 7, color: '#dc2626' },
    { x: 7, y: 7, z: 6, color: '#dc2626' },
    { x: 7, y: 7, z: 7, color: '#dc2626' },
  ],
};

export default voxelAiService;
