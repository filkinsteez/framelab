import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Group, Rect, Transformer, Line, Text, Circle } from 'react-konva';
import Konva from 'konva';
import {
  type CanvasObject,
  type FrameMode,
  type ViewportState,
  type Tool,
  FRAME_SPECS,
  generateId,
} from '../lib/konva-types';
import type { StoryboardFrame } from '../lib/storyboard-types';
import { RenderObject } from './RenderObject';
import { handleFileDrop } from '../lib/konva-file-utils';
import { ContextMenu } from './ContextMenu';
import {
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  deleteObjects,
  duplicateObjects,
} from '../lib/konva-tools';
import { snapToFrame } from '../lib/konva-snapping';
import { uiLocks } from '../lib/guards';

interface KonvaCanvasProps {
  frameMode: FrameMode;
  objects: CanvasObject[]; // Legacy - will be removed
  setObjects: React.Dispatch<React.SetStateAction<CanvasObject[]>>; // Legacy
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  currentTool: Tool;
  onTriggerRipple?: (x: number, y: number) => void;
  stageRef?: React.RefObject<Konva.Stage>;
  // Storyboard props
  storyboardFrames?: StoryboardFrame[];
  activeFrameId?: string | null;
  onFrameActivate?: (frameId: string) => void;
  onAddFrame?: () => void;
  onNextFrame?: () => void;
  onDuplicateFrame?: () => void;
  onConvertTo3D?: () => void;
  canGenerateNext?: boolean;
  onReorderFrames?: (fromIndex: number, toIndex: number) => void;
}

