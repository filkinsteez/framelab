import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Group, Rect, Transformer, Line } from 'react-konva';
import Konva from 'konva';
import {
  type CanvasObject,
  type FrameMode,
  type ViewportState,
  type Tool,
  FRAME_SPECS,
  sortByZIndex,
  generateId,
} from '../lib/konva-types';
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

interface KonvaCanvasProps {
  frameMode: FrameMode;
  objects: CanvasObject[];
  setObjects: React.Dispatch<React.SetStateAction<CanvasObject[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  currentTool: Tool;
  onTriggerRipple?: (x: number, y: number) => void;
  stageRef?: React.RefObject<Konva.Stage>;
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
}: KonvaCanvasProps) {
  const localStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || localStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  const artLayerRef = useRef<Konva.Layer>(null);
  
  // Initialize viewport
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  const [snapGuides, setSnapGuides] = useState<{
    showVerticalCenter: boolean;
    showHorizontalCenter: boolean;
  }>({ showVerticalCenter: false, showHorizontalCenter: false });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBrushPoints, setCurrentBrushPoints] = useState<number[]>([]);

  // Get frame dimensions
  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Viewport dimensions (full window)
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Position frame in world coordinates (before pan/zoom)
  // Center it in the viewport
  const frameX = viewportSize.width / 2 - frameW / 2;
  const frameY = viewportSize.height / 2 - frameH / 2;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    const selectedNodes = selectedIds
      .map(id => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

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

  // Pan handlers and tool creation
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Right-click - show context menu
    if (e.evt.button === 2 && selectedIds.length > 0) {
      e.evt.preventDefault();
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage();
    const stage = e.target.getStage();
    if (!stage) return;

    // Use getRelativePointerPosition to account for stage transform (zoom/pan)
    const pointerPos = stage.getRelativePointerPosition();
    if (!pointerPos) return;

    // Convert to frame-local coordinates
    const localX = pointerPos.x - frameX;
    const localY = pointerPos.y - frameY;

    // Check if inside frame
    const insideFrame = localX >= 0 && localX <= frameW && localY >= 0 && localY <= frameH;

    // Brush tool - start drawing
    if (currentTool === 'brush') {
      if (insideFrame) {
        setIsDrawing(true);
        // Store the initial point
        setCurrentBrushPoints([localX, localY]);
      }
      return;
    }

    if (clickedOnEmpty && insideFrame) {
      // Create object based on current tool
      // (No shape tools currently create on click)
    }

    // Pan the canvas (only in select mode)
    if (currentTool === 'select' && clickedOnEmpty) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
      setSelectedIds([]);
    }
  }, [currentTool, frameX, frameY, frameW, frameH, selectedIds, setObjects, setSelectedIds]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Drawing with brush
    if (isDrawing && currentTool === 'brush') {
      // Use getRelativePointerPosition to account for stage transform (zoom/pan)
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      // Convert to frame-local coordinates
      const localX = pointerPos.x - frameX;
      const localY = pointerPos.y - frameY;

      // Only draw if inside frame
      if (localX >= 0 && localX <= frameW && localY >= 0 && localY <= frameH) {
        setCurrentBrushPoints(prev => [...prev, localX, localY]);
      }
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
  }, [isDraggingCanvas, dragStart, isDrawing, currentTool, frameX, frameY, frameW, frameH]);

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

    setIsDrawing(false);
    setIsDraggingCanvas(false);
  }, [isDrawing, currentBrushPoints, setObjects]);

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

    // Convert to frame-local coordinates
    const frameLocalX = x - frameX;
    const frameLocalY = y - frameY;

    // Process files
    await handleFileDrop(files, frameLocalX, frameLocalY, setObjects, frameW, frameH);

    // Trigger ripple at drop position
    if (onTriggerRipple) {
      onTriggerRipple(e.clientX, e.clientY);
    }
  }, [viewport, frameX, frameY, frameW, frameH, onTriggerRipple, setObjects]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle shape selection
  const handleShapeClick = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (currentTool !== 'select') return;

    e.cancelBubble = true;

    if (e.evt.shiftKey) {
      // Multi-select
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
    } else {
      // Single select
      setSelectedIds([id]);
    }
  }, [currentTool, setSelectedIds]);

  // Handle object transform with snapping
  const handleTransformEnd = useCallback((id: string) => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(`#${id}`) as Konva.Shape;
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

    // Update object with snapped position
    setObjects(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              transform: {
                ...o.transform,
                x: snapResult.x,
                y: snapResult.y,
                scale: node.scaleX(),
                rotation: node.rotation(),
              },
            }
          : o
      )
    );

    // Update node position if snapped
    if (snapResult.x !== node.x() || snapResult.y !== node.y()) {
      node.position({ x: snapResult.x, y: snapResult.y });
      node.getLayer()?.batchDraw();
    }

    // Show guides if snapped to center
    setSnapGuides({
      showVerticalCenter: snapResult.snappedToVerticalCenter,
      showHorizontalCenter: snapResult.snappedToHorizontalCenter,
    });

    // Hide guides after a delay
    setTimeout(() => {
      setSnapGuides({ showVerticalCenter: false, showHorizontalCenter: false });
    }, 1000);
  }, [setObjects, objects, frameW, frameH]);

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

  const sortedObjects = sortByZIndex(objects);

  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#2a2a2a',
          overflow: 'hidden',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={(e) => e.preventDefault()}
      >
      <Stage
        ref={stageRef}
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.pan.x}
        y={viewport.pan.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Background layer */}
        <Layer>
          {/* Frame background */}
          <Rect
            x={frameX}
            y={frameY}
            width={frameW}
            height={frameH}
            fill="white"
            shadowColor="black"
            shadowBlur={20}
            shadowOpacity={0.3}
          />
        </Layer>

        {/* Art layer (clipped to frame) */}
        <Layer ref={artLayerRef}>
          <Group
            x={frameX}
            y={frameY}
            clipFunc={(ctx) => {
              ctx.rect(0, 0, frameW, frameH);
            }}
          >
            {sortedObjects.map(obj => (
              <RenderObject
                key={obj.id}
                object={obj}
                isSelected={selectedIds.includes(obj.id)}
                onSelect={handleShapeClick}
                onTransformEnd={handleTransformEnd}
                currentTool={currentTool}
              />
            ))}

            {/* Current brush stroke being drawn */}
            {isDrawing && currentBrushPoints.length > 2 && (
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
          </Group>

          {/* Frame border */}
          <Rect
            x={frameX}
            y={frameY}
            width={frameW}
            height={frameH}
            stroke="#333"
            strokeWidth={2}
            listening={false}
          />
        </Layer>

        {/* UI layer (transformer, guides) */}
        <Layer>
          {/* Snap guides (yellow dashed lines) */}
          <Group x={frameX} y={frameY}>
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

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Prevent scaling to negative or zero
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
      </div>

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

