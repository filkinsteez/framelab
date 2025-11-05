import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Konva from 'konva';
import { KonvaCanvas } from './components/KonvaCanvas';
import { TopBar } from './components/TopBar';
import { ToolBelt } from './components/ToolBelt';
import { SettingsPanel } from './components/SettingsPanel';
import { PromptBoxModal } from './components/PromptBoxKonva';
import { GLBViewer } from './components/GLBViewer';
import { StoryboardStrip } from './components/StoryboardStrip';
import { exportAndDownload, exportFrameAsDataUri } from './lib/konva-export';
import { renderFrameBlob } from './lib/offscreen-export';
import { FalClient } from './lib/fal-client';
import { useHistory } from './hooks/useHistory';
import type { CanvasObject, FrameMode, Tool } from './lib/konva-types';
import { FRAME_SPECS, generateId } from './lib/konva-types';
import type { StoryboardState, StoryboardFrame } from './lib/storyboard-types';
import {
  addFrame,
  deleteFrame,
  reorderFrames,
  updateFrameLabel,
  updateFrameObjects,
  updateFrameThumbnail,
  setActiveFrame as setActiveFrameUtil,
} from './lib/storyboard-utils';
import { NEXT_FRAME_PRESETS } from './lib/presets';
import { uiLocks } from './lib/guards';

