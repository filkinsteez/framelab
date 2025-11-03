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
  const [currentArrowPoints, setCurrentArrowPoints] = useState<number[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

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
    const clickedOnFrame = e.target.name() === 'frame-background';
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

    // Arrow tool - start drawing
    if (currentTool === 'arrow') {
      if (insideFrame) {
        setIsDrawing(true);
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

    // Drawing with arrow
    if (isDrawing && currentTool === 'arrow') {
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      const localX = pointerPos.x - frameX;
      const localY = pointerPos.y - frameY;

      // Update end point of arrow
      setCurrentArrowPoints(prev => [prev[0], prev[1], localX, localY]);
      return;
    }

    // Marquee selection
    if (isMarqueeSelecting && currentTool === 'select') {
      const pointerPos = stage.getRelativePointerPosition();
      if (!pointerPos) return;

      const localX = pointerPos.x - frameX;
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
  }, [isDraggingCanvas, dragStart, isDrawing, isMarqueeSelecting, currentTool, frameX, frameY, frameW, frameH]);

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
  const handleTransformEnd = useCallback((id: string) => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(`#${id}`) as Konva.Shape;
    if (!node) return;

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    // Update object with final position
    setObjects(prev =>
      prev.map(o =>
        o.id === id
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
            name="frame-background"
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
                onDragMove={handleDragMove}
                onTransformEnd={handleTransformEnd}
                currentTool={currentTool}
              />
            ))}

            {/* Current brush stroke being drawn */}
            {isDrawing && currentTool === 'brush' && currentBrushPoints.length > 2 && (
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

            {/* Current arrow being drawn */}
            {isDrawing && currentTool === 'arrow' && currentArrowPoints.length === 4 && (() => {
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

            {/* Marquee selection box */}
            {isMarqueeSelecting && marqueeStart && marqueeEnd && (() => {
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
            rotateAnchorOffset={30}
            ignoreStroke={false}
            shouldOverdrawWholeArea={true}
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

