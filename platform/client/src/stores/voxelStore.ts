/**
 * Voxel Builder Store - Zustand store for voxel builder state
 *
 * Manages:
 * - Voxel grid data (3D array of voxel positions)
 * - Selected color and tool
 * - Undo/redo history
 * - Save/load voxel creations
 * - Gamification (XP, badges)
 */

import { create } from 'zustand';
import { generateVoxelsFromPrompt, DEMO_VOXEL_STRUCTURES } from '../services/voxelAiService';

export type VoxelColor =
  | '#ef4444' // red
  | '#f59e0b' // orange
  | '#eab308' // yellow
  | '#22c55e' // green
  | '#06b6d4' // cyan
  | '#3b82f6' // blue
  | '#8b5cf6' // purple
  | '#ec4899' // pink
  | '#6b7280' // gray
  | '#ffffff'; // white

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: VoxelColor;
}

export type VoxelTool = 'add' | 'remove' | 'paint';

interface VoxelHistoryEntry {
  voxels: Voxel[];
  timestamp: number;
}

interface VoxelBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: number;
}

interface VoxelBuilderState {
  // Grid state
  voxels: Voxel[];
  gridSize: number; // 16x16x16 default

  // Tool state
  selectedColor: VoxelColor;
  selectedTool: VoxelTool;

  // History for undo/redo
  history: VoxelHistoryEntry[];
  historyIndex: number;

  // Selection
  selectedVoxel: Voxel | null;

  // Mode
  mode: 'build' | 'view' | 'ai-generate';

  // Gamification
  totalXp: number;
  totalVoxelsCreated: number;
  badges: VoxelBadge[];

  // Actions
  addVoxel: (x: number, y: number, z: number) => void;
  removeVoxel: (x: number, y: number, z: number) => void;
  paintVoxel: (x: number, y: number, z: number, color: VoxelColor) => void;
  setVoxels: (voxels: Voxel[]) => void;
  clearGrid: () => void;
  setSelectedColor: (color: VoxelColor) => void;
  setSelectedTool: (tool: VoxelTool) => void;
  setSelectedVoxel: (voxel: Voxel | null) => void;
  setMode: (mode: 'build' | 'view' | 'ai-generate') => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Save/load
  exportVoxels: () => string;
  importVoxels: (json: string) => boolean;

  // AI generation
  generateFromPrompt: (prompt: string) => Promise<Voxel[]>;

  // Gamification actions
  awardXp: (amount: number) => void;
  checkBadges: () => void;
}

const DEFAULT_COLORS: VoxelColor[] = [
  '#ef4444',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#ffffff',
];

export const VOXEL_COLORS = DEFAULT_COLORS;

// Badge definitions
const BADGE_DEFINITIONS: VoxelBadge[] = [
  {
    id: 'voxel-master',
    name: 'Voxel Master',
    description: 'Tạo 50 voxels',
    icon: '🏆',
  },
  {
    id: 'first-creation',
    name: 'Sáng Tạo Đầu Tiên',
    description: 'Tạo voxel đầu tiên',
    icon: '🌟',
  },
  {
    id: 'colorful-creator',
    name: 'Nghệ Nhân Màu Sắc',
    description: 'Sử dụng tất cả 10 màu',
    icon: '🎨',
  },
  {
    id: 'ai-pioneer',
    name: 'AI Pioneer',
    description: 'Sử dụng AI để tạo voxel',
    icon: '🤖',
  },
];

// XP rewards
const XP_PER_VOXEL = 10;
const XP_PER_AI_GENERATION = 50;