export function KonvaCanvas({
  frameMode,
  objects,
  setObjects,
  selectedIds,
  setSelectedIds,
  currentTool,
  onTriggerRipple,
  stageRef: externalStageRef,
  storyboardFrames = [],
  activeFrameId,
  onFrameActivate,
  onAddFrame,
  onNextFrame,
  onDuplicateFrame,
  onConvertTo3D,
  canGenerateNext = false,
  onReorderFrames,
}: KonvaCanvasProps) {
  const localStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || localStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  const artLayerRef = useRef<Konva.Layer>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Get frame dimensions FIRST
  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];
  
  // Calculate horizontal layout
  const frameGap = 100; // Space between frames
  // const totalFrames = storyboardFrames.length || 1;
  // Removed unused: const totalWidth = totalFrames * frameW + (totalFrames - 1) * frameGap;
  
  // Container size (observed via ResizeObserver)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // Observe container size
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    observer.observe(container);
    
    // Initial size
    setContainerSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Helper to get frame X position by index
  const getFrameX = (index: number) => {
    const startX = 100; // Left margin
    return startX + index * (frameW + frameGap);
  };
  
  // Helper to get active frame's X position
  const getActiveFrameX = useCallback(() => {
    if (!activeFrameId) return 100;
    const index = storyboardFrames.findIndex(f => f.id === activeFrameId);
    return getFrameX(index >= 0 ? index : 0);
  }, [activeFrameId, storyboardFrames, frameW, frameGap]);
  
  // Center Y position for all frames
  const frameY = (containerSize.height - frameH) / 2;
  
  // Calculate initial zoom to fit frame with padding
  const padding = 100;
  const initialZoom = Math.min(
    (containerSize.width - padding * 2) / frameW,
    (containerSize.height - padding * 2) / frameH,
    1 // Don't zoom beyond 100%
  );
  
  // Initialize viewport with auto-fit zoom and centered pan on first frame
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: initialZoom,
    pan: {
      x: containerSize.width / 2 - (getFrameX(0) + frameW / 2) * initialZoom,
      y: containerSize.height / 2 - (frameY + frameH / 2) * initialZoom,
    },
  });
  
  // Frame reorder drag-and-drop state
  const [draggingFrameIndex, setDraggingFrameIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Recalculate viewport when container or frame size changes
  useEffect(() => {
    const newZoom = Math.min(
      (containerSize.width - padding * 2) / frameW,
      (containerSize.height - padding * 2) / frameH,
      1
    );
    
    setViewport({
      zoom: newZoom,
      pan: {
        x: containerSize.width / 2 - (getFrameX(0) + frameW / 2) * newZoom,
        y: containerSize.height / 2 - (frameY + frameH / 2) * newZoom,
      },
    });
  }, [containerSize.width, containerSize.height, frameW, frameH]);

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSpacebarHeld, setIsSpacebarHeld] = useState(false);
  
  const [snapGuides, setSnapGuides] = useState<{
    showVerticalCenter: boolean;
    showHorizontalCenter: boolean;
  }>({ showVerticalCenter: false, showHorizontalCenter: false });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBrushPoints, setCurrentBrushPoints] = useState<number[]>([]);
  const [currentArrowPoints, setCurrentArrowPoints] = useState<number[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Track if we're currently transforming (to prevent selection changes)
  const [isTransforming, setIsTransforming] = useState(false);

  // Frame label editing
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);

  // Plus button popover state
  const [showPlusPopover, setShowPlusPopover] = useState(false);
  const [isPlusButtonHovered, setIsPlusButtonHovered] = useState(false);
  const plusButtonCircleRef = useRef<Konva.Circle | null>(null);
  const plusPopoverRef = useRef<HTMLDivElement>(null);

  // Listen for viewport sync events from external animations
  useEffect(() => {
    const handleSyncViewport = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { x, y, zoom } = customEvent.detail;
      setViewport({ zoom, pan: { x, y } });
      console.log('Viewport synced:', { x, y, zoom });
    };

    window.addEventListener('syncViewport', handleSyncViewport);
    return () => window.removeEventListener('syncViewport', handleSyncViewport);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    const selectedNodes = selectedIds
      .map(id => {
        const node = stage.findOne(`#${id}`);
        console.log('Transformer attaching to node:', id, node?.getType(), node?.x(), node?.y());
        return node;
      })
      .filter(Boolean) as Konva.Node[];

    console.log('Transformer nodes:', selectedNodes.map(n => ({ id: n.id(), type: n.getType() })));
    transformerRef.current.nodes(selectedNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds]);

  // Zoom handler
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldZoom = viewport.zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - viewport.pan.x) / oldZoom,
      y: (pointer.y - viewport.pan.y) / oldZoom,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.1;
    const newZoom = direction > 0 ? oldZoom * scaleBy : oldZoom / scaleBy;

    // Clamp zoom
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));

    const newPan = {
      x: pointer.x - mousePointTo.x * clampedZoom,
      y: pointer.y - mousePointTo.y * clampedZoom,
    };

    setViewport({ zoom: clampedZoom, pan: newPan });
  }, [viewport]);

  // Helper to get object index in the objects array (used for z-order)
  // Higher index = drawn later = on top
  const getObjectIndex = useCallback((id: string) => {
    return objects.findIndex(o => o.id === id);
  }, [objects]);

  // Pan handlers and tool creation
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Spacebar pan mode: enable panning on any click
    if (isSpacebarHeld && e.evt.button === 0) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
      // Change cursor to grabbing
      const container = stageRef.current?.container();
      if (container) container.style.cursor = 'grabbing';
      return;
    }

    // Guard: If we're currently transforming or click is on transformer, don't change selection
    if (isTransforming) {
      return;
    }
    
    // Check if target is transformer or its descendant
    // Right-click - show context menu (check BEFORE ignoring Transformer clicks)
    if (e.evt.button === 2 && selectedIds.length > 0) {
      e.evt.preventDefault();
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }

    if (e.target.findAncestor('Transformer') || e.target.getType() === 'Transformer') {
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage();
    const clickedOnFrame = e.target.name()?.startsWith('frame-background');
    const stage = e.target.getStage();
    if (!stage) return;

    // Use getRelativePointerPosition to account for stage transform (zoom/pan)
    const pointerPos = stage.getRelativePointerPosition();
    if (!pointerPos) return;

    // Determine which frame the pointer is in
    let clickedFrameIndex = -1;
    let clickedFrameId: string | null = null;
    let localX = 0;
    let localY = 0;
    
    for (let i = 0; i < storyboardFrames.length; i++) {
      const frameX = getFrameX(i);
      const testLocalX = pointerPos.x - frameX;
      const testLocalY = pointerPos.y - frameY;
      
      if (testLocalX >= 0 && testLocalX <= frameW && testLocalY >= 0 && testLocalY <= frameH) {
        clickedFrameIndex = i;
        clickedFrameId = storyboardFrames[i].id;
        localX = testLocalX;
        localY = testLocalY;
        break;
      }
    }

    const insideFrame = clickedFrameIndex >= 0;

    // Activate clicked frame if it's not already active
    if (insideFrame && clickedFrameId && clickedFrameId !== activeFrameId) {
      console.log('Activating frame:', clickedFrameId);
      onFrameActivate?.(clickedFrameId);
      
      // If clicking on an object (not just the frame background), select it after activation
      if (!clickedOnFrame && currentTool === 'select') {
        console.log('Clicked on object in inactive frame, clickedOnFrame:', clickedOnFrame, 'target:', e.target.name());
        // Perform hit-testing on the clicked frame's objects
        const screenPointerPos = stage.getPointerPosition();
        if (screenPointerPos) {
          const hits = stage.getAllIntersections(screenPointerPos);
          console.log('Hits found:', hits.length);
          
          // Find the clicked frame's objects
          const clickedFrame = storyboardFrames.find(f => f.id === clickedFrameId);
          console.log('Clicked frame has', clickedFrame?.objects.length, 'objects');
          if (clickedFrame) {
            // Helper: Get the actual object ID (from node or parent Group)
            const getObjectId = (node: Konva.Node): string | null => {
              const nodeId = node.id();
              if (nodeId && clickedFrame.objects.some(obj => obj.id === nodeId)) {
                return nodeId;
              }
              const parent = node.getParent();
              if (parent && parent.getType() === 'Group') {
                const parentId = parent.id();
                if (parentId && clickedFrame.objects.some(obj => obj.id === parentId)) {
                  return parentId;
                }
              }
              return null;
            };
            
            // Find selectable objects in the clicked frame
            const hitIds = new Set<string>();
            for (const node of hits) {
              if (node.findAncestor('Transformer')) continue;
              const name = node.name();
              if (name?.startsWith('frame-background') || name === 'snap-guide' || name === 'hover-border') continue;
              
              const objId = getObjectId(node);
              if (objId) {
                hitIds.add(objId);
              }
            }
            
            if (hitIds.size > 0) {
              // Select the first object found
              const topmostId = Array.from(hitIds)[0];
              console.log('Selecting object on newly activated frame:', topmostId);
              setSelectedIds([topmostId]);
              return;
            }
          }
        }
      }
      
      return; // Frame background click - just activate, don't select
    }

    // SELECT MODE: Use hit-testing to find topmost selectable object
    if (currentTool === 'select' && !clickedOnEmpty && !clickedOnFrame) {
      const screenPointerPos = stage.getPointerPosition();
      if (screenPointerPos) {
        // Get all intersecting nodes at this point
        const hits = stage.getAllIntersections(screenPointerPos);
        
        // Helper: Get the actual object ID (from node or parent Group)
        const getObjectId = (node: Konva.Node): string | null => {
          const nodeId = node.id();
          if (nodeId && objects.some(obj => obj.id === nodeId)) {
            return nodeId;
          }
          const parent = node.getParent();
          if (parent && parent.getType() === 'Group') {
            const parentId = parent.id();
            if (parentId && objects.some(obj => obj.id === parentId)) {
              return parentId;
            }
          }
          return null;
        };
        
        // Filter to selectable objects and map to their IDs
        const hitIds = new Set<string>();
        for (const node of hits) {
          // Ignore transformer nodes
          if (node.findAncestor('Transformer')) continue;
          // Ignore helper elements
          const name = node.name();
          if (name?.startsWith('frame-background') || name === 'snap-guide' || name === 'hover-border') continue;
          
          // Get object ID
          const objId = getObjectId(node);
          if (objId) {
            hitIds.add(objId);
          }
        }
        
        // Convert to array and sort by object index (descending = topmost first)
        const sortedHitIds = Array.from(hitIds).sort((a, b) => 
          getObjectIndex(b) - getObjectIndex(a)
        );
        
        if (sortedHitIds.length > 0) {
          const topmostId = sortedHitIds[0];
          console.log('Selecting topmost:', topmostId, 'index:', getObjectIndex(topmostId), 'of', objects.length);
          
          if (e.evt.shiftKey) {
            // Shift-click: toggle selection
            setSelectedIds(prev =>
              prev.includes(topmostId) ? prev.filter(sid => sid !== topmostId) : [...prev, topmostId]
            );
          } else {
            // Normal click: select topmost
            setSelectedIds([topmostId]);
          }
          return;
        }
      }
    }

    // Brush tool - start drawing
    if (currentTool === 'brush') {
      if (insideFrame) {
        setIsDrawing(true);
        uiLocks.drawing = true;
        // Store the initial point
        setCurrentBrushPoints([localX, localY]);
      }
      return;
    }

    // Arrow tool - start drawing
    if (currentTool === 'arrow') {
      if (insideFrame) {
        setIsDrawing(true);
        uiLocks.drawing = true;
        // Store start point
        setCurrentArrowPoints([localX, localY, localX, localY]);
      }
      return;
    }

    if (clickedOnEmpty && insideFrame) {
      // Create object based on current tool
      // (No shape tools currently create on click)
    }

    // Marquee select or pan in select mode
    if (currentTool === 'select' && (clickedOnEmpty || clickedOnFrame)) {
      // Start marquee selection if clicking inside frame
      if (clickedOnFrame && insideFrame) {
        setIsMarqueeSelecting(true);
        setMarqueeStart({ x: localX, y: localY });
        setMarqueeEnd({ x: localX, y: localY });
        setSelectedIds([]); // Clear selection when starting marquee
      } else if (clickedOnEmpty) {
        // Pan the canvas when clicking outside frame
      setIsDraggingCanvas(true);
      setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
      setSelectedIds([]);
        // Deactivate all frames (enter global mode)
        if (onFrameActivate) {
          console.log('Entering global mode - deactivating all frames');
          onFrameActivate(''); // Empty string means global mode
    }
      }
    }
  }, [currentTool, storyboardFrames, activeFrameId, frameY, frameW, frameH, selectedIds, setObjects, setSelectedIds, objects, getObjectIndex, isTransforming, onFrameActivate, getActiveFrameX, isSpacebarHeld, stageRef]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const activeFrameX = getActiveFrameX();

    // Drawing with brush
    if (isDrawing && currentTool === 'brush') {
      // Use getRelativePointerPosition to account for stage transform (zoom/pan)
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      // Convert to frame-local coordinates
      const localX = pointerPos.x - activeFrameX;
      const localY = pointerPos.y - frameY;

      // Only draw if inside frame
      if (localX >= 0 && localX <= frameW && localY >= 0 && localY <= frameH) {
        setCurrentBrushPoints(prev => [...prev, localX, localY]);
      }
      return;
    }

    // Drawing with arrow
    if (isDrawing && currentTool === 'arrow') {
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      const localX = pointerPos.x - activeFrameX;
      const localY = pointerPos.y - frameY;

      // Update end point of arrow
      setCurrentArrowPoints(prev => [prev[0], prev[1], localX, localY]);
      return;
    }

    // Marquee selection
    if (isMarqueeSelecting && currentTool === 'select') {
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      const localX = pointerPos.x - activeFrameX;
      const localY = pointerPos.y - frameY;

      setMarqueeEnd({ x: localX, y: localY });
      return;
    }

    // Panning canvas
    if (isDraggingCanvas) {
      const dx = e.evt.clientX - dragStart.x;
      const dy = e.evt.clientY - dragStart.y;

      setViewport(prev => ({
        ...prev,
        pan: {
          x: prev.pan.x + dx,
          y: prev.pan.y + dy,
        },
      }));

      setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [isDraggingCanvas, dragStart, isDrawing, isMarqueeSelecting, currentTool, getActiveFrameX, frameY, frameW, frameH]);

  const handleMouseUp = useCallback(() => {
    // Finish brush stroke
    if (isDrawing && currentBrushPoints.length > 2) {
      const newBrush: CanvasObject = {
        id: generateId(),
        type: 'brush',
        points: currentBrushPoints,
        color: '#FF0000', // Red
        size: 6,
        opacity: 1,
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: Date.now() + 9999999, // Max z-index (draw over everything)
        },
      };

      setObjects(prev => [...prev, newBrush]);
      setCurrentBrushPoints([]);
    }

    // Finish arrow
    if (isDrawing && currentArrowPoints.length === 4) {
      const [x1, y1, x2, y2] = currentArrowPoints;
      // Only create if arrow has some length
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      if (length > 10) {
        const newArrow: CanvasObject = {
          id: generateId(),
          type: 'arrow',
          points: currentArrowPoints,
          color: '#FF0000', // Red
          strokeWidth: 6,
          transform: {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            zIndex: Date.now() + 9999999, // Max z-index (draw over everything)
          },
        };
        setObjects(prev => [...prev, newArrow]);
      }
      setCurrentArrowPoints([]);
    }

    // Finish marquee selection
    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);

      // Find all objects that intersect with the marquee rectangle
      const selectedObjects = objects.filter(obj => {
        let objX, objY, objW, objH;

        // Calculate bounding box based on object type
        if ('w' in obj && 'h' in obj) {
          // Images, shapes, text
          objX = obj.transform.x;
          objY = obj.transform.y;
          objW = obj.w * obj.transform.scale;
          objH = obj.h * obj.transform.scale;
        } else if (obj.type === 'brush') {
          // Brush strokes - calculate from points
          const xs = obj.points.filter((_, i) => i % 2 === 0);
          const ys = obj.points.filter((_, i) => i % 2 === 1);
          objX = Math.min(...xs) + obj.transform.x;
          objY = Math.min(...ys) + obj.transform.y;
          objW = (Math.max(...xs) - Math.min(...xs)) * obj.transform.scale;
          objH = (Math.max(...ys) - Math.min(...ys)) * obj.transform.scale;
        } else if (obj.type === 'arrow') {
          // Arrows - calculate from two points
          const [x1p, y1p, x2p, y2p] = obj.points;
          objX = Math.min(x1p, x2p) + obj.transform.x;
          objY = Math.min(y1p, y2p) + obj.transform.y;
          objW = Math.abs(x2p - x1p) * obj.transform.scale;
          objH = Math.abs(y2p - y1p) * obj.transform.scale;
        } else {
          return false;
        }

        // Check if object bounding box intersects with marquee
        const intersects = !(
          objX + objW < x1 ||
          objX > x2 ||
          objY + objH < y1 ||
          objY > y2
        );

        return intersects;
      });

      setSelectedIds(selectedObjects.map(obj => obj.id));
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }

    setIsDrawing(false);
    uiLocks.drawing = false;
    setIsDraggingCanvas(false);
    
    // If spacebar is still held, reset cursor to grab
    if (isSpacebarHeld) {
      const container = stageRef.current?.container();
      if (container) container.style.cursor = 'grab';
    }
  }, [isDrawing, currentBrushPoints, currentArrowPoints, isMarqueeSelecting, marqueeStart, marqueeEnd, objects, setObjects, setSelectedIds, isSpacebarHeld, stageRef]);

  // Handle file drops
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Get drop position relative to stage
    const stageBox = stage.container().getBoundingClientRect();
    const x = (e.clientX - stageBox.left - viewport.pan.x) / viewport.zoom;
    const y = (e.clientY - stageBox.top - viewport.pan.y) / viewport.zoom;

    // Determine which frame was dropped on
    let targetFrameIndex = -1;
    let targetFrameId: string | null = null;
    let frameLocalX = 0;
    let frameLocalY = 0;
    
    for (let i = 0; i < storyboardFrames.length; i++) {
      const frameX = getFrameX(i);
      const testLocalX = x - frameX;
      const testLocalY = y - frameY;
      
      if (testLocalX >= 0 && testLocalX <= frameW && testLocalY >= 0 && testLocalY <= frameH) {
        targetFrameIndex = i;
        targetFrameId = storyboardFrames[i].id;
        frameLocalX = testLocalX;
        frameLocalY = testLocalY;
        break;
      }
    }

    if (targetFrameIndex < 0) {
      console.warn('Dropped outside any frame');
      return;
    }

    console.log('Dropped on frame:', targetFrameId, 'at position:', { frameLocalX, frameLocalY });

    // Activate the frame if it's not already active
    if (targetFrameId && targetFrameId !== activeFrameId) {
      onFrameActivate?.(targetFrameId);
      // Wait for activation to complete before adding images
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Process files - they'll be added to the active frame via setObjects
    await handleFileDrop(files, frameLocalX, frameLocalY, setObjects, frameW, frameH);

    // Trigger ripple at drop position
    if (onTriggerRipple) {
      onTriggerRipple(e.clientX, e.clientY);
    }
  }, [viewport, frameY, frameW, frameH, onTriggerRipple, setObjects, storyboardFrames, activeFrameId, onFrameActivate, getFrameX]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle per-object selection (called from renderers on drag start or click)
  const handleShapeClick = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    // Used for drag-start selection and as fallback for direct clicks
    if (e.evt.shiftKey) {
      // Shift-click: toggle selection
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
    } else {
      // Normal click/drag: select this object
      setSelectedIds([id]);
    }
  }, [setSelectedIds]);

  // Handle drag move with real-time snapping and guides
  const handleDragMove = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = e.target as Konva.Shape;
    if (!node) return;

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    // Calculate object dimensions (accounting for scale)
    const objWidth = ('w' in obj ? obj.w : 100) * node.scaleX();
    const objHeight = ('h' in obj ? obj.h : 100) * node.scaleY();

    // Apply snapping
    const snapResult = snapToFrame(
      node.x(),
      node.y(),
      objWidth,
      objHeight,
      frameW,
      frameH
    );

    // Apply snap to node position in real-time
    node.position({ x: snapResult.x, y: snapResult.y });

    // Show guides in real-time during drag
    setSnapGuides({
      showVerticalCenter: snapResult.showVerticalCenterGuide,
      showHorizontalCenter: snapResult.showHorizontalCenterGuide,
    });
  }, [objects, frameW, frameH]);

  // Handle object transform end - save final position
  const handleTransformEnd = useCallback((id: string, e?: Konva.KonvaEventObject<Event>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Get the actual node ID from the event target if available
    // This ensures we're updating the correct object even in multi-select scenarios
    const actualId = e?.target?.id?.() || id;
    
    const node = stage.findOne(`#${actualId}`) as Konva.Shape;
    if (!node) return;

    const obj = objects.find(o => o.id === actualId);
    if (!obj) return;

    // Update object with final position
    setObjects(prev =>
      prev.map(o =>
        o.id === actualId
          ? {
              ...o,
              transform: {
                ...o.transform,
                x: node.x(),
                y: node.y(),
                scale: node.scaleX(),
                rotation: node.rotation(),
              },
            }
          : o
      )
    );

    // Hide guides immediately on drag end
      setSnapGuides({ showVerticalCenter: false, showHorizontalCenter: false });
  }, [setObjects, objects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Spacebar: enable pan mode
      if (e.code === 'Space' && !isSpacebarHeld) {
        e.preventDefault();
        setIsSpacebarHeld(true);
        // Change cursor to grab
        const container = stageRef.current?.container();
        if (container) container.style.cursor = 'grab';
      }

      // Deselect on Escape
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setContextMenu(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Spacebar released: disable pan mode
      if (e.code === 'Space') {
        setIsSpacebarHeld(false);
        setIsDraggingCanvas(false);
        // Reset cursor (only if not dragging)
        const container = stageRef.current?.container();
        if (container) {
          container.style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setSelectedIds, isSpacebarHeld, stageRef]);

  // Flip handlers
  const handleFlipHorizontal = useCallback(() => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      // Single object: toggle flipX flag
      setObjects(prev => prev.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        
        // Only apply to image objects
        if (obj.type !== 'image') return obj;
        
        return {
          ...obj,
          flipX: !obj.flipX,
        };
      }));
    } else {
      // Multi-select: mirror positions around group center
      const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
      if (selectedObjects.length === 0) return;

      // Compute group center from object positions (not visual rects)
      const positions = selectedObjects.map(obj => obj.transform.x);
      const minX = Math.min(...positions);
      const maxX = Math.max(...positions);
      const cx = (minX + maxX) / 2;

      // Reflect each object's position around group center
      setObjects(prev => prev.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        
        return {
          ...obj,
          transform: {
            ...obj.transform,
            x: 2 * cx - obj.transform.x,
          },
        };
      }));
    }
  }, [selectedIds, objects, setObjects]);

  const handleFlipVertical = useCallback(() => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      // Single object: toggle flipY flag
      setObjects(prev => prev.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        
        // Only apply to image objects
        if (obj.type !== 'image') return obj;
        
        return {
          ...obj,
          flipY: !obj.flipY,
        };
      }));
    } else {
      // Multi-select: mirror positions around group center
      const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
      if (selectedObjects.length === 0) return;

      // Compute group center from object positions (not visual rects)
      const positions = selectedObjects.map(obj => obj.transform.y);
      const minY = Math.min(...positions);
      const maxY = Math.max(...positions);
      const cy = (minY + maxY) / 2;

      // Reflect each object's position around group center
      setObjects(prev => prev.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        
        return {
          ...obj,
          transform: {
            ...obj.transform,
            y: 2 * cy - obj.transform.y,
          },
        };
      }));
    }
  }, [selectedIds, objects, setObjects]);

  // Context menu handlers
  const handleContextMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'bringToFront':
        setObjects(prev => bringToFront(prev, selectedIds));
        break;
      case 'sendToBack':
        setObjects(prev => sendToBack(prev, selectedIds));
        break;
      case 'bringForward':
        setObjects(prev => bringForward(prev, selectedIds));
        break;
      case 'sendBackward':
        setObjects(prev => sendBackward(prev, selectedIds));
        break;
      case 'delete':
        setObjects(prev => deleteObjects(prev, selectedIds));
        setSelectedIds([]);
        break;
      case 'duplicate':
        setObjects(prev => duplicateObjects(prev, selectedIds));
        break;
      case 'flipHorizontal':
        handleFlipHorizontal();
        break;
      case 'flipVertical':
        handleFlipVertical();
        break;
      case 'convertTo3D':
        onConvertTo3D?.();
        break;
    }
  }, [selectedIds, setObjects, setSelectedIds, handleFlipHorizontal, handleFlipVertical, onConvertTo3D]);

  // Objects are already in render order (array order = z-order)
  // No longer needed since we render per-frame
  // const sortedObjects = objects;

  return (
    <>
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(#bdbee6 0.7px, #ffffff 0.7px)',
          backgroundSize: '14px 14px',
          overflow: 'hidden',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={(e) => e.preventDefault()}
      >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.pan.x}
        y={viewport.pan.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Background layer - all frames */}
        <Layer>
          {storyboardFrames.map((frame, index) => {
            const frameX = getFrameX(index);
            const isActive = !!(activeFrameId && frame.id === activeFrameId);
            
            return (
              <Group key={frame.id}>
          {/* Frame background */}
          <Rect
                  name={`frame-background-${frame.id}`}
            x={frameX}
            y={frameY}
            width={frameW}
            height={frameH}
            fill="white"
                  stroke={isActive ? '#1610ff' : '#333'}
                  strokeWidth={isActive ? 1.5 : 1}
                  shadowColor="#959da5"
                  shadowBlur={24}
                  shadowOpacity={0.2}
                  shadowOffsetX={0}
                  shadowOffsetY={8}
                  onClick={() => onFrameActivate?.(frame.id)}
                />
                
                {/* Frame label with drag handle */}
                <Group
                  x={frameX}
                  y={frameY - 30}
                  draggable={true}
                  opacity={draggingFrameIndex === index ? 0.5 : 1}
                  dragBoundFunc={(_pos) => {
                    // Keep the element pinned to its original position
                    const currentFrameX = getFrameX(index);
                    return { x: currentFrameX, y: frameY - 30 };
                  }}
                  onDragStart={(e) => {
                    setDraggingFrameIndex(index);
                    // Reset position immediately
                    const node = e.target;
                    node.position({ x: frameX, y: frameY - 30 });
                  }}
                  onDragMove={(e) => {
                    const stage = e.target.getStage();
                    if (!stage) return;
                    
                    // Reset position to prevent any movement
                    const node = e.target;
                    const currentFrameX = getFrameX(index);
                    node.position({ x: currentFrameX, y: frameY - 30 });
                    
                    // Get mouse position
                    const pointerPos = stage.getPointerPosition();
                    if (!pointerPos) return;
                    
                    // Convert to canvas coordinates
                    const canvasX = (pointerPos.x - viewport.pan.x) / viewport.zoom;
                    
                    // Determine which frame position the mouse is over
                    let targetIndex = null;
                    for (let i = 0; i <= storyboardFrames.length; i++) {
                      const insertX = i === 0 ? 0 : getFrameX(i - 1) + frameW / 2;
                      const nextInsertX = i === storyboardFrames.length ? 99999 : getFrameX(i) + frameW / 2;
                      
                      if (canvasX >= insertX && canvasX < nextInsertX) {
                        targetIndex = i;
                        break;
                      }
                    }
                    
                    if (targetIndex !== null && targetIndex !== dropTargetIndex) {
                      setDropTargetIndex(targetIndex);
                    }
                  }}
                  onDragEnd={(e) => {
                    // Reset position one final time
                    const node = e.target;
                    const currentFrameX = getFrameX(index);
                    node.position({ x: currentFrameX, y: frameY - 30 });
                    
                    if (draggingFrameIndex !== null && dropTargetIndex !== null && draggingFrameIndex !== dropTargetIndex) {
                      onReorderFrames?.(draggingFrameIndex, dropTargetIndex);
                    }
                    setDraggingFrameIndex(null);
                    setDropTargetIndex(null);
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                >
                  <Text
                    x={0}
                    y={0}
                    text={frame.customLabel || `Frame ${frame.frameNumber}`}
                    fontSize={18}
                    fontFamily="Arial"
                    fill={isActive ? '#1610ff' : '#333'}
                    visible={editingFrameId !== frame.id}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onFrameActivate?.(frame.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      const screenX = frameX * viewport.zoom + viewport.pan.x;
                      const screenY = (frameY - 30) * viewport.zoom + viewport.pan.y - 2;
                      setEditingFrameId(frame.id);
                      setEditingLabel(frame.customLabel || '');
                      setEditingPosition({ x: screenX, y: screenY });
                    }}
                  />
                </Group>
              </Group>
            );
          })}
          
          {/* Blue insertion line indicator */}
          {dropTargetIndex !== null && (
            <Line
              points={[
                getFrameX(dropTargetIndex) - (dropTargetIndex > 0 ? frameGap / 2 : 50),
                frameY - 40,
                getFrameX(dropTargetIndex) - (dropTargetIndex > 0 ? frameGap / 2 : 50),
                frameY + frameH + 20
              ]}
              stroke="#1610ff"
              strokeWidth={3}
              listening={false}
            />
          )}
        </Layer>

        {/* Art layer - render each frame's objects */}
        <Layer ref={artLayerRef}>
          {storyboardFrames.map((frame, index) => {
            const frameX = getFrameX(index);
            const isActive = !!(activeFrameId && frame.id === activeFrameId);
            
            return (
          <Group
                key={`art-${frame.id}`}
            x={frameX}
            y={frameY}
            clipFunc={(ctx) => {
              ctx.rect(0, 0, frameW, frameH);
            }}
          >
                {frame.objects.map(obj => (
              <RenderObject
                key={obj.id}
                object={obj}
                    isSelected={isActive && selectedIds.includes(obj.id)}
                onSelect={handleShapeClick}
                    onDragMove={handleDragMove}
                onTransformEnd={handleTransformEnd}
                    currentTool={currentTool}
                    isMarqueeSelecting={isMarqueeSelecting}
              />
            ))}

                {/* Current brush stroke being drawn - only on active frame */}
                {isActive && isDrawing && currentTool === 'brush' && currentBrushPoints.length > 2 && (
              <Line
                points={currentBrushPoints}
                stroke="#FF0000"
                strokeWidth={6}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )}

                {/* Current arrow being drawn - only on active frame */}
                {isActive && isDrawing && currentTool === 'arrow' && currentArrowPoints.length === 4 && (() => {
              const [x1, y1, x2, y2] = currentArrowPoints;
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const headLength = 25;
              
              const point1X = x2 - headLength * Math.cos(angle - Math.PI / 6);
              const point1Y = y2 - headLength * Math.sin(angle - Math.PI / 6);
              const point2X = x2 - headLength * Math.cos(angle + Math.PI / 6);
              const point2Y = y2 - headLength * Math.sin(angle + Math.PI / 6);
              
              return (
                <>
                  <Line
                    points={[x1, y1, x2, y2]}
                    stroke="#FF0000"
                    strokeWidth={6}
                    lineCap="round"
                    listening={false}
                  />
                  <Line
                    points={[point1X, point1Y, x2, y2, point2X, point2Y]}
                    stroke="#FF0000"
                    strokeWidth={6}
                    lineCap="round"
                    lineJoin="round"
                    listening={false}
                  />
                </>
              );
            })()}

                {/* Marquee selection box - only on active frame */}
                {isActive && isMarqueeSelecting && marqueeStart && marqueeEnd && (() => {
                  const x = Math.min(marqueeStart.x, marqueeEnd.x);
                  const y = Math.min(marqueeStart.y, marqueeEnd.y);
                  const width = Math.abs(marqueeEnd.x - marqueeStart.x);
                  const height = Math.abs(marqueeEnd.y - marqueeStart.y);
                  
                  return (
          <Rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      stroke="#1610ff"
            strokeWidth={2}
                      dash={[5, 5]}
                      fill="rgba(33, 150, 243, 0.1)"
            listening={false}
          />
                  );
                })()}
              </Group>
            );
          })}
        </Layer>

        {/* UI layer (transformer, guides) */}
        <Layer>
          {/* Snap guides (yellow dashed lines) - only on active frame */}
          {storyboardFrames.map((frame, index) => {
            if (frame.id !== activeFrameId) return null;
            const frameX = getFrameX(index);
            
            return (
              <Group key={`guides-${frame.id}`} x={frameX} y={frameY}>
            {/* Vertical center guide */}
            {snapGuides.showVerticalCenter && (
              <Line
                points={[frameW / 2, 0, frameW / 2, frameH]}
                stroke="#FFD700"
                strokeWidth={2}
                dash={[10, 5]}
                listening={false}
              />
            )}

            {/* Horizontal center guide */}
            {snapGuides.showHorizontalCenter && (
              <Line
                points={[0, frameH / 2, frameW, frameH / 2]}
                stroke="#FFD700"
                strokeWidth={2}
                dash={[10, 5]}
                listening={false}
              />
            )}
          </Group>
            );
          })}

          <Transformer
            ref={transformerRef}
            name="transformer"
            rotateAnchorOffset={30}
            ignoreStroke={false}
            shouldOverdrawWholeArea={selectedIds.length > 1}
            borderStroke="#1610ff"
            borderStrokeWidth={1}
            anchorStroke="#1610ff"
            anchorFill="white"
            anchorCornerRadius={2}
            anchorStrokeWidth={1}
            onTransformStart={(e) => {
              setIsTransforming(true);
              uiLocks.transforming = true;
              e.cancelBubble = true;
            }}
            onTransformEnd={(e) => {
              setIsTransforming(false);
              uiLocks.transforming = false;
              
              // Update all transformed nodes
              const nodes = transformerRef.current?.nodes() || [];
              nodes.forEach(node => {
                const nodeId = node.id();
                if (nodeId) {
                  handleTransformEnd(nodeId, e as any);
                }
              });
            }}
            onDragStart={(e) => {
              setIsTransforming(true);
              uiLocks.transforming = true;
              e.cancelBubble = true;
            }}
            onDragEnd={() => {
              setIsTransforming(false);
              uiLocks.transforming = false;
            }}
            boundBoxFunc={(oldBox, newBox) => {
              // Prevent scaling to negative or zero
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />

          {/* Plus button as Konva element - moves with canvas */}
          {onAddFrame && storyboardFrames.length > 0 && (() => {
            const lastIndex = storyboardFrames.length - 1;
            const lastFrameX = getFrameX(lastIndex);
            const buttonX = lastFrameX + frameW + 60;
            const buttonY = frameY + frameH / 2;
            const buttonRadius = 30;

            return (
              <Group key={`plus-button-${storyboardFrames.length}`}>
                <Circle
                  ref={(node) => { plusButtonCircleRef.current = node; }}
                  x={buttonX}
                  y={buttonY}
                  radius={buttonRadius}
                  stroke="#1610ff"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill={showPlusPopover || isPlusButtonHovered ? '#1610ff' : '#fff'}
                  onClick={() => {
                    setShowPlusPopover(!showPlusPopover);
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                    setIsPlusButtonHovered(true);
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                    setIsPlusButtonHovered(false);
                  }}
                />
                <Text
                  x={buttonX}
                  y={buttonY}
                  text="+"
                  fontSize={32}
                  fontFamily="Arial"
                  fill={isPlusButtonHovered || showPlusPopover ? '#fff' : '#1610ff'}
                  align="center"
                  verticalAlign="middle"
                  offsetX={10}
                  offsetY={16}
                  listening={false}
                />
              </Group>
            );
          })()}
        </Layer>
      </Stage>

      {/* Plus button popover (HTML overlay) */}
      {showPlusPopover && storyboardFrames.length > 0 && (() => {
        const lastIndex = storyboardFrames.length - 1;
        const lastFrameX = getFrameX(lastIndex);
        const buttonX = lastFrameX + frameW + 60;
        const buttonY = frameY + frameH / 2;
        
        const stage = stageRef.current;
        if (!stage) return null;
        
        const pos = stage.getAbsolutePosition();
        const screenX = buttonX * stage.scaleX() + pos.x;
        const screenY = buttonY * stage.scaleY() + pos.y;
        
        return (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              onClick={() => {
                setShowPlusPopover(false);
                setIsPlusButtonHovered(false); // Reset hover state
              }}
            />
            <div
              ref={plusPopoverRef}
              style={{
                position: 'absolute',
                left: `${screenX - 30}px`, // Align left edge with button left edge
                top: `${screenY + 40}px`,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '8px',
                zIndex: 1000,
                minWidth: '180px',
              }}
            >
              <button
                onClick={() => {
                  console.log('New Frame clicked from popover');
                  onAddFrame?.();
                  setShowPlusPopover(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <span>📄</span>
                <span>New Frame</span>
              </button>
              <button
                onClick={() => {
                  if (activeFrameId) {
                    console.log('Duplicate Frame clicked from popover');
                    onDuplicateFrame?.();
                    setShowPlusPopover(false);
                  }
                }}
                disabled={!activeFrameId}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: activeFrameId ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: activeFrameId ? 1 : 0.5,
                }}
                onMouseEnter={(e) => { if (activeFrameId) e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                title={activeFrameId ? 'Duplicate current frame' : 'No active frame'}
              >
                <span>📋</span>
                <span>Duplicate Frame</span>
              </button>
            </div>
          </>
        );
      })()}
      </div>

      {/* Frame label editing input overlay */}
      {editingFrameId && editingPosition && (
        <input
          type="text"
          value={editingLabel}
          onChange={(e) => setEditingLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Save the custom label
              const frame = storyboardFrames.find(f => f.id === editingFrameId);
              if (frame) {
                onFrameActivate?.(editingFrameId); // Ensure it's active
                // Use a callback to update the label through AppKonva
                const event = new CustomEvent('updateFrameLabel', {
                  detail: { frameId: editingFrameId, label: editingLabel }
                });
                window.dispatchEvent(event);
              }
              setEditingFrameId(null);
              setEditingLabel('');
              setEditingPosition(null);
            }
            if (e.key === 'Escape') {
              // Cancel editing
              setEditingFrameId(null);
              setEditingLabel('');
              setEditingPosition(null);
            }
          }}
          onBlur={() => {
            // Cancel on blur
            setEditingFrameId(null);
            setEditingLabel('');
            setEditingPosition(null);
          }}
          autoFocus
          maxLength={30}
          style={{
            position: 'absolute',
            left: `${editingPosition.x}px`,
            top: `${editingPosition.y}px`,
            fontSize: `${18 * viewport.zoom}px`,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            padding: '0',
            border: 'none',
            borderRadius: '0',
            background: 'transparent',
            outline: 'none',
            color: '#999',
            caretColor: '#999',
            minWidth: '200px',
            zIndex: 1000,
          }}
          placeholder="Custom label..."
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onBringToFront={() => handleContextMenuAction('bringToFront')}
          onSendToBack={() => handleContextMenuAction('sendToBack')}
          onBringForward={() => handleContextMenuAction('bringForward')}
          onSendBackward={() => handleContextMenuAction('sendBackward')}
          onDelete={() => handleContextMenuAction('delete')}
          onDuplicate={() => handleContextMenuAction('duplicate')}
          onFlipHorizontal={() => handleContextMenuAction('flipHorizontal')}
          onFlipVertical={() => handleContextMenuAction('flipVertical')}
          onConvertTo3D={selectedIds.length === 1 && objects.find(o => o.id === selectedIds[0])?.type === 'image' ? () => handleContextMenuAction('convertTo3D') : undefined}
        />
      )}
    </>
  );
}

