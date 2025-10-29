import { useState, useRef } from 'react';
import Konva from 'konva';
import { KonvaCanvas } from './components/KonvaCanvas';
import { TopBar } from './components/TopBar';
import { ThreeDViewer } from './components/ThreeDViewer';
import { SettingsPanel } from './components/SettingsPanel';
import { PromptBoxModal } from './components/PromptBoxKonva';
import { exportAndDownload, exportFrameAsDataUri } from './lib/konva-export';
import { FalClient } from './lib/fal-client';
import { createGallery } from './lib/konva-tools';
import type { CanvasObject, FrameMode, Tool } from './lib/konva-types';
import { FRAME_SPECS } from './lib/konva-types';

function AppKonva() {
  const [frameMode, setFrameMode] = useState<FrameMode>('PORTRAIT_9_16');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [show3DView, setShow3DView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const stageRef = useRef<Konva.Stage>(null);

  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Calculate frame position (centered in viewport)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - 60; // Subtract top bar height
  const frameX = (viewportWidth - frameW) / 2;
  const frameY = (viewportHeight - frameH) / 2 + 60; // Add top bar offset

  const handleExportPNG = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY - 60, 'png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleExportJPEG = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY - 60, 'jpeg');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleFrameChange = (mode: FrameMode) => {
    if (objects.length > 0) {
      const confirm = window.confirm(
        'Changing frame size may affect your composition. Continue?'
      );
      if (!confirm) return;
    }
    setFrameMode(mode);
  };

  const handle3DViewToggle = () => {
    setShow3DView(!show3DView);
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
        
        console.log('Received image:', {
          url: img.url.substring(0, 50) + '...',
          width: img.width,
          height: img.height,
          aspectRatio: (img.width / img.height).toFixed(2),
        });
        
        console.log('Frame dimensions:', {
          width: frameW,
          height: frameH,
          aspectRatio: (frameW / frameH).toFixed(2),
        });
        
        // Scale to EXACTLY fill the frame
        // Since Nano Banana should return the correct aspect ratio,
        // we can scale to fill the frame dimensions exactly
        const scaleX = frameW / img.width;
        const scaleY = frameH / img.height;
        const scale = Math.max(scaleX, scaleY); // Fill frame (may crop slightly)
        
        // Center the image if it doesn't match perfectly
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const offsetX = (frameW - scaledW) / 2;
        const offsetY = (frameH - scaledH) / 2;
        
        // Create single image that fills the frame
        const newImage: CanvasObject = {
          id: `img_${Date.now()}`,
          type: 'image',
          src: img.url,
          w: img.width,
          h: img.height,
          transform: {
            x: offsetX,
            y: offsetY,
            scale,
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
        
        console.log('Positioning:', {
          scale,
          scaledSize: { w: scaledW, h: scaledH },
          offset: { x: offsetX, y: offsetY },
        });

        // REPLACE entire canvas with just this one image
        console.log('CLEARING canvas and replacing with single generated image');
        setObjects([newImage]);
        console.log('Canvas replaced - should fill frame perfectly');
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
        currentTool={currentTool}
        onChangeTool={setCurrentTool}
        onExportPNG={handleExportPNG}
        onExportJPEG={handleExportJPEG}
        on3DViewToggle={handle3DViewToggle}
        show3DView={show3DView}
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
          stageRef={stageRef}
        />
      </div>

      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} />

      <ThreeDViewer visible={show3DView} />

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

      {/* Frame info overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          Frame: {frameMode === 'PORTRAIT_9_16' ? '9:16 Portrait' : '16:9 Landscape'}
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {frameW} × {frameH} px
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          Objects: {objects.length} | Selected: {selectedIds.length}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#333',
          maxWidth: '250px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>
          Quick Tips
        </div>
        <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
          <li>Drag & drop images into frame</li>
          <li>Scroll to zoom, drag to pan</li>
          <li>Use tools to create shapes</li>
          <li>Everything clips to frame bounds</li>
        </ul>
      </div>
    </div>
  );
}

export default AppKonva;

