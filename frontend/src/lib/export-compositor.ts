import { Editor } from 'tldraw';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality?: number; // 0-1 for jpeg
  scale?: number; // Resolution multiplier (1 = canvas resolution, 2 = 2x, etc.)
  applyEffects?: boolean; // Apply GLSL effects to export
}

/**
 * Get canvas as data URI for AI generation
 */
export async function getCanvasAsDataUri(editor: Editor): Promise<string | null> {
  try {
    const shapes = editor.getCurrentPageShapes();
    
    if (shapes.length === 0) {
      return null;
    }

    const blob = await ExportCompositor.exportCanvas(editor, {
      format: 'png',
      scale: 1,
    });

    if (!blob) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to get canvas as data URI:', error);
    return null;
  }
}

/**
 * Export compositor - Flattens canvas to image
 */
export class ExportCompositor {
  /**
   * Export the current canvas to an image
   */
  static async exportCanvas(
    editor: Editor,
    options: ExportOptions = { format: 'png', scale: 1 }
  ): Promise<Blob | null> {
    try {
      // Get all shapes in view
      const shapes = editor.getCurrentPageShapes();
      
      if (shapes.length === 0) {
        console.warn('No shapes to export');
        return null;
      }

      // Calculate bounds
      const bounds = editor.getCurrentPageBounds();
      if (!bounds) {
        console.warn('Could not calculate bounds');
        return null;
      }

      // Use tldraw's built-in export
      const svgResult = await editor.getSvgElement(shapes, {
        scale: options.scale || 1,
        background: true,
      });

      if (!svgResult || !svgResult.svg) {
        throw new Error('Failed to generate SVG');
      }

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const scale = options.scale || 1;
      canvas.width = bounds.width * scale;
      canvas.height = bounds.height * scale;

      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert SVG to image and draw
      const svgBlob = new Blob([new XMLSerializer().serializeToString(svgResult.svg)], {
        type: 'image/svg+xml',
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
            options.quality || 0.95
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };

        img.src = url;
      });
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Download exported image
   */
  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export and download canvas
   */
  static async exportAndDownload(
    editor: Editor,
    options: ExportOptions = { format: 'png', scale: 2 }
  ) {
    const blob = await this.exportCanvas(editor, options);
    
    if (blob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = options.format === 'jpeg' ? 'jpg' : 'png';
      const filename = `framelab-export-${timestamp}.${extension}`;
      
      this.downloadBlob(blob, filename);
    }
  }
}

