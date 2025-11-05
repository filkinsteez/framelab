import { useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDelete,
  onDuplicate,
  onFlipHorizontal,
  onFlipVertical,
}: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: '160px',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem
        onClick={() => {
          onBringToFront();
          onClose();
        }}
      >
        Bring to Front
      </MenuItem>
      <MenuItem
        onClick={() => {
          onBringForward();
          onClose();
        }}
      >
        Bring Forward
      </MenuItem>
      <MenuItem
        onClick={() => {
          onSendBackward();
          onClose();
        }}
      >
        Send Backward
      </MenuItem>
      <MenuItem
        onClick={() => {
          onSendToBack();
          onClose();
        }}
      >
        Send to Back
      </MenuItem>

      <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }} />

      {onDuplicate && (
        <MenuItem
          onClick={() => {
            onDuplicate();
            onClose();
          }}
        >
          Duplicate
        </MenuItem>
      )}

      {onFlipHorizontal && (
        <MenuItem
          onClick={() => {
            onFlipHorizontal();
            onClose();
          }}
        >
          Flip Horizontal
        </MenuItem>
      )}

      {onFlipVertical && (
        <MenuItem
          onClick={() => {
            onFlipVertical();
            onClose();
          }}
        >
          Flip Vertical
        </MenuItem>
      )}

      <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }} />

      <MenuItem
        onClick={() => {
          onDelete();
          onClose();
        }}
        danger
      >
        Delete
      </MenuItem>
    </div>
  );
}

function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        textAlign: 'left',
        fontSize: '13px',
        cursor: 'pointer',
        color: danger ? '#d32f2f' : '#333',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? '#ffebee' : '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

