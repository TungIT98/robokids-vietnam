/**
 * Whiteboard Store - Collaborative whiteboard state management
 * Manages drawing elements, tool selection, and collaboration state
 */

import { create } from 'zustand';

export type DrawingTool = 'pen' | 'highlighter' | 'eraser' | 'shapes' | 'text' | 'select';
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';
export type StrokeStyle = 'solid' | 'dashed';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'path' | 'shape' | 'text' | 'image';
  tool: DrawingTool;
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType?: ShapeType;
  text?: string;
  fontSize?: number;
  createdBy: string;
  createdAt: string;
  // For shapes
  startPoint?: Point;
  endPoint?: Point;
  // Bounds for hit testing
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: Point | null;
  isActive: boolean;
}

export interface WhiteboardSession {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  collaborators: Collaborator[];
  isHost: boolean;
}

export interface WhiteboardState {
  // Session
  session: WhiteboardSession | null;
  sessionId: string | null;

  // Canvas elements
  elements: DrawingElement[];
  selectedElementId: string | null;

  // Tool settings
  currentTool: DrawingTool;
  currentColor: string;
  strokeWidth: number;
  opacity: number;
  shapeType: ShapeType;
  strokeStyle: StrokeStyle;

  // Font settings for text tool
  fontSize: number;
  fontFamily: string;

  // View settings
  canvasSize: { width: number; height: number };
  zoom: number;
  panOffset: Point;

  // Collaboration
  collaborators: Collaborator[];
  isConnected: boolean;

  // Undo/Redo
  history: DrawingElement[][];
  historyIndex: number;

  // Actions
  setSession: (session: WhiteboardSession | null) => void;
  setSessionId: (id: string | null) => void;

  // Element actions
  addElement: (element: DrawingElement) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  deleteElement: (id: string) => void;
  clearCanvas: () => void;
  setSelectedElement: (id: string | null) => void;

  // Tool actions
  setTool: (tool: DrawingTool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setShapeType: (shape: ShapeType) => void;
  setStrokeStyle: (style: StrokeStyle) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;

  // View actions
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;

  // Collaboration actions
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorCursor: (id: string, cursor: Point | null) => void;
  setIsConnected: (connected: boolean) => void;

  // History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Reset
  resetWhiteboard: () => void;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const initialState = {
  session: null,
  sessionId: null,
  elements: [],
  selectedElementId: null,
  currentTool: 'pen' as DrawingTool,
  currentColor: COLORS[0],
  strokeWidth: 3,
  opacity: 1,
  shapeType: 'rectangle' as ShapeType,
  strokeStyle: 'solid' as StrokeStyle,
  fontSize: 16,
  fontFamily: 'Arial',
  canvasSize: { width: 1920, height: 1080 },
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  collaborators: [],
  isConnected: false,
  history: [[]],
  historyIndex: 0,
};

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  ...initialState,

  setSession: (session) => set({ session }),
  setSessionId: (id) => set({ sessionId: id }),

  addElement: (element) => {
    const { elements, pushHistory } = get();
    pushHistory();
    set({ elements: [...elements, element] });
  },

  updateElement: (id, updates) => {
    const { elements } = get();
    set({
      elements: elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    });
  },

  deleteElement: (id) => {
    const { elements, pushHistory } = get();
    pushHistory();
    set({ elements: elements.filter(el => el.id !== id) });
  },

  clearCanvas: () => {
    const { pushHistory } = get();
    pushHistory();
    set({ elements: [] });
  },

  setSelectedElement: (id) => set({ selectedElementId: id }),

  setTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity: opacity }),
  setShapeType: (shape) => set({ shapeType: shape }),
  setStrokeStyle: (style) => set({ strokeStyle: style }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),

  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),

  addCollaborator: (collaborator) => {
    const { collaborators } = get();
    set({ collaborators: [...collaborators.filter(c => c.id !== collaborator.id), collaborator] });
  },

  removeCollaborator: (id) => {
    const { collaborators } = get();
    set({ collaborators: collaborators.filter(c => c.id !== id) });
  },

  updateCollaboratorCursor: (id, cursor) => {
    const { collaborators } = get();
    set({
      collaborators: collaborators.map(c =>
        c.id === id ? { ...c, cursor } : c
      ),
    });
  },

  setIsConnected: (connected) => set({ isConnected: connected }),

  pushHistory: () => {
    const { history, historyIndex, elements } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    set({
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49),
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        elements: [...history[historyIndex - 1]],
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        elements: [...history[historyIndex + 1]],
        historyIndex: historyIndex + 1,
      });
    }
  },

  resetWhiteboard: () => set(initialState),
}));

// Export colors for UI
export const WHITEBOARD_COLORS = COLORS;