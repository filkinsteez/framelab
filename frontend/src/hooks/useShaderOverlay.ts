import { useEffect, useRef } from 'react';
import { Editor } from 'tldraw';
import { ShaderManager } from '../lib/shader-manager';

/**
 * Hook to manage WebGL shader overlay synchronized with tldraw editor
 */
export function useShaderOverlay(editor: Editor | null) {
  const shaderManagerRef = useRef<ShaderManager | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    // Create overlay canvas
    const container = editor.getContainer();
    const overlayCanvas = document.createElement('canvas');
    
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.width = '100%';
    overlayCanvas.style.height = '100%';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '1000';

    container.appendChild(overlayCanvas);
    overlayCanvasRef.current = overlayCanvas;

    // Initialize shader manager
    try {
      const shaderManager = new ShaderManager(overlayCanvas);
      shaderManagerRef.current = shaderManager;

      // Sync canvas size with container
      const resizeObserver = new ResizeObserver(() => {
        const rect = container.getBoundingClientRect();
        shaderManager.resize(rect.width, rect.height);
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        shaderManager.destroy();
        overlayCanvas.remove();
      };
    } catch (error) {
      console.error('Failed to initialize shader manager:', error);
      overlayCanvas.remove();
    }
  }, [editor]);

  return shaderManagerRef.current;
}

