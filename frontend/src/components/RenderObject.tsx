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
  onTransformEnd: (id: string) => void;
  currentTool: Tool;
}

export function RenderObject({ object, isSelected, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
  switch (object.type) {
    case 'image':
      return <ImageRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
    case 'rect':
      return <RectRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
    case 'circle':
      return <CircleRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
    case 'triangle':
      return <TriangleRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
    case 'brush':
      return <BrushRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
    case 'text':
      return <TextRenderer object={object} isSelected={isSelected} onSelect={onSelect} onDragMove={onDragMove} onTransformEnd={onTransformEnd} currentTool={currentTool} />;
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

function ImageRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
  const [image] = useImage(object.type === 'image' ? object.src : '');
  const [isHovering, setIsHovering] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  if (object.type !== 'image') return null;

  // Debug log when image loads
  if (image && object.generationParams) {
    console.log('Rendering generated image:', {
      natural: { w: image.width, h: image.height },
      stored: { w: object.w, h: object.h },
      scale: object.transform.scale,
      finalRendered: { 
        w: object.w * object.transform.scale, 
        h: object.h * object.transform.scale 
      },
    });
  }

  return (
    <Group>
      <Image
        id={object.id}
        image={image}
        x={object.transform.x}
        y={object.transform.y}
        width={object.w}
        height={object.h}
        scaleX={object.transform.scale}
        scaleY={object.transform.scale}
        rotation={object.transform.rotation}
        opacity={object.transform.opacity}
        draggable={currentTool === 'select'}
        onClick={(e) => onSelect(object.id, e)}
        onTap={(e) => onSelect(object.id, e as any)}
        onDragStart={() => setIsDragging(true)}
        onDragMove={(e) => onDragMove(object.id, e)}
        onDragEnd={() => {
          setIsDragging(false);
          onTransformEnd(object.id);
        }}
        onTransformEnd={() => onTransformEnd(object.id)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
      {/* Hover border - hide when dragging */}
      {isHovering && !isDragging && (
        <Rect
          x={object.transform.x}
          y={object.transform.y}
          width={object.w}
          height={object.h}
          scaleX={object.transform.scale}
          scaleY={object.transform.scale}
          rotation={object.transform.rotation}
          stroke="#2196F3"
          strokeWidth={3}
          listening={false}
        />
      )}
    </Group>
  );
}

// ===== Rect Renderer =====

function RectRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
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
      draggable={currentTool === 'select'}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragEnd={() => onTransformEnd(object.id)}
      onTransformEnd={() => onTransformEnd(object.id)}
    />
  );
}

// ===== Circle Renderer =====

function CircleRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
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
      draggable={currentTool === 'select'}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragEnd={() => onTransformEnd(object.id)}
      onTransformEnd={() => onTransformEnd(object.id)}
    />
  );
}

// ===== Triangle Renderer =====

function TriangleRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
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
      draggable={currentTool === 'select'}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragEnd={() => onTransformEnd(object.id)}
      onTransformEnd={() => onTransformEnd(object.id)}
    />
  );
}

// ===== Brush Renderer =====

function BrushRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
  if (object.type !== 'brush') return null;

  return (
    <Line
      id={object.id}
      points={object.points}
      stroke={object.color}
      strokeWidth={object.size}
      opacity={object.opacity}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      globalCompositeOperation="source-over"
      x={object.transform.x}
      y={object.transform.y}
      scaleX={object.transform.scale}
      scaleY={object.transform.scale}
      rotation={object.transform.rotation}
      draggable={currentTool === 'select'}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragEnd={() => onTransformEnd(object.id)}
      onTransformEnd={() => onTransformEnd(object.id)}
    />
  );
}

// ===== Text Renderer =====

function TextRenderer({ object, onSelect, onDragMove, onTransformEnd, currentTool }: RenderObjectProps) {
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
      draggable={currentTool === 'select'}
      onClick={(e) => onSelect(object.id, e)}
      onTap={(e) => onSelect(object.id, e as any)}
      onDragEnd={() => onTransformEnd(object.id)}
      onTransformEnd={() => onTransformEnd(object.id)}
    />
  );
}

