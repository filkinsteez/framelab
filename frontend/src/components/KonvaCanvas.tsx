import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Group, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import {
  type CanvasObject,
  type FrameMode,
  type ViewportState,
  type Tool,
  FRAME_SPECS,
  sortByZIndex,
} from '../lib/konva-types';
import { RenderObject } from './RenderObject';
import { handleFileDrop } from '../lib/konva-file-utils';
import { ContextMenu } from './ContextMenu';
import {
  createRectangle,
  createCircle,
  createTriangle,
  createText,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  deleteObjects,
  duplicateObjects,
} from '../lib/konva-tools';

interface KonvaCanvasProps {
  frameMode: FrameMode;
  objects: CanvasObject[];
  setObjects: React.Dispatch<React.SetStateAction<CanvasObject[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  currentTool: Tool;
  onTriggerRipple?: (x: number, y: number) => void;
}

export function KonvaCanvas({
  frameMode,
  objects,
  setObjects,
  selectedIds,
  setSelectedIds,
  currentTool,
  onTriggerRipple,
}: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const artLayerRef = useRef<Konva.Layer>(null);
  
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Get frame dimensions
  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Viewport dimensions (full window)
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Center frame in viewport (accounting for zoom and pan)
  const frameX = (viewportSize.width / 2 - viewport.pan.x) / viewport.zoom - frameW / 2;
  const frameY = (viewportSize.height / 2 - viewport.pan.y) / viewport.zoom - frameH / 2;

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

    if (clickedOnEmpty) {
      // Get click position in frame-local coordinates
      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const localX = (pointerPos.x - viewport.pan.x) / viewport.zoom - frameX;
      const localY = (pointerPos.y - viewport.pan.y) / viewport.zoom - frameY;

      // Check if click is inside frame
      const insideFrame = localX >= 0 && localX <= frameW && localY >= 0 && localY <= frameH;

      if (insideFrame) {
        // Create object based on current tool
        switch (currentTool) {
          case 'rect':
            setObjects(prev => [...prev, createRectangle(localX, localY)]);
            return;
          case 'circle':
            setObjects(prev => [...prev, createCircle(localX, localY)]);
            return;
          case 'triangle':
            setObjects(prev => [...prev, createTriangle(localX, localY)]);
            return;
          case 'text':
            setObjects(prev => [...prev, createText(localX, localY)]);
            return;
        }
      }

      // Pan the canvas
      if (currentTool === 'select') {
        setIsDraggingCanvas(true);
        setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
        setSelectedIds([]);
      }
    }
  }, [currentTool, viewport, frameX, frameY, frameW, frameH, selectedIds, setObjects, setSelectedIds]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDraggingCanvas) return;

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
  }, [isDraggingCanvas, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

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

  // Handle object transform
  const handleTransformEnd = useCallback((id: string) => {
    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(`#${id}`) as Konva.Shape;
    if (!node) return;

    setObjects(prev =>
      prev.map(obj =>
        obj.id === id
          ? {
              ...obj,
              transform: {
                ...obj.transform,
                x: node.x(),
                y: node.y(),
                scale: node.scaleX(),
                rotation: node.rotation(),
              },
            }
          : obj
      )
    );
  }, [setObjects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        setObjects(prev => deleteObjects(prev, selectedIds));
        setSelectedIds([]);
      }

      // Deselect on Escape
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, setObjects, setSelectedIds]);

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
              />
            ))}
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

