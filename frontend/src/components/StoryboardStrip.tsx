import { useState } from 'react';
import type { StoryboardState } from '../lib/storyboard-types';
import { StoryboardFrame } from './StoryboardFrame';
import { canReorderStrip } from '../lib/guards';

interface StoryboardStripProps {
  storyboardState: StoryboardState;
  onFrameActivate: (frameId: string) => void;
  onFrameDelete: (frameId: string) => void;
  onFrameLabelChange: (frameId: string, label: string) => void;
  onReorderFrames: (fromIndex: number, toIndex: number) => void;
}

export function StoryboardStrip({
  storyboardState,
  onFrameActivate,
  onFrameDelete,
  onFrameLabelChange,
  onReorderFrames,
}: StoryboardStripProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    if (!canReorderStrip()) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggingIndex(index);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  };

  const handleDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (fromIndex !== toIndex && !isNaN(fromIndex)) {
      onReorderFrames(fromIndex, toIndex);
    }
    
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '220px',
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {storyboardState.frames.map((frame, index) => (
        <StoryboardFrame
          key={frame.id}
          frame={frame}
          isActive={frame.id === storyboardState.activeFrameId}
          onActivate={() => onFrameActivate(frame.id)}
          onDelete={() => onFrameDelete(frame.id)}
          onLabelChange={(label) => onFrameLabelChange(frame.id, label)}
          draggable={canReorderStrip()}
          onDragStart={handleDragStart(index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
        />
      ))}
    </div>
  );
}

