import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Konva from 'konva';
import { KonvaCanvas } from './components/KonvaCanvas';
import { TopBar } from './components/TopBar';
import { ToolBelt } from './components/ToolBelt';
import { SettingsPanel } from './components/SettingsPanel';
import { PromptBoxModal } from './components/PromptBoxKonva';
import { GLBViewer } from './components/GLBViewer';
import { exportAndDownload, exportFrameAsDataUri } from './lib/konva-export';
import { FalClient } from './lib/fal-client';
import { useHistory } from './hooks/useHistory';
import type { CanvasObject, FrameMode, Tool } from './lib/konva-types';
import { FRAME_SPECS } from './lib/konva-types';

function AppKonva() {
  const [frameMode, setFrameMode] = useState<FrameMode>('PORTRAIT_9_16');
  
  // Use history hook for undo/redo support
  const {
    state: objects,
    setState: setObjects,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<CanvasObject[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [viewer3DPosition, setViewer3DPosition] = useState<{ x: number; y: number } | null>(null);
  const [viewer3DSize, setViewer3DSize] = useState<{ width: number; height: number } | null>(null);
  const [viewerIntrinsicSize, setViewerIntrinsicSize] = useState<{ width: number; height: number } | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const threejsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Calculate frame position (must match KonvaCanvas calculation)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const frameX = viewportWidth / 2 - frameW / 2;
  const frameY = viewportHeight / 2 - frameH / 2;

  const captureSnapshot = useCallback(() => {
    if (!activeModelId || !threejsCanvasRef.current) return null;
    
    // The Three.js canvas is already rendered at intrinsic dimensions
    // Just capture it directly
    try {
      return threejsCanvasRef.current.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      return null;
    }
  }, [activeModelId]);

  const handleCloseViewer = useCallback(() => {
    // Capture snapshot from Three.js canvas and update image
    if (activeModelId) {
      const snapshot = captureSnapshot();
      if (snapshot) {
        setObjects(prev => prev.map(obj =>
          obj.id === activeModelId && obj.type === 'image'
            ? { ...obj, src: snapshot, transform: { ...obj.transform, opacity: 1 } }
            : obj
        ));
      } else {
        // Restore opacity even if snapshot fails
        setObjects(prev => prev.map(obj =>
          obj.id === activeModelId && obj.type === 'image'
            ? { ...obj, transform: { ...obj.transform, opacity: 1 } }
            : obj
        ));
      }
    }

    setShow3DViewer(false);
    setModelUrl(null);
    setActiveModelId(null);
    setViewer3DPosition(null);
    setViewer3DSize(null);
    setViewerIntrinsicSize(null);
  }, [activeModelId, captureSnapshot, setObjects]);

  const updateOverlayPosition = useCallback((objectId: string) => {
    if (!stageRef.current) return;
    const imageNode = stageRef.current.findOne(`#${objectId}`);
    const imageObject = objects.find(obj => obj.id === objectId && obj.type === 'image') as CanvasObject | undefined;
    if (!imageNode || !imageObject || imageObject.type !== 'image') return;

    const absTransform = imageNode.getAbsoluteTransform();
    const absPos = absTransform.point({ x: 0, y: 0 });
    const absScale = imageNode.getAbsoluteScale();

    setViewer3DPosition({ x: absPos.x, y: absPos.y + 60 });
    setViewer3DSize({ width: imageObject.w * absScale.x, height: imageObject.h * absScale.y });
    setViewerIntrinsicSize({ width: imageObject.w, height: imageObject.h });
  }, [objects]);

  useEffect(() => {
    if (show3DViewer && activeModelId) {
      updateOverlayPosition(activeModelId);
    }
  }, [show3DViewer, activeModelId, updateOverlayPosition, objects]);

  useEffect(() => {
    if (!activeModelId) return;
    const exists = objects.some(obj => obj.id === activeModelId && obj.type === 'image' && obj.model3D);
    if (!exists) {
      setShow3DViewer(false);
      setModelUrl(null);
      setActiveModelId(null);
      setViewer3DPosition(null);
      setViewer3DSize(null);
      setViewerIntrinsicSize(null);
    }
  }, [activeModelId, objects]);

  const selectedObject = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return objects.find(obj => obj.id === selectedIds[0]) || null;
  }, [selectedIds, objects]);

  const hasImageSelected = selectedObject?.type === 'image';
  const has3DModelSelected = selectedObject?.type === 'image' && !!selectedObject.model3D;

  const open3DViewerForSelected = useCallback(() => {
    if (!selectedObject || selectedObject.type !== 'image' || !selectedObject.model3D) return;
    
    // Hide the underlying image
    setObjects(prev => prev.map(obj =>
      obj.id === selectedObject.id
        ? { ...obj, transform: { ...obj.transform, opacity: 0 } }
        : obj
    ));
    
    setActiveModelId(selectedObject.id);
    setModelUrl(selectedObject.model3D.modelUrl);
    updateOverlayPosition(selectedObject.id);
    setShow3DViewer(true);
  }, [selectedObject, updateOverlayPosition, setObjects]);

  const handleSave = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      // Capture 3D snapshot and close viewer before export
      const wasViewerOpen = show3DViewer;
      const currentModelId = activeModelId;
      
      if (wasViewerOpen && currentModelId) {
        const snapshot = captureSnapshot();
        if (snapshot) {
          setObjects(prev => prev.map(obj =>
            obj.id === currentModelId && obj.type === 'image'
              ? { ...obj, src: snapshot, transform: { ...obj.transform, opacity: 1 } }
              : obj
          ));
        }
        setShow3DViewer(false);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Saving as JPEG with frame position:', { frameX, frameY, frameW, frameH });
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY, 'jpeg');
      
      // Reopen if it was open
      if (wasViewerOpen && currentModelId) {
        setObjects(prev => prev.map(obj =>
          obj.id === currentModelId && obj.type === 'image'
            ? { ...obj, transform: { ...obj.transform, opacity: 0 } }
            : obj
        ));
        updateOverlayPosition(currentModelId);
        setShow3DViewer(true);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed. Check console for details.');
    }
  };

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id)));
      setSelectedIds([]);
    }
  };

  // Keyboard shortcut for Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleDelete]);

  const handleFrameChange = (mode: FrameMode) => {
    if (objects.length > 0) {
      const confirm = window.confirm(
        'Changing frame size may affect your composition. Continue?'
      );
      if (!confirm) return;
    }
    setFrameMode(mode);
  };

  const handleConvertTo3D = async () => {
    if (!selectedObject || selectedObject.type !== 'image') {
      alert('Please select an image to convert to 3D');
      return;
    }

    setIsConverting(true);

    try {
      console.log('Converting image to 3D...');
      console.log('Image source:', selectedObject.src);
      
      const result = await FalClient.convertTo3D({
        imageUrl: selectedObject.src,
      });

      console.log('3D conversion result:', result);

      if (result.success && result.data) {
        console.log('3D conversion data:', result.data);
        
        // Check if we have a model URL
        const modelUrl = result.data.model_mesh?.url || result.data.pbr_model?.url || result.data.base_model?.url;
        
        if (modelUrl) {
          console.log('3D conversion successful! Model URL:', modelUrl);

          const img = selectedObject as any;

          // Persist metadata and hide the image
          setObjects(prev => prev.map(obj => obj.id === img.id ? {
            ...obj,
            model3D: { modelUrl },
            transform: { ...obj.transform, opacity: 0 }
          } : obj));

          setActiveModelId(img.id);
          setModelUrl(modelUrl);
          updateOverlayPosition(img.id);
          setShow3DViewer(true);
          setSelectedIds([img.id]);
        } else {
          console.error('No model URL found in response:', result.data);
          alert('3D conversion succeeded but no model file was returned. Please try again.');
        }
      } else {
        console.error('3D conversion failed:', result);
        alert(`3D conversion failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('3D conversion failed:', error);
      alert(`3D conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };


  const handleOpenPrompt = () => {
    console.log('Opening prompt dialog');
    setShowPromptDialog(true);
  };

  const handlePromptGenerate = async (prompt: string) => {
    console.log('handlePromptGenerate called with:', prompt);
    console.log('stageRef.current:', stageRef.current);
    
    if (!stageRef.current) {
      console.error('Stage ref is null!');
      alert('Canvas not ready. Please wait a moment and try again.');
      return;
    }

    setIsGenerating(true);
    setShowPromptDialog(false);

    try {
      // Flatten canvas
      console.log('Flattening canvas for AI generation...');
      console.log('Frame position:', { frameX, frameY, frameW, frameH });
      console.log('Objects on canvas:', objects.map(obj => ({
        id: obj.id,
        type: obj.type,
        transform: obj.transform,
        w: 'w' in obj ? obj.w : undefined,
        h: 'h' in obj ? obj.h : undefined,
      })));
      
      // Capture 3D snapshot and close viewer before export
      const wasViewerOpen = show3DViewer;
      const currentModelId = activeModelId;
      
      if (wasViewerOpen && currentModelId) {
        const snapshot = captureSnapshot();
        if (snapshot) {
          setObjects(prev => prev.map(obj =>
            obj.id === currentModelId && obj.type === 'image'
              ? { ...obj, src: snapshot, transform: { ...obj.transform, opacity: 1 } }
              : obj
          ));
        }
        setShow3DViewer(false);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const canvasDataUri = await exportFrameAsDataUri(
        stageRef as any,
        frameMode,
        frameX,
        frameY
      );

      // Reopen if it was open
      if (wasViewerOpen && currentModelId) {
        setObjects(prev => prev.map(obj =>
          obj.id === currentModelId && obj.type === 'image'
            ? { ...obj, transform: { ...obj.transform, opacity: 0 } }
            : obj
        ));
        updateOverlayPosition(currentModelId);
        setShow3DViewer(true);
      }
      
      console.log('Canvas data URI created, length:', canvasDataUri?.length || 0);

      const aspectRatio = frameMode === 'PORTRAIT_9_16' ? '9:16' : '16:9';

      console.log('Sending to FAL with aspect ratio:', aspectRatio);

      const result = await FalClient.generate({
        prompt,
        imageUrl: canvasDataUri || undefined,
        strength: canvasDataUri ? 0.75 : undefined,
        aspectRatio,
        numImages: 1, // Just one image
      });

      if (result.success && result.data && result.data.images.length > 0) {
        console.log('Generation successful!', result.data);
        
        const imgData = result.data.images[0];
        
        // Load the image to get actual dimensions since API doesn't return them
        const img = new Image();
        img.onload = () => {
          console.log('Loaded image actual dimensions:', {
            url: imgData.url.substring(0, 50) + '...',
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
          });
          
          console.log('Frame:', {
            width: frameW,
            height: frameH,
            aspectRatio: (frameW / frameH).toFixed(3),
          });
          
          // Just render at frame size - Konva will scale the image to fit
          const newImage: CanvasObject = {
            id: `img_${Date.now()}`,
            type: 'image',
            src: imgData.url,
            w: frameW,  // Render at frame size
            h: frameH,
            transform: {
              x: 0,
              y: 0,
              scale: 1,
              rotation: 0,
              opacity: 1,
              zIndex: Date.now(),
            },
            generationParams: {
              prompt,
              seed: result.data.seed,
              timestamp: Date.now(),
            },
          };
          
          console.log('Created image to fill frame:', {
            imageUrl: imgData.url,
            naturalSize: { w: img.naturalWidth, h: img.naturalHeight },
            renderSize: { w: frameW, h: frameH },
            scale: 1,
            position: { x: 0, y: 0 },
          });

          // REPLACE entire canvas with just this one image
          console.log('CLEARING canvas and replacing with single generated image');
          setObjects([newImage]);
        };
        
        img.onerror = () => {
          console.error('Failed to load generated image');
          alert('Failed to load generated image');
        };
        
        img.src = imgData.url;
      } else {
        console.error('Generation failed or no data:', result);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        frameMode={frameMode}
        onChangeFrame={handleFrameChange}
        onOpenPrompt={handleOpenPrompt}
      />

      <div style={{ marginTop: '60px', width: '100%', height: 'calc(100vh - 60px)' }}>
        <KonvaCanvas
          frameMode={frameMode}
          objects={objects}
          setObjects={setObjects}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          currentTool={currentTool}
          stageRef={stageRef as any}
        />
      </div>

      <ToolBelt
        currentTool={currentTool}
        onChangeTool={setCurrentTool}
        onUndo={undo}
        onRedo={redo}
        onDelete={handleDelete}
        onSave={handleSave}
        onConvertTo3D={handleConvertTo3D}
        onOpen3DViewer={open3DViewerForSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedIds.length > 0}
        hasImageSelected={hasImageSelected}
        has3DModelSelected={has3DModelSelected}
      />

      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} />

      {/* Prompt Dialog - Centered on screen */}
      {showPromptDialog && (
        <>
          {console.log('Rendering prompt dialog modal')}
          <PromptBoxModal
            object={{
              id: 'temp',
              type: 'promptbox',
              w: 400,
              h: 200,
              prompt: '',
              isGenerating,
              transform: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1,
                zIndex: 0,
              },
            }}
            screenX={window.innerWidth / 2 - 200}
            screenY={200}
            onClose={() => {
              console.log('Closing prompt dialog');
              setShowPromptDialog(false);
            }}
            onGenerate={(prompt) => {
              console.log('Generate called with prompt:', prompt);
              handlePromptGenerate(prompt);
            }}
          />
        </>
      )}

      {/* Loading overlay during generation */}
      {isGenerating && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px 48px',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              Generating Images...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              This may take 15-30 seconds
            </div>
            <div
              style={{
                marginTop: '16px',
                width: '200px',
                height: '4px',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  animation: 'loading 1.5s infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay during 3D conversion */}
      {isConverting && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px 48px',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              Converting to 3D...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              This may take 1-2 minutes
            </div>
            <div
              style={{
                marginTop: '16px',
                width: '200px',
                height: '4px',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#2196F3',
                  animation: 'loading 1.5s infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3D Model Viewer Overlay */}
      <GLBViewer
        modelUrl={modelUrl}
        visible={show3DViewer}
        onClose={handleCloseViewer}
        position={viewer3DPosition || undefined}
        size={viewer3DSize || undefined}
        intrinsicSize={viewerIntrinsicSize || undefined}
        onCanvasReady={(canvas) => {
          threejsCanvasRef.current = canvas;
        }}
      />

    </div>
  );
}

export default AppKonva;

