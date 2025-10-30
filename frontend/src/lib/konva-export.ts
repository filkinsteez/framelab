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
  
  console.log('exportFrame called');
  console.log('Stage:', stage);
  console.log('Frame mode:', frameMode);
  console.log('Export bounds:', { x: frameX, y: frameY });
  
  if (!stage) {
    console.error('Stage is null');
    return null;
  }

  const { w, h } = FRAME_SPECS[frameMode];
  
  console.log('Frame dimensions:', { w, h });

  try {
    // Use Konva's built-in export with pixel-perfect frame bounds
    console.log('Calling stage.toDataURL with:', {
      x: frameX,
      y: frameY,
      width: w,
      height: h,
      pixelRatio: 1,
      mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });
    
    const dataURL = stage.toDataURL({
      x: frameX,
      y: frameY,
      width: w,
      height: h,
      pixelRatio: 1, // Export at actual frame resolution
      mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality: format === 'jpeg' ? 0.95 : 1,
    });

    console.log('DataURL length:', dataURL.length);

    // Convert data URL to Blob
    const response = await fetch(dataURL);
    const blob = await response.blob();
    
    console.log('Blob created, size:', blob.size, 'bytes');

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
  
  console.log('exportFrameAsDataUri called');
  console.log('Stage:', stage);
  console.log('Frame bounds:', { x: frameX, y: frameY, w: FRAME_SPECS[frameMode].w, h: FRAME_SPECS[frameMode].h });
  
  if (!stage) {
    console.error('Stage is null, cannot export');
    return null;
  }

  const { w, h } = FRAME_SPECS[frameMode];

  try {
    console.log('Calling stage.toDataURL with bounds:', { x: frameX, y: frameY, width: w, height: h });
    const dataURL = stage.toDataURL({
      x: frameX,
      y: frameY,
      width: w,
      height: h,
      pixelRatio: 1,
      mimeType: 'image/png',
    });

    console.log('Data URL created, length:', dataURL.length);
    console.log('Data URL starts with:', dataURL.substring(0, 50));
    
    // Verify it's a valid image by checking the header
    if (!dataURL.startsWith('data:image/png')) {
      console.error('Invalid data URL format!');
      return null;
    }

    // Verify the exported dimensions by creating an image
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log('Exported canvas dimensions:', {
          width: img.width,
          height: img.height,
          aspectRatio: (img.width / img.height).toFixed(2),
          expected: { width: w, height: h, aspectRatio: (w / h).toFixed(2) }
        });
        resolve(dataURL);
      };
      img.onerror = () => {
        console.error('Failed to verify exported image');
        resolve(dataURL);
      };
      img.src = dataURL;
    });
  } catch (error) {
    console.error('Failed to export frame as data URI:', error);
    return null;
  }
}

