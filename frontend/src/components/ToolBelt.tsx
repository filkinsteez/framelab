import type { Tool } from '../lib/konva-types';

interface ToolBeltProps {
  currentTool: Tool;
  onChangeTool: (tool: Tool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
}

export function ToolBelt({
  currentTool,
  onChangeTool,
  onUndo,
  onRedo,
  onDelete,
  onSave,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
}: ToolBeltProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 2000,
      }}
    >
      {/* Left section - Tools */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: 'white',
          padding: '6px',
          borderRadius: '50px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <ToolButton
          icon="🖱️"
          active={currentTool === 'select'}
          onClick={() => onChangeTool('select')}
          title="Select (V)"
        />
        <ToolButton
          icon="✏️"
          active={currentTool === 'brush'}
          onClick={() => onChangeTool('brush')}
          title="Brush (B)"
        />
        <ToolButton
          icon="▢"
          active={currentTool === 'rect'}
          onClick={() => onChangeTool('rect')}
          title="Rectangle (R)"
        />
        <ToolButton
          icon="●"
          active={currentTool === 'circle'}
          onClick={() => onChangeTool('circle')}
          title="Circle (C)"
        />
      </div>

      {/* Middle section - Undo/Redo */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: 'white',
          padding: '6px',
          borderRadius: '50px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <ActionButton
          icon="↶"
          onClick={onUndo}
          title="Undo (Cmd+Z)"
          disabled={!canUndo}
        />
        <ActionButton
          icon="↷"
          onClick={onRedo}
          title="Redo (Cmd+Shift+Z)"
          disabled={!canRedo}
        />
      </div>

      {/* Right section - Actions */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: 'white',
          padding: '6px',
          borderRadius: '50px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <ActionButton
          icon="🗑️"
          onClick={onDelete}
          title="Delete"
          disabled={!hasSelection}
          danger
        />
        <ActionButton
          icon="💾"
          onClick={onSave}
          title="Save as JPEG"
        />
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: active ? '#2196F3' : 'transparent',
        color: active ? 'white' : '#333',
        fontSize: '18px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: active ? '0 2px 8px rgba(33, 150, 243, 0.3)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon}
    </button>
  );
}

function ActionButton({
  icon,
  onClick,
  title,
  disabled,
  danger,
}: {
  icon: string;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: disabled ? '#f5f5f5' : 'transparent',
        color: disabled ? '#ccc' : danger ? '#d32f2f' : '#333',
        fontSize: '18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = danger ? '#ffebee' : '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon}
    </button>
  );
}

