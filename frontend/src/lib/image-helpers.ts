/**
 * Load image with CORS enabled to prevent tainted canvas
 * All images must use this helper to ensure exports work correctly
 */
export function loadImageCORS(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Create ImageBitmap from URL with CORS support
 */
export async function createImageBitmapCORS(src: string): Promise<ImageBitmap> {
  const response = await fetch(src, { 
    mode: 'cors', 
    cache: 'force-cache',
    credentials: 'omit'
  });
  const blob = await response.blob();
  return createImageBitmap(blob);
}

