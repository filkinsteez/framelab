import type { CanvasObject } from './konva-types';
import type { StoryboardFrame } from './storyboard-types';

const W = 1920;
const H = 1080;

// Image bitmap cache for performance
const imageCache = new Map<string, ImageBitmap>();

/**
 * Get or fetch image bitmap with caching
 */
async function getBitmap(src: string): Promise<ImageBitmap> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  
  try {
    const res = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    imageCache.set(src, bmp);
    return bmp;
  } catch (error) {
    console.error('Failed to load image bitmap:', src, error);
    throw error;
  }
}

/**
 * Draw non-image objects (shapes, text, brush, arrow)
 */
function drawObject(ctx: OffscreenCanvasRenderingContext2D, o: CanvasObject) {
  const { x, y, scale, rotation, opacity } = o.transform;
  
  ctx.save();
  ctx.globalAlpha = opacity ?? 1;
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);

  switch (o.type) {
    case 'rect':
      if ('w' in o && 'h' in o) {
        ctx.fillStyle = o.fill || '#000';
        ctx.strokeStyle = o.stroke || '#000';
        ctx.lineWidth = o.strokeWidth || 0;
        ctx.beginPath();
        ctx.rect(0, 0, o.w, o.h);
        ctx.fill();
        if (o.strokeWidth) ctx.stroke();
      }
      break;

    case 'circle':
      if ('w' in o && 'h' in o) {
        const r = Math.min(o.w, o.h) / 2;
        ctx.fillStyle = o.fill || '#000';
        ctx.strokeStyle = o.stroke || '#000';
        ctx.lineWidth = o.strokeWidth || 0;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        if (o.strokeWidth) ctx.stroke();
      }
      break;

    case 'triangle':
      if ('w' in o && 'h' in o) {
        ctx.fillStyle = o.fill || '#000';
        ctx.strokeStyle = o.stroke || '#000';
        ctx.lineWidth = o.strokeWidth || 0;
        ctx.beginPath();
        ctx.moveTo(o.w / 2, 0);
        ctx.lineTo(o.w, o.h);
        ctx.lineTo(0, o.h);
        ctx.closePath();
        ctx.fill();
        if (o.strokeWidth) ctx.stroke();
      }
      break;

    case 'text':
      if ('text' in o) {
        ctx.fillStyle = o.color || '#000';
        ctx.font = `${o.fontSize || 16}px ${o.fontFamily || 'Arial'}`;
        ctx.textAlign = (o.align as CanvasTextAlign) || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(o.text, 0, 0);
      }
      break;

    case 'brush':
      if ('points' in o && o.points.length > 0) {
        ctx.strokeStyle = o.color || '#000';
        ctx.lineWidth = o.size || 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = (opacity ?? 1) * (o.opacity ?? 1);
        
        ctx.beginPath();
        ctx.moveTo(o.points[0], o.points[1]);
        for (let i = 2; i < o.points.length; i += 2) {
          ctx.lineTo(o.points[i], o.points[i + 1]);
        }
        ctx.stroke();
      }
      break;

    case 'arrow':
      if ('points' in o && o.points.length === 4) {
        const [x1, y1, x2, y2] = o.points;
        const strokeWidth = o.strokeWidth || 2;
        ctx.strokeStyle = o.color || '#000';
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 25;
        
        const point1X = x2 - headLength * Math.cos(angle - Math.PI / 6);
        const point1Y = y2 - headLength * Math.sin(angle - Math.PI / 6);
        const point2X = x2 - headLength * Math.cos(angle + Math.PI / 6);
        const point2Y = y2 - headLength * Math.sin(angle + Math.PI / 6);
        
        ctx.beginPath();
        ctx.moveTo(point1X, point1Y);
        ctx.lineTo(x2, y2);
        ctx.lineTo(point2X, point2Y);
        ctx.stroke();
      }
      break;
  }
  
  ctx.restore();
}

/**
 * Draw image object
 */
async function drawImageObj(
  ctx: OffscreenCanvasRenderingContext2D,
  o: Extract<CanvasObject, {type: 'image'}>
) {
  const bmp = await getBitmap(o.src);
  const { x, y, scale, rotation, opacity } = o.transform;
  
  ctx.save();
  ctx.globalAlpha = opacity ?? 1;
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(bmp, 0, 0, o.w, o.h);
  ctx.restore();
}

/**
 * Render frame to ImageBitmap (for thumbnails)
 */
export async function renderFrameBitmap(frame: StoryboardFrame): Promise<ImageBitmap> {
  const off = new OffscreenCanvas(W, H);
  const ctx = off.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Failed to get 2d context');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Sort by zIndex (or array order if zIndex not used)
  const objs = [...frame.objects].sort((a, b) => 
    (a.transform.zIndex || 0) - (b.transform.zIndex || 0)
  );

  // Draw all objects
  for (const o of objs) {
    if (o.type === 'image') {
      await drawImageObj(ctx, o);
    } else {
      drawObject(ctx, o);
    }
  }

  return off.transferToImageBitmap();
}

/**
 * Render frame to Blob (for export/upload)
 */
export async function renderFrameBlob(
  frame: StoryboardFrame,
  type: 'image/png' | 'image/webp' = 'image/png'
): Promise<Blob> {
  const off = new OffscreenCanvas(W, H);
  const ctx = off.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Failed to get 2d context');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Sort by zIndex
  const objs = [...frame.objects].sort((a, b) => 
    (a.transform.zIndex || 0) - (b.transform.zIndex || 0)
  );

  // Draw all objects
  for (const o of objs) {
    if (o.type === 'image') {
      await drawImageObj(ctx, o);
    } else {
      drawObject(ctx, o);
    }
  }

  // @ts-ignore - convertToBlob exists on OffscreenCanvas
  return off.convertToBlob({ type, quality: 0.95 });
}

/**
 * Clear image cache (call when cleaning up)
 */
export function clearImageCache() {
  imageCache.clear();
}

