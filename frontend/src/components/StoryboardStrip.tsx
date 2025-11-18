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
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (index: number, frameId: string) => (e: React.DragEvent) => {
    if (!canReorderStrip()) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggingFrameId(frameId);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate if mouse is in left or right half of the frame
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const frameMiddle = rect.left + rect.width / 2;
    
    const newDropIndex = mouseX < frameMiddle ? index : index + 1;
    if (newDropIndex !== dropTargetIndex) {
      setDropTargetIndex(newDropIndex);
    }
  };

  const handleDrop = () => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dropTargetIndex !== null && fromIndex !== dropTargetIndex && !isNaN(fromIndex)) {
      onReorderFrames(fromIndex, dropTargetIndex);
    }
    
    setDraggingFrameId(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingFrameId(null);
    setDropTargetIndex(null);
  };

  // Insertion marker component
  const InsertionMarker = ({ index }: { index: number }) => (
    <div
      style={{
        width: dropTargetIndex === index ? '3px' : '0px',
        height: '200px',
        background: '#1610ff',
        transition: 'width 0.15s ease',
        flexShrink: 0,
      }}
    />
  );

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
        <>
          <InsertionMarker key={`marker-${index}`} index={index} />
          <StoryboardFrame
            key={frame.id}
            frame={frame}
            isActive={frame.id === storyboardState.activeFrameId}
            onActivate={() => onFrameActivate(frame.id)}
            onDelete={() => onFrameDelete(frame.id)}
            onLabelChange={(label) => onFrameLabelChange(frame.id, label)}
            isDragging={frame.id === draggingFrameId}
            onDragStart={handleDragStart(index, frame.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop()}
          />
        </>
      ))}
      <InsertionMarker key={`marker-${storyboardState.frames.length}`} index={storyboardState.frames.length} />
    </div>
  );
}

