// ===== Frame Configuration =====

export type FrameMode = 'PORTRAIT_9_16' | 'LANDSCAPE_16_9';

export const FRAME_SPECS = {
  PORTRAIT_9_16: { w: 1080, h: 1920 },
  LANDSCAPE_16_9: { w: 1920, h: 1080 },
} as const;

// ===== Transform =====

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

// ===== Canvas Objects =====

export interface ImageObject {
  id: string;
  type: 'image';
  src: string;
  w: number;
  h: number;
  transform: Transform;
  generationParams?: {
    prompt: string;
    seed?: number;
    timestamp: number;
  };
  model3D?: {
    modelUrl: string;
  };
}

export interface ShapeObject {
  id: string;
  type: 'rect' | 'circle' | 'triangle';
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  transform: Transform;
}

export interface BrushStroke {
  id: string;
  type: 'brush';
  points: number[]; // Flattened array [x1, y1, x2, y2, ...]
  color: string;
  size: number;
  opacity: number;
  transform: Transform;
}

export interface ArrowObject {
  id: string;
  type: 'arrow';
  points: number[]; // [x1, y1, x2, y2] - start and end points
  color: string;
  strokeWidth: number;
  transform: Transform;
}

export interface TextObject {
  id: string;
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  transform: Transform;
}

export interface PromptBoxObject {
  id: string;
  type: 'promptbox';
  w: number;
  h: number;
  prompt: string;
  isGenerating: boolean;
  transform: Transform;
}

export interface GalleryObject {
  id: string;
  type: 'gallery';
  w: number;
  h: number;
  images: Array<{
    url: string;
    seed: number;
  }>;
  columns: number;
  transform: Transform;
}

export interface Model3DObject {
  id: string;
  type: 'model3d';
  modelUrl: string;
  w: number;
  h: number;
  transform: Transform;
}

export type CanvasObject = ImageObject | ShapeObject | BrushStroke | ArrowObject | TextObject | PromptBoxObject | GalleryObject | Model3DObject;

// ===== Viewport State =====

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

// ===== Tool State =====

export type Tool = 
  | 'select'
  | 'brush'
  | 'arrow'
  | 'triangle'
  | 'text'
  | 'prompt';

export interface ToolState {
  currentTool: Tool;
  brushColor: string;
  brushSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
}

// ===== Canvas Document =====

export interface KonvaCanvasDocument {
  id: string;
  frameMode: FrameMode;
  objects: CanvasObject[];
  viewport: ViewportState;
  createdAt: number;
  updatedAt: number;
}

// ===== Helper Functions =====

export function createDefaultTransform(): Transform {
  return {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
  };
}

export function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function sortByZIndex(objects: CanvasObject[]): CanvasObject[] {
  return [...objects].sort((a, b) => a.transform.zIndex - b.transform.zIndex);
}

