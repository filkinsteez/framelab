import type { CanvasObject } from './konva-types';

export type Aspect = '16:9';

export type NextFramePresetKey =
  | 'continue'
  | 'push_camera_forward'
  | 'advance_time'
  | 'darker_lighting'
  | 'wider_composition';

export interface GenerationMeta {
  sourceFrameId: string;
  prompt: string;
  aspect: '16:9';
  strength?: number;
  seed?: string;
  createdAt: number;
  requestId?: string;
  resultUrl?: string;
  preset?: NextFramePresetKey;
}

export interface StoryboardFrame {
  id: string;
  frameNumber: number;           // Auto-assigned based on position
  customLabel?: string;           // Optional user name (max 30 chars)
  objects: CanvasObject[];
  thumbnail?: string;             // data URL or blob URL
  createdAt: number;
  generatedFromPrevious?: boolean;
  genMeta?: GenerationMeta;
}

export interface StoryboardState {
  aspect: Aspect;                 // Always '16:9' for now
  frames: StoryboardFrame[];
  activeFrameId: string | null;
}