export const useVoxelBuilderStore = create<VoxelBuilderState>((set, get) => ({
  voxels: [],
  gridSize: 16,
  selectedColor: '#3b82f6',
  selectedTool: 'add',
  history: [{ voxels: [], timestamp: Date.now() }],
  historyIndex: 0,
  selectedVoxel: null,
  mode: 'build',

  // Gamification state
  totalXp: 0,
  totalVoxelsCreated: 0,
  badges: [],

  addVoxel: (x, y, z) => {
    const state = get();
    if (x < 0 || x >= state.gridSize || y < 0 || y >= state.gridSize || z < 0 || z >= state.gridSize) {
      return; // Out of bounds
    }

    // Check if voxel already exists at position
    const existingIndex = state.voxels.findIndex(v => v.x === x && v.y === y && v.z === z);
    if (existingIndex !== -1) {
      return; // Already exists
    }

    const newVoxel: Voxel = { x, y, z, color: state.selectedColor };
    set(s => ({ voxels: [...s.voxels, newVoxel] }));
    get().saveToHistory();

    // Award XP for creating voxel
    get().awardXp(XP_PER_VOXEL);
    get().checkBadges();
  },

  removeVoxel: (x, y, z) => {
    const state = get();
    set(s => ({
      voxels: s.voxels.filter(v => !(v.x === x && v.y === y && v.z === z)),
    }));
    get().saveToHistory();
  },

  paintVoxel: (x, y, z, color) => {
    const state = get();
    set(s => ({
      voxels: s.voxels.map(v =>
        v.x === x && v.y === y && v.z === z ? { ...v, color } : v
      ),
    }));
    get().saveToHistory();
    get().checkBadges();
  },

  setVoxels: (voxels) => {
    const oldCount = get().voxels.length;
    set({ voxels });
    const newCount = voxels.length;
    const diff = newCount - oldCount;
    if (diff > 0) {
      get().awardXp(diff * XP_PER_VOXEL);
    }
    get().saveToHistory();
    get().checkBadges();
  },

  clearGrid: () => {
    set({ voxels: [] });
    get().saveToHistory();
  },

  setSelectedColor: (color) => {
    set({ selectedColor: color });
  },

  setSelectedTool: (tool) => {
    set({ selectedTool: tool });
  },

  setSelectedVoxel: (voxel) => {
    set({ selectedVoxel: voxel });
  },

  setMode: (mode) => {
    set({ mode });
  },

  saveToHistory: () => {
    const state = get();
    const newEntry: VoxelHistoryEntry = {
      voxels: JSON.parse(JSON.stringify(state.voxels)),
      timestamp: Date.now(),
    };

    // Truncate any redo history
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newEntry);

    // Keep max 50 history entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      set({
        voxels: JSON.parse(JSON.stringify(entry.voxels)),
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      set({
        voxels: JSON.parse(JSON.stringify(entry.voxels)),
        historyIndex: newIndex,
      });
    }
  },

  exportVoxels: () => {
    return JSON.stringify(get().voxels);
  },

  importVoxels: (json) => {
    try {
      const voxels = JSON.parse(json);
      if (Array.isArray(voxels)) {
        set({ voxels });
        get().saveToHistory();
        get().checkBadges();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  generateFromPrompt: async (prompt) => {
    const lowerPrompt = prompt.toLowerCase().trim();

    // Check for demo structures first
    if (DEMO_VOXEL_STRUCTURES[lowerPrompt]) {
      const demoVoxels = DEMO_VOXEL_STRUCTURES[lowerPrompt];
      set(s => ({ voxels: [...s.voxels, ...demoVoxels] }));
      get().awardXp(demoVoxels.length * XP_PER_VOXEL + XP_PER_AI_GENERATION);
      get().checkBadges();
      return demoVoxels;
    }

    // Try AI generation
    try {
      const result = await generateVoxelsFromPrompt({ prompt });
      if (result.success && result.voxels.length > 0) {
        set(s => ({ voxels: [...s.voxels, ...result.voxels] }));
        get().awardXp(result.voxels.length * XP_PER_VOXEL + XP_PER_AI_GENERATION);
        get().checkBadges();

        // Mark AI Pioneer badge as earned
        get().checkBadges();
        return result.voxels;
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    }

    return [];
  },

  awardXp: (amount) => {
    set(s => ({ totalXp: s.totalXp + amount }));
  },

  checkBadges: () => {
    const state = get();
    const newBadges: VoxelBadge[] = [...state.badges];
    const now = Date.now();

    // First creation badge
    if (state.voxels.length >= 1 && !newBadges.find(b => b.id === 'first-creation')) {
      newBadges.push({ ...BADGE_DEFINITIONS[1], earnedAt: now });
    }

    // Voxel Master badge (50 voxels)
    if (state.voxels.length >= 50 && !newBadges.find(b => b.id === 'voxel-master')) {
      newBadges.push({ ...BADGE_DEFINITIONS[0], earnedAt: now });
    }

    // Colorful Creator badge (all 10 colors used)
    const usedColors = new Set(state.voxels.map(v => v.color));
    if (usedColors.size >= 10 && !newBadges.find(b => b.id === 'colorful-creator')) {
      newBadges.push({ ...BADGE_DEFINITIONS[2], earnedAt: now });
    }

    if (newBadges.length !== state.badges.length) {
      set({ badges: newBadges });
    }
  },
}));
