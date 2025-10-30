import { useState, useRef, useEffect } from 'react';
import Konva from 'konva';
import { KonvaCanvas } from './components/KonvaCanvas';
import { TopBar } from './components/TopBar';
import { ToolBelt } from './components/ToolBelt';
import { SettingsPanel } from './components/SettingsPanel';
import { PromptBoxModal } from './components/PromptBoxKonva';
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
  
  const stageRef = useRef<Konva.Stage>(null);

  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Calculate frame position (must match KonvaCanvas calculation)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const frameX = viewportWidth / 2 - frameW / 2;
  const frameY = viewportHeight / 2 - frameH / 2;

  const handleSave = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      console.log('Saving as JPEG with frame position:', { frameX, frameY, frameW, frameH });
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY, 'jpeg');
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
      
      const canvasDataUri = await exportFrameAsDataUri(
        stageRef as any,
        frameMode,
        frameX,
        frameY
      );
      
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
        
        const img = result.data.images[0]; // Take the first (and only) image
        
        const imgAspect = img.width / img.height;
        const frameAspect = frameW / frameH;
        
        console.log('Received image:', {
          url: img.url.substring(0, 50) + '...',
          width: img.width,
          height: img.height,
          aspectRatio: imgAspect.toFixed(3),
        });
        
        console.log('Frame:', {
          width: frameW,
          height: frameH,
          aspectRatio: frameAspect.toFixed(3),
        });
        
        // SIMPLE APPROACH: Just render the image at exactly the frame size
        // Set w/h to frame dimensions and scale to 1
        // This way it fills the frame perfectly regardless of source image size
        const newImage: CanvasObject = {
          id: `img_${Date.now()}`,
          type: 'image',
          src: img.url,
          w: frameW,  // Set to frame width
          h: frameH,  // Set to frame height
          transform: {
            x: 0,  // Top-left of frame
            y: 0,
            scale: 1,  // No additional scaling needed
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
          imageUrl: img.url,
          storedSize: { w: frameW, h: frameH },
          scale: 1,
          position: { x: 0, y: 0 },
          note: 'Image will fill entire frame',
        });

        // REPLACE entire canvas with just this one image
        console.log('CLEARING canvas and replacing with single generated image');
        setObjects([newImage]);
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
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedIds.length > 0}
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

    </div>
  );
}

export default AppKonva;

