import Konva from 'konva';
import type { FrameMode } from './konva-types';
import { FRAME_SPECS } from './konva-types';

/**
 * Export the frame as PNG or JPEG
 */
export async function exportFrame(
  stageRef: React.RefObject<Konva.Stage>,
  frameMode: FrameMode,
  frameX: number,
  frameY: number,
  format: 'png' | 'jpeg' = 'png'
): Promise<Blob | null> {
  const stage = stageRef.current;
  if (!stage) return null;

  const { w, h } = FRAME_SPECS[frameMode];

  try {
    // Use Konva's built-in export with pixel-perfect frame bounds
    const dataURL = stage.toDataURL({
      x: frameX,
      y: frameY,
      width: w,
      height: h,
      pixelRatio: 1, // Export at actual frame resolution
      mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality: format === 'jpeg' ? 0.95 : 1,
    });

    // Convert data URL to Blob
    const response = await fetch(dataURL);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Export and download the frame
 */
export async function exportAndDownload(
  stageRef: React.RefObject<Konva.Stage>,
  frameMode: FrameMode,
  frameX: number,
  frameY: number,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const blob = await exportFrame(stageRef, frameMode, frameX, frameY, format);

  if (!blob) {
    throw new Error('Export failed');
  }

  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  const frameName = frameMode === 'PORTRAIT_9_16' ? '9-16' : '16-9';
  
  a.href = url;
  a.download = `framelab-${frameName}-${timestamp}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export frame as data URI for AI generation
 */
export async function exportFrameAsDataUri(
  stageRef: React.RefObject<Konva.Stage>,
  frameMode: FrameMode,
  frameX: number,
  frameY: number
): Promise<string | null> {
  const stage = stageRef.current;
  if (!stage) return null;

  const { w, h } = FRAME_SPECS[frameMode];

  try {
    const dataURL = stage.toDataURL({
      x: frameX,
      y: frameY,
      width: w,
      height: h,
      pixelRatio: 1,
      mimeType: 'image/png',
    });

    return dataURL;
  } catch (error) {
    console.error('Failed to export frame as data URI:', error);
    return null;
  }
}

