import { Tldraw, Editor, type TLShapeUtilConstructor } from 'tldraw';
import { useCallback, useRef } from 'react';
import 'tldraw/tldraw.css';

import { ImageShapeUtil } from '../shapes/ImageShape';
import { VideoShapeUtil } from '../shapes/VideoShape';
import { PromptBoxShapeUtil } from '../shapes/PromptBoxShape';
import { GalleryShapeUtil } from '../shapes/GalleryShape';
import { useShaderOverlay } from '../hooks/useShaderOverlay';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

// Register custom shapes
const customShapeUtils: TLShapeUtilConstructor<any>[] = [
  ImageShapeUtil,
  VideoShapeUtil,
  PromptBoxShapeUtil,
  GalleryShapeUtil,
];

interface CanvasProps {
  onEditorMount?: (editor: Editor) => void;
}

export function Canvas({ onEditorMount }: CanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  
  // Initialize shader overlay
  const shaderManager = useShaderOverlay(editorRef.current);
  
  // Handle drag and drop
  useDragAndDrop({ editor: editorRef.current, shaderManager });

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    onEditorMount?.(editor);
  }, [onEditorMount]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={handleMount}
        autoFocus
      />
    </div>
  );
}

