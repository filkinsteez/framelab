import { useEffect } from 'react';
import { Editor } from 'tldraw';
import { ShaderManager } from '../lib/shader-manager';
import {
  fileToDataUri,
  isImageFile,
  isVideoFile,
  getImageDimensions,
  validateFileSize,
} from '../lib/file-utils';

interface UseDragAndDropOptions {
  editor: Editor | null;
  shaderManager: ShaderManager | null;
}

/**
 * Hook to handle drag and drop functionality on the canvas
 */
export function useDragAndDrop({ editor, shaderManager }: UseDragAndDropOptions) {
  useEffect(() => {
    if (!editor) return;

    const container = editor.getContainer();

    const handleDrop = async (e: DragEvent) => {
      // Check if this is an external file drop
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;
      
      const files = Array.from(dataTransfer.files || []);
      
      // No files = not a file drop, ignore
      if (files.length === 0) return;
      
      // We have actual files from outside - handle this drop
      e.preventDefault();
      e.stopPropagation();

      // Get drop position in canvas coordinates
      const point = editor.screenToPage({
        x: e.clientX,
        y: e.clientY,
      });

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Validate file size
          if (!validateFileSize(file)) {
            alert(`File ${file.name} is too large. Max size is 10MB.`);
            continue;
          }

          // Offset multiple files
          const offsetX = point.x + (i * 50);
          const offsetY = point.y + (i * 50);

          if (isImageFile(file)) {
            await handleImageDrop(editor, file, offsetX, offsetY, shaderManager);
          } else if (isVideoFile(file)) {
            await handleVideoDrop(editor, file, offsetX, offsetY);
          } else {
            console.warn(`Unsupported file type: ${file.type}`);
          }
        } catch (error) {
          console.error('Failed to handle dropped file:', error);
          alert(`Failed to load ${file.name}`);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      // Only prevent default if we're dragging files from outside
      const hasFiles = e.dataTransfer?.types?.includes('Files');
      
      if (hasFiles) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('drop', handleDrop as any);
    container.addEventListener('dragover', handleDragOver as any);

    return () => {
      container.removeEventListener('drop', handleDrop as any);
      container.removeEventListener('dragover', handleDragOver as any);
    };
  }, [editor, shaderManager]);
}

/**
 * Handle image file drop
 */
async function handleImageDrop(
  editor: Editor,
  file: File,
  x: number,
  y: number,
  shaderManager: ShaderManager | null
) {
  // Convert to data URI
  const dataUri = await fileToDataUri(file);
  
  // Get image dimensions
  const dimensions = await getImageDimensions(dataUri);
  
  // Scale to reasonable size (max 600px on longest side)
  const maxSize = 600;
  let width = dimensions.width;
  let height = dimensions.height;
  
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width *= scale;
    height *= scale;
  }

  // Create image shape
  editor.createShape({
    type: 'image-custom',
    x,
    y,
    props: {
      w: width,
      h: height,
      url: dataUri,
      assetId: null,
      generationParams: null,
    },
  });

  // Trigger ripple effect at drop position
  if (shaderManager) {
    const screenPoint = editor.pageToScreen({ x, y });
    shaderManager.triggerRipple(screenPoint.x, screenPoint.y);
  }
}

/**
 * Handle video file drop
 */
async function handleVideoDrop(
  editor: Editor,
  file: File,
  x: number,
  y: number
) {
  // Convert to data URI
  const dataUri = await fileToDataUri(file);

  // Create video shape with default dimensions
  editor.createShape({
    type: 'video-custom',
    x,
    y,
    props: {
      w: 640,
      h: 360,
      url: dataUri,
      assetId: null,
    },
  });
}

