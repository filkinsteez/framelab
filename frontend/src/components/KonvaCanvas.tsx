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
  onUpdateFrameObjects?: (frameId: string, objects: CanvasObject[]) => void;
  onAddFrame?: () => void;
  onNextFrame?: () => void;
  canGenerateNext?: boolean;
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
  onUpdateFrameObjects,
  onAddFrame,
  onNextFrame,
  canGenerateNext = false,
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
  const totalFrames = storyboardFrames.length || 1;
  const totalWidth = totalFrames * frameW + (totalFrames - 1) * frameGap;
  
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
    // Guard: If we're currently transforming or click is on transformer, don't change selection
    if (isTransforming) {
      return;
    }
    
    // Check if target is transformer or its descendant
    if (e.target.findAncestor('Transformer') || e.target.getType() === 'Transformer') {
      return;
    }

    // Right-click - show context menu
    if (e.evt.button === 2 && selectedIds.length > 0) {
      e.evt.preventDefault();
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY });
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
    if (insideFrame && clickedFrameId && clickedFrameId !== activeFrameId && clickedOnFrame) {
      console.log('Activating frame:', clickedFrameId);
      onFrameActivate?.(clickedFrameId);
      return;
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
          if (name === 'frame-background' || name === 'snap-guide' || name === 'hover-border') continue;
          
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
      }
    }
  }, [currentTool, storyboardFrames, activeFrameId, frameY, frameW, frameH, selectedIds, setObjects, setSelectedIds, objects, getObjectIndex, isTransforming, onFrameActivate, getActiveFrameX]);

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
  }, [isDrawing, currentBrushPoints, currentArrowPoints, isMarqueeSelecting, marqueeStart, marqueeEnd, objects, setObjects, setSelectedIds]);

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

    // Convert to frame-local coordinates (using active frame)
    const activeFrameX = getActiveFrameX();
    const frameLocalX = x - activeFrameX;
    const frameLocalY = y - frameY;

    // Process files
    await handleFileDrop(files, frameLocalX, frameLocalY, setObjects, frameW, frameH);

    // Trigger ripple at drop position
    if (onTriggerRipple) {
      onTriggerRipple(e.clientX, e.clientY);
    }
  }, [viewport, getActiveFrameX, frameY, frameW, frameH, onTriggerRipple, setObjects]);

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

      // Deselect on Escape
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedIds]);

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
    }
  }, [selectedIds, setObjects, setSelectedIds]);

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
          backgroundColor: '#f5f5f5',
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
            const isActive = frame.id === activeFrameId;
            
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
                  stroke={isActive ? '#2196F3' : '#333'}
                  strokeWidth={isActive ? 4 : 2}
                  shadowColor="black"
                  shadowBlur={20}
                  shadowOpacity={0.3}
                  onClick={() => onFrameActivate?.(frame.id)}
                />
                
                {/* Frame label */}
                <Text
                  x={frameX}
                  y={frameY - 40}
                  text={frame.customLabel || `Frame ${frame.frameNumber}`}
                  fontSize={24}
                  fontFamily="Arial"
                  fill={isActive ? '#2196F3' : '#333'}
                  fontStyle="normal"
                  visible={editingFrameId !== frame.id}
                  onDblClick={() => {
                    // Calculate screen position for input overlay - same position as text
                    const screenX = frameX * viewport.zoom + viewport.pan.x;
                    const screenY = (frameY - 40) * viewport.zoom + viewport.pan.y - 1; // Adjust 1px up
                    setEditingFrameId(frame.id);
                    setEditingLabel(frame.customLabel || '');
                    setEditingPosition({ x: screenX, y: screenY });
                  }}
                  listening={true}
                />
              </Group>
            );
          })}
        </Layer>

        {/* Art layer - render each frame's objects */}
        <Layer ref={artLayerRef}>
          {storyboardFrames.map((frame, index) => {
            const frameX = getFrameX(index);
            const isActive = frame.id === activeFrameId;
            
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
                      stroke="#2196F3"
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
            onTransformStart={(e) => {
              setIsTransforming(true);
              uiLocks.transforming = true;
              e.cancelBubble = true;
              console.log('Transform started on:', transformerRef.current?.nodes().map(n => n.id()));
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
                  x={buttonX}
                  y={buttonY}
                  radius={buttonRadius}
                  stroke="#2196F3"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="#fff"
                  onClick={() => {
                    setShowPlusPopover(!showPlusPopover);
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                    setIsPlusButtonHovered(true);
                    const shape = e.target as Konva.Circle;
                    shape.fill('#2196F3');
                    shape.getLayer()?.batchDraw();
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                    setIsPlusButtonHovered(false);
                    if (!showPlusPopover) {
                      const shape = e.target as Konva.Circle;
                      shape.fill('#fff');
                      shape.getLayer()?.batchDraw();
                    }
                  }}
                />
                <Text
                  x={buttonX}
                  y={buttonY}
                  text="+"
                  fontSize={32}
                  fontFamily="Arial"
                  fill={isPlusButtonHovered || showPlusPopover ? '#fff' : '#2196F3'}
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
              onClick={() => setShowPlusPopover(false)}
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
                  if (canGenerateNext) {
                    console.log('Next Frame clicked from popover');
                    onNextFrame?.();
                    setShowPlusPopover(false);
                  }
                }}
                disabled={!canGenerateNext}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: canGenerateNext ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: canGenerateNext ? 1 : 0.5,
                }}
                onMouseEnter={(e) => { if (canGenerateNext) e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                title={canGenerateNext ? 'Generate next frame with AI' : 'Current frame is empty'}
              >
                <span>✨</span>
                <span>Next Frame (AI)</span>
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
            fontSize: `${24 * viewport.zoom}px`,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            padding: '0',
            border: 'none',
            borderRadius: '0',
            background: 'transparent',
            outline: 'none',
            color: '#333',
            caretColor: '#333',
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
        />
      )}
    </>
  );
}

