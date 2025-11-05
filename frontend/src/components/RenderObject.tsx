import React from 'react';
import { Image, Rect, Circle, Line, Text as KonvaText, Group } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { CanvasObject, Tool } from '../lib/konva-types';

interface RenderObjectProps {
  object: CanvasObject;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e?: Konva.KonvaEventObject<Event>) => void;
  currentTool: Tool;
  isMarqueeSelecting: boolean;
}

export function RenderObject({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  switch (object.type) {
    case 'image':
      return <ImageRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'rect':
      return <RectRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'circle':
      return <CircleRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'triangle':
      return <TriangleRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'brush':
      return <BrushRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'arrow':
      return <ArrowRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'text':
      return <TextRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} isMarqueeSelecting={isMarqueeSelecting} />;
    case 'model3d':
      // Not used - 3D viewer is now an overlay, not embedded in canvas
      return null;
    case 'promptbox':
    case 'gallery':
      // These are rendered separately with DOM overlays
      return null;
    default:
      return null;
  }
}

// ===== Image Renderer =====

function ImageRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  const [image] = useImage(object.type === 'image' ? object.src : '', 'anonymous');
  const [isHovering, setIsHovering] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  if (object.type !== 'image') return null;

  return (
    <Group
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      opacity={object.transform.opacity}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onDragStart={(e) => {
        // Select on drag start if not already selected (enables click-and-drag)
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
        setIsDragging(true);
      }}
      onDragMove={(e) => onDragMove(object.id, e)}
      onDragEnd={(e) => {
        setIsDragging(false);
        onTransformEnd(object.id, e);
      }}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Invisible bounding rect for Transformer */}
      <Rect
        x={0}
        y={0}
        width={object.w}
        height={object.h}
        fill="transparent"
        listening={false}
      />
      <Image
        image={image}
        x={object.w / 2}
        y={object.h / 2}
        offsetX={object.w / 2}
        offsetY={object.h / 2}
        width={object.w}
        height={object.h}
        scaleX={object.flipX ? -1 : 1}
        scaleY={object.flipY ? -1 : 1}
        listening={true}
      />
      {/* Hover border - hide when dragging */}
      {isHovering && !isDragging && (
        <Rect
          name="hover-border"
          x={0}
          y={0}
          width={object.w}
          height={object.h}
          stroke="#2196F3"
          strokeWidth={3}
          listening={false}
        />
      )}
    </Group>
  );
}

// ===== Rect Renderer =====

function RectRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'rect') return null;

  return (
    <Rect
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      width={object.w}
      height={object.h}
      fill={object.fill}
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      opacity={object.transform.opacity}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    />
  );
}

// ===== Circle Renderer =====

function CircleRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'circle') return null;

  return (
    <Circle
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      radius={object.w / 2}
      fill={object.fill}
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      opacity={object.transform.opacity}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    />
  );
}

// ===== Triangle Renderer =====

function TriangleRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'triangle') return null;

  const points = [
    object.w / 2, 0,         // Top point
    object.w, object.h,      // Bottom right
    0, object.h,             // Bottom left
  ];

  return (
    <Line
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      points={points}
      fill={object.fill}
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      opacity={object.transform.opacity}
      closed
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    />
  );
}

// ===== Brush Renderer =====

function BrushRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'brush') return null;

  // Calculate bounding box from points
  const xs = object.points.filter((_, i) => i % 2 === 0);
  const ys = object.points.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs) - 20;
  const minY = Math.min(...ys) - 20;
  const maxX = Math.max(...xs) + 20;
  const maxY = Math.max(...ys) + 20;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <Group
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragMove={(e) => onDragMove(object.id, e)}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    >
      {/* Invisible bounding box for easier selection/dragging */}
      <Rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="transparent"
        listening={false}
      />
      {/* The actual brush stroke */}
      <Line
        points={object.points}
        stroke={object.color}
        strokeWidth={object.size}
        opacity={object.opacity}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation="source-over"
        listening={false}
      />
    </Group>
  );
}

// ===== Arrow Renderer =====

function ArrowRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'arrow') return null;

  const [x1, y1, x2, y2] = object.points;

  // Calculate bounding box
  const minX = Math.min(x1, x2) - 30;
  const minY = Math.min(y1, y2) - 30;
  const maxX = Math.max(x1, x2) + 30;
  const maxY = Math.max(y1, y2) + 30;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <Group
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragMove={(e) => onDragMove(object.id, e)}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    >
      {/* Invisible bounding box for easier selection/dragging */}
      <Rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="transparent"
        listening={false}
      />
      {/* The actual arrow line */}
      <Line
        points={[x1, y1, x2, y2]}
        stroke={object.color}
        strokeWidth={object.strokeWidth}
        lineCap="round"
        listening={false}
      />
      {/* Arrow head (triangle at end) */}
      <Line
        points={(() => {
          // Calculate arrow head triangle
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLength = 25;
          
          // Two points for the arrow head
          const point1X = x2 - headLength * Math.cos(angle - Math.PI / 6);
          const point1Y = y2 - headLength * Math.sin(angle - Math.PI / 6);
          const point2X = x2 - headLength * Math.cos(angle + Math.PI / 6);
          const point2Y = y2 - headLength * Math.sin(angle + Math.PI / 6);
          
          return [point1X, point1Y, x2, y2, point2X, point2Y];
        })()}
        stroke={object.color}
        strokeWidth={object.strokeWidth}
        lineCap="round"
        lineJoin="round"
        closed={false}
        listening={false}
      />
    </Group>
  );
}

// ===== Text Renderer =====

function TextRenderer({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool, isMarqueeSelecting }: RenderObjectProps) {
  if (object.type !== 'text') return null;

  return (
    <KonvaText
      id={object.id}
      x={object.transform.x}
      y={object.transform.y}
      text={object.text}
      fontSize={object.fontSize}
      fontFamily={object.fontFamily}
      fill={object.color}
      align={object.align}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      opacity={object.transform.opacity}
      draggable={currentTool === 'select' && !isMarqueeSelecting}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(object.id, e as any);
        }
      }}
      onDragEnd={(e) => onTransformEnd(object.id, e)}
      onTransformEnd={(e) => onTransformEnd(object.id, e)}
    />
  );
}

