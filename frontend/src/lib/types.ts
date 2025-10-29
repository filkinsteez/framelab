import type { TLBaseShape, TLDefaultColorStyle } from 'tldraw';

// ===== Generation Parameters =====

export interface GenerationParams {
  prompt: string;
  strength?: number;
  guidanceScale?: number;
  seed?: number;
  timestamp: number;
}

// ===== Custom Shape Types =====

export interface ImageShapeProps {
  w: number;
  h: number;
  url: string;
  assetId?: string;
  generationParams?: GenerationParams;
}

export type ImageShape = TLBaseShape<'image-custom', ImageShapeProps>;

export interface VideoShapeProps {
  w: number;
  h: number;
  url: string;
  assetId?: string;
}

export type VideoShape = TLBaseShape<'video-custom', VideoShapeProps>;

export interface PromptBoxShapeProps {
  w: number;
  h: number;
  prompt: string;
  isGenerating: boolean;
  progress?: number;
  color: TLDefaultColorStyle;
}

export type PromptBoxShape = TLBaseShape<'prompt-box', PromptBoxShapeProps>;

export interface GalleryShapeProps {
  w: number;
  h: number;
  images: Array<{
    url: string;
    seed: number;
    selected?: boolean;
  }>;
  columns: number;
}

export type GalleryShape = TLBaseShape<'gallery', GalleryShapeProps>;

// ===== API Types =====

export interface GenerateRequest {
  prompt: string;
  imageUrl?: string;
  strength?: number;
  guidanceScale?: number;
  numImages?: number;
}

export interface GenerateResponse {
  success: boolean;
  data?: {
    images: Array<{
      url: string;
      width: number;
      height: number;
      contentType: string;
    }>;
    seed: number;
    prompt: string;
  };
  error?: string;
}

// ===== Canvas Document =====

export interface CanvasDocument {
  id: string;
  shapes: any[];
  viewport: {
    x: number;
    y: number;
    z: number; // zoom level
  };
  createdAt: number;
  updatedAt: number;
}

