import { useState } from 'react';
import type { StoryboardFrame } from '../lib/storyboard-types';

interface StoryboardFrameProps {
  frame: StoryboardFrame;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
  onLabelChange: (label: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function StoryboardFrame({
  frame,
  isActive,
  onActivate,
  onDelete,
  onLabelChange,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: StoryboardFrameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(frame.customLabel || '');
  };

  const handleLabelSave = () => {
    onLabelChange(editValue);
    setIsEditing(false);
  };

  const handleLabelCancel = () => {
    setIsEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Confirm only if frame has content
    if (frame.objects.length > 0) {
      if (window.confirm(`Delete Frame ${frame.frameNumber}?`)) {
        onDelete();
      }
    } else {
      onDelete();
    }
  };

  const displayLabel = `Frame ${frame.frameNumber}${frame.customLabel ? ': ' + frame.customLabel : ''}`;

  return (
    <div
      id={`frame-card-${frame.id}`}
      className={`storyboard-frame ${isActive ? 'active' : ''}`}
      onClick={onActivate}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        width: '250px',
        height: '200px',
        border: isActive ? '3px solid #1610ff' : '2px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: 'all 0.2s',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isActive ? '0 4px 12px rgba(33, 150, 243, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        background: '#fff',
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Header with drag handle and delete */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px',
          background: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          height: '30px',
        }}
      >
        <div
          style={{
            cursor: 'grab',
            fontSize: '14px',
            color: '#666',
            userSelect: 'none',
          }}
        >
          ⋮⋮
        </div>
        <button
          onClick={handleDeleteClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#EF4444',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
          title="Delete frame"
        >
          ✕
        </button>
      </div>

      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          height: '140px',
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {frame.thumbnail ? (
          <img
            src={frame.thumbnail}
            alt={displayLabel}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{ color: '#999', fontSize: '14px' }}>
            {frame.objects.length === 0 ? 'Empty' : 'No preview'}
          </div>
        )}
      </div>

      {/* Label with drag handle */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #ddd',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* Drag handle icon */}
        <div
          draggable={true}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
          style={{
            cursor: 'grab',
            fontSize: '16px',
            color: '#666',
            fontWeight: 'bold',
            userSelect: 'none',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            background: '#f0f0f0',
            borderRadius: '3px',
          }}
          title="Drag to reorder"
        >
          ⋮⋮
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') handleLabelCancel();
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            maxLength={30}
            style={{
              width: '100%',
              border: '1px solid #1610ff',
              borderRadius: '4px',
              padding: '2px 4px',
              fontSize: '12px',
            }}
            placeholder="Custom label..."
          />
        ) : (
          <div
            onClick={handleLabelClick}
            style={{
              fontSize: '12px',
              fontWeight: isActive ? 'bold' : 'normal',
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={displayLabel}
          >
            {displayLabel}
          </div>
        )}
      </div>
    </div>
  );
}

