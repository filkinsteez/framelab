import type { CanvasObject } from './konva-types';
import { generateId, createDefaultTransform } from './konva-types';
import { fileToDataUri, isImageFile, getImageDimensions, validateFileSize } from './file-utils';

/**
 * Handle file drops for Konva canvas
 */
export async function handleFileDrop(
  files: File[],
  dropX: number,
  dropY: number,
  setObjects: React.Dispatch<React.SetStateAction<CanvasObject[]>>,
  frameW: number,
  frameH: number
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      if (!validateFileSize(file)) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      if (isImageFile(file)) {
        await handleImageDrop(file, dropX + i * 50, dropY + i * 50, setObjects, frameW, frameH);
      }
    } catch (error) {
      console.error('Failed to handle file:', error);
      alert(`Failed to load ${file.name}`);
    }
  }
}

/**
 * Handle image file drop
 */
async function handleImageDrop(
  file: File,
  x: number,
  y: number,
  setObjects: React.Dispatch<React.SetStateAction<CanvasObject[]>>,
  frameW: number,
  frameH: number
): Promise<void> {
  const dataUri = await fileToDataUri(file);
  const dimensions = await getImageDimensions(dataUri);

  // Scale to fit within frame if too large
  let width = dimensions.width;
  let height = dimensions.height;

  const maxSize = Math.min(frameW * 0.8, frameH * 0.8);
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width *= scale;
    height *= scale;
  }

  // Ensure image is within frame bounds
  const clampedX = Math.max(0, Math.min(x, frameW - width));
  const clampedY = Math.max(0, Math.min(y, frameH - height));

  const newObject: CanvasObject = {
    id: generateId(),
    type: 'image',
    src: dataUri,
    w: width,
    h: height,
    transform: {
      ...createDefaultTransform(),
      x: clampedX,
      y: clampedY,
      zIndex: Date.now(), // Use timestamp for auto-incrementing zIndex
    },
  };

  setObjects(prev => [...prev, newObject]);
}