function AppKonva() {
  const [frameMode, setFrameMode] = useState<FrameMode>('LANDSCAPE_16_9');
  
  // Storyboard state - replacing single objects array
  const [storyboardState, setStoryboardState] = useState<StoryboardState>({
    aspect: '16:9',
    frames: [{
      id: generateId(),
      frameNumber: 1,
      objects: [],
      createdAt: Date.now(),
    }],
    activeFrameId: null,
  });
  
  // Load saved storyboard from localStorage on mount
  useEffect(() => {
    // TEMPORARY: Clear old localStorage during development
    // TODO: Remove this line after testing
    localStorage.removeItem('storyboard-draft');
    
    const saved = localStorage.getItem('storyboard-draft');
    if (saved) {
      try {
        const parsed: StoryboardState = JSON.parse(saved);
        setStoryboardState(parsed);
        console.log('Loaded saved storyboard:', parsed.frames.length, 'frames');
      } catch (error) {
        console.error('Failed to load saved storyboard:', error);
      }
    }
  }, []);

  // Initialize active frame ONLY on first mount (not when entering global mode)
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (!hasInitialized && !storyboardState.activeFrameId && storyboardState.frames.length > 0) {
      setStoryboardState(prev => ({ ...prev, activeFrameId: prev.frames[0].id }));
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem('storyboard-draft', JSON.stringify(storyboardState));
      console.log('Auto-saved storyboard');
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [storyboardState]);
  
  // Legacy undo/redo - will integrate with history.ts later
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
  const [promptText, setPromptText] = useState('');
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

  // Storyboard helper functions
  const getActiveFrame = useCallback((): StoryboardFrame | null => {
    return storyboardState.frames.find(f => f.id === storyboardState.activeFrameId) || null;
  }, [storyboardState]);

  const updateActiveFrame = useCallback((objects: CanvasObject[]) => {
    if (!storyboardState.activeFrameId) return;
    setStoryboardState(prev => updateFrameObjects(prev, prev.activeFrameId!, objects));
  }, [storyboardState.activeFrameId]);

  const setActiveFrame = useCallback((frameId: string) => {
    // Empty string means global mode (no active frame)
    const actualFrameId = frameId === '' ? null : frameId;
    
    setStoryboardState(prev => setActiveFrameUtil(prev, actualFrameId));
    
    // Scroll into view only if activating a specific frame
    if (frameId && frameId !== '') {
      setTimeout(() => {
        document.getElementById(`frame-card-${frameId}`)?.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }, 50);
    }
    
    if (frameId === '') {
      console.log('Entered global mode');
    } else {
      console.log('Activated frame:', frameId);
    }
  }, []);

  // Sync guard to prevent infinite loops
  const isSyncing = useRef(false);

  // Sync legacy objects state with active frame
  // This keeps existing code working while we transition
  const activeFrame = getActiveFrame();
  useEffect(() => {
    if (isSyncing.current) return;
    
    // Only sync if we have an active frame (not in global mode)
    if (activeFrame && storyboardState.activeFrameId && JSON.stringify(activeFrame.objects) !== JSON.stringify(objects)) {
      console.log('Syncing active frame objects to legacy objects state');
      isSyncing.current = true;
      setObjects(activeFrame.objects);
      setTimeout(() => { isSyncing.current = false; }, 50);
    } else if (!storyboardState.activeFrameId && objects.length > 0) {
      // In global mode, clear objects
      console.log('Clearing objects for global mode');
      isSyncing.current = true;
      setObjects([]);
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  }, [activeFrame?.id, storyboardState.frames, storyboardState.activeFrameId]);

  // Sync changes back to active frame
  useEffect(() => {
    if (isSyncing.current) return;
    
    // Only sync if we have an active frame (not in global mode)
    if (activeFrame && storyboardState.activeFrameId && JSON.stringify(activeFrame.objects) !== JSON.stringify(objects)) {
      console.log('Syncing legacy objects back to active frame');
      isSyncing.current = true;
      updateActiveFrame(objects);
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  }, [objects, storyboardState.activeFrameId]);

  // Generate thumbnail for active frame when objects change (debounced)
  useEffect(() => {
    if (!activeFrame || !stageRef.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Use the current stage to generate thumbnail
        const stage = stageRef.current;
        if (!stage) return;

        // Export at smaller size for thumbnail (200x113 for 16:9)
        const dataUrl = stage.toDataURL({
          pixelRatio: 200 / frameW, // Scale down to thumbnail size
        });

        setStoryboardState(prev => updateFrameThumbnail(prev, activeFrame.id, dataUrl));
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [activeFrame?.id, activeFrame?.objects, frameW]);

  // Frame position is calculated in KonvaCanvas based on container size
  // For export/generation, we need to get it from the stage
  const getFramePosition = useCallback(() => {
    if (!stageRef.current) return { frameX: 0, frameY: 0 };
    
    const stage = stageRef.current;
    const frameNode = stage.findOne('.frame-background');
    if (frameNode) {
      return { frameX: frameNode.x(), frameY: frameNode.y() };
    }
    
    // Fallback: calculate centered position based on stage size
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    return {
      frameX: (stageWidth - frameW) / 2,
      frameY: (stageHeight - frameH) / 2,
    };
  }, [frameW, frameH]);

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
      
      const { frameX, frameY } = getFramePosition();
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        handleDelete();
      }

      // Navigate frames with Shift+←/→
      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentIndex = storyboardState.frames.findIndex(
          f => f.id === storyboardState.activeFrameId
        );
        
        if (currentIndex >= 0) {
          const newIndex = e.key === 'ArrowLeft'
            ? Math.max(0, currentIndex - 1)
            : Math.min(storyboardState.frames.length - 1, currentIndex + 1);
          
          const newFrame = storyboardState.frames[newIndex];
          if (newFrame && newFrame.id !== storyboardState.activeFrameId) {
            setActiveFrame(newFrame.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, handleDelete, storyboardState, setActiveFrame]);

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

  // Frame management handlers
  const handleAddFrame = useCallback((atIndex: number) => {
    console.log('handleAddFrame called, adding at index:', atIndex);
    setStoryboardState(prev => {
      const newState = addFrame(prev, atIndex);
      console.log('New storyboard state:', newState);
      
      // Pan to the new frame after a short delay
      setTimeout(() => {
        if (stageRef.current) {
          const stage = stageRef.current;
          const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];
          const frameGap = 100;
          
          // Calculate new frame position (it's at atIndex)
          const newFrameX = 100 + atIndex * (frameW + frameGap);
          const frameY = (stage.height() - frameH) / 2;
          
          // Get current zoom
          const currentZoom = stage.scaleX();
          
          // Calculate pan to center the new frame
          const newPan = {
            x: stage.width() / 2 - (newFrameX + frameW / 2) * currentZoom,
            y: stage.height() / 2 - (frameY + frameH / 2) * currentZoom,
          };
          
          // Animate the pan using Konva
          const tween = new Konva.Tween({
            node: stage,
            x: newPan.x,
            y: newPan.y,
            duration: 0.3,
            onFinish: () => {
              // Update React viewport state to match Konva after animation
              window.dispatchEvent(new CustomEvent('syncViewport', {
                detail: { x: newPan.x, y: newPan.y, zoom: currentZoom }
              }));
            },
          });
          tween.play();
        }
      }, 100);
      
      return newState;
    });
  }, [frameMode]);

  const handleDeleteFrame = useCallback((frameId: string) => {
    setStoryboardState(prev => deleteFrame(prev, frameId));
  }, []);

  const handleReorderFrames = useCallback((fromIndex: number, toIndex: number) => {
    setStoryboardState(prev => reorderFrames(prev, fromIndex, toIndex));
  }, []);

  const handleFrameLabelChange = useCallback((frameId: string, label: string) => {
    console.log('Updating frame label:', frameId, 'to:', label);
    setStoryboardState(prev => updateFrameLabel(prev, frameId, label));
  }, []);

  // Listen for frame label update events from KonvaCanvas
  useEffect(() => {
    const handleLabelUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { frameId, label } = customEvent.detail;
      handleFrameLabelChange(frameId, label);
    };

    window.addEventListener('updateFrameLabel', handleLabelUpdate);
    return () => window.removeEventListener('updateFrameLabel', handleLabelUpdate);
  }, [handleFrameLabelChange]);

  const handleNextFrame = useCallback(async (afterIndex: number) => {
    const frame = storyboardState.frames[afterIndex];
    if (!frame || frame.objects.length === 0) {
      alert('Previous frame is empty');
      return;
    }

    // Guard this gap
    uiLocks.jobGuards.add(`gap:${afterIndex}`);
    setIsGenerating(true);

    try {
      // 1. Offscreen export
      const blob = await renderFrameBlob(frame, 'image/png');

      // 2. Upload to FAL
      const formData = new FormData();
      formData.append('file', new File([blob], 'frame.png', { type: 'image/png' }));
      
      // Use existing FAL client's upload (if available) or direct API call
      const uploadResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana/edit/files', {
        method: 'POST',
        body: formData,
      });
      const { url: imageUrl } = await uploadResponse.json();

      // 3. Generate with preset
      const prompt = `${promptText.trim() || ''} ${NEXT_FRAME_PRESETS.continue}`.trim();
      
      const result = await FalClient.generate({
        prompt,
        imageUrl,
        aspectRatio: '16:9',
        numImages: 1,
      });

      if (result.success && result.data && result.data.images.length > 0) {
        const resultUrl = result.data.images[0].url;

        // 4. Create new frame
        const newImage: CanvasObject = {
          id: `img_${Date.now()}`,
          type: 'image',
          src: resultUrl,
          w: frameW,
          h: frameH,
          transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, zIndex: 0 },
        };

        const newFrame: StoryboardFrame = {
          id: generateId(),
          frameNumber: 0,
          objects: [newImage],
          createdAt: Date.now(),
          generatedFromPrevious: true,
          genMeta: {
            sourceFrameId: frame.id,
            prompt,
            aspect: '16:9',
            createdAt: Date.now(),
            resultUrl,
            preset: 'continue',
          },
        };

        // 5. Insert into state
        setStoryboardState(prev => {
          const frames = [
            ...prev.frames.slice(0, afterIndex + 1),
            newFrame,
            ...prev.frames.slice(afterIndex + 1),
          ].map((f, i) => ({ ...f, frameNumber: i + 1 }));
          
          return {
            ...prev,
            frames,
            activeFrameId: newFrame.id,
          };
        });

        // Auto-scroll
        setTimeout(() => {
          document.getElementById(`frame-card-${newFrame.id}`)?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
          });
        }, 100);
      }
    } catch (error) {
      console.error('Next frame generation failed:', error);
      alert('Generation failed');
    } finally {
      uiLocks.jobGuards.delete(`gap:${afterIndex}`);
      setIsGenerating(false);
    }
  }, [storyboardState.frames, promptText, frameW, frameH]);

  const handleOpenPrompt = () => {
    if (promptText.trim()) {
      console.log('Generating with prompt from bottom bar:', promptText);
      handlePromptGenerate(promptText);
      setPromptText(''); // Clear after submitting
    }
  };

  const handlePromptGenerate = async (prompt: string) => {
    console.log('handlePromptGenerate called with:', prompt);
    
    const activeFrame = getActiveFrame();
    const isGlobalMode = !activeFrame;

    setIsGenerating(true);
    setShowPromptDialog(false);

    try {
      // Clear selection to hide transformer/handles
      setSelectedIds([]);
      await new Promise(resolve => setTimeout(resolve, 50));

      if (isGlobalMode) {
        // GLOBAL MODE: Generate for all frames sequentially (Frame 1, then 2, then 3...)
        console.log('Global mode: Generating for all', storyboardState.frames.length, 'frames sequentially');
        
        for (let i = 0; i < storyboardState.frames.length; i++) {
          const frame = storyboardState.frames[i];
          console.log(`Generating frame ${i + 1}/${storyboardState.frames.length}:`, frame.id);
          
          let canvasDataUri: string | undefined;
          
          if (frame.objects.length > 0) {
            const blob = await renderFrameBlob(frame, 'image/png');
            const reader = new FileReader();
            canvasDataUri = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }

          const result = await FalClient.generate({
            prompt,
            imageUrl: canvasDataUri || undefined,
            strength: canvasDataUri ? 0.75 : undefined,
            aspectRatio: '16:9',
            numImages: 1,
          });

          if (result.success && result.data && result.data.images.length > 0) {
            const imageUrl = result.data.images[0].url;
            
            // Wait for image to load before updating frame (prevents white flash)
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                console.log(`Frame ${i + 1} image loaded`);
                
                // Update this frame now that image is loaded
                setStoryboardState(prev => ({
                  ...prev,
                  frames: prev.frames.map(f => {
                    if (f.id === frame.id) {
                      const newImage: CanvasObject = {
                        id: `img_${Date.now()}_${f.id}`,
                        type: 'image',
                        src: imageUrl,
                        w: frameW,
                        h: frameH,
                        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, zIndex: 0 },
                      };
                      return { ...f, objects: [newImage] };
                    }
                    return f;
                  }),
                }));
                
                resolve();
              };
              img.onerror = () => {
                console.error(`Frame ${i + 1} image load failed`);
                resolve(); // Continue anyway
              };
              img.src = imageUrl;
            });
            
            console.log(`Frame ${i + 1} complete`);
          } else {
            console.warn(`Frame ${i + 1} generation failed`);
          }
        }
        
        console.log('Global generation complete: all frames processed');
        setCurrentTool('select');
      } else {
        // SINGLE FRAME MODE: Generate for active frame only
        console.log('Single frame mode: Exporting active frame:', activeFrame.id, 'with', activeFrame.objects.length, 'objects');
        
        let canvasDataUri: string | undefined;
        
        if (activeFrame.objects.length > 0) {
          // Use offscreen export for frames with content
          const blob = await renderFrameBlob(activeFrame, 'image/png');
          const reader = new FileReader();
          canvasDataUri = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          console.log('Exported active frame, data URI length:', canvasDataUri.length);
        }

        const aspectRatio = '16:9';
        console.log('Sending to FAL with aspect ratio:', aspectRatio);

        const result = await FalClient.generate({
          prompt,
          imageUrl: canvasDataUri || undefined,
          strength: canvasDataUri ? 0.75 : undefined,
          aspectRatio,
          numImages: 1,
        });

      if (result.success && result.data && result.data.images.length > 0) {
        console.log('Generation successful!', result.data);
        
        const imgData = result.data.images[0];
        
        // Capture activeFrame in closure for async callback
        const targetFrameId = activeFrame.id;
        
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

          // Update ONLY the active frame with the new generated image
          console.log('Updating frame', targetFrameId, 'with generated image');
          
          // Replace the active frame's objects with just the generated image
          setStoryboardState(prev => ({
            ...prev,
            frames: prev.frames.map(f =>
              f.id === targetFrameId
                ? { ...f, objects: [newImage] }
                : f
            ),
          }));
          
          // Switch back to select/move tool after generation
          setCurrentTool('select');
        };
        
        img.onerror = () => {
          console.error('Failed to load generated image');
          alert('Failed to load generated image');
        };
        
        img.src = imgData.url;
      } else {
        console.error('Generation failed or no data:', result);
      }
      } // Close else block for single frame mode
    } catch (error) {
      console.error('Generation failed:', error);
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
      <TopBar
        frameMode={frameMode}
        onChangeFrame={handleFrameChange}
      />

      <main style={{ 
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <KonvaCanvas
          frameMode={frameMode}
          objects={objects}
          setObjects={setObjects}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          currentTool={currentTool}
          stageRef={stageRef as any}
          storyboardFrames={storyboardState.frames}
          activeFrameId={storyboardState.activeFrameId}
          onFrameActivate={setActiveFrame}
          onUpdateFrameObjects={updateActiveFrame}
          onAddFrame={() => {
            console.log('Plus button - New Frame clicked, current frames:', storyboardState.frames.length);
            handleAddFrame(storyboardState.frames.length);
          }}
          onNextFrame={() => {
            const lastIndex = storyboardState.frames.length - 1;
            console.log('Plus button - Next Frame clicked, lastIndex:', lastIndex);
            handleNextFrame(lastIndex);
          }}
          canGenerateNext={(getActiveFrame()?.objects.length || 0) > 0}
        />
      </main>

      {/* Prompt Bar at Bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          maxWidth: '90vw',
          zIndex: 1000,
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && promptText.trim()) {
                handleOpenPrompt();
              }
            }}
            placeholder={
              storyboardState.activeFrameId
                ? `Generate for ${getActiveFrame()?.customLabel || `Frame ${getActiveFrame()?.frameNumber || ''}`}`
                : 'Generate for all frames (global mode)'
            }
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '14px 60px 14px 20px',
              border: '1px solid #ddd',
              borderRadius: '50px',
              fontSize: '14px',
              backgroundColor: 'white',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (promptText.trim()) {
                handleOpenPrompt();
              }
            }}
            disabled={isGenerating || !promptText.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              border: 'none',
              background: 'none',
              color: promptText.trim() && !isGenerating ? '#333' : '#e0e0e0',
              cursor: promptText.trim() && !isGenerating ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              fontSize: '24px',
            }}
          >
            →
          </button>
        </div>
      </div>

      <ToolBelt
        currentTool={currentTool}
        onChangeTool={setCurrentTool}
        onUndo={undo}
        onRedo={redo}
        onDelete={handleDelete}
        onSave={handleSave}
        onConvertTo3D={handleConvertTo3D}
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

