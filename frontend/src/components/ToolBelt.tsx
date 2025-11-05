import type { Tool } from '../lib/konva-types';
import icMove from '../../../Assets/Icons/ic_move.png';
import icBrush from '../../../Assets/Icons/ic_brush.png';
import icArrow from '../../../Assets/Icons/ic_arrow.png';
import icDelete from '../../../Assets/Icons/ic_delete.png';
import icUndo from '../../../Assets/Icons/ic_undo.png';
import icRedo from '../../../Assets/Icons/ic_redo.png';
import ic3D from '../../../Assets/Icons/ic_3d.png';
import icSave from '../../../Assets/Icons/ic_save.png';

interface ToolBeltProps {
  currentTool: Tool;
  onChangeTool: (tool: Tool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onConvertTo3D?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  hasImageSelected?: boolean;
  has3DModelSelected?: boolean;
}

export function ToolBelt({
  currentTool,
  onChangeTool,
  onUndo,
  onRedo,
  onDelete,
  onSave,
  onConvertTo3D,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  hasImageSelected = false,
  has3DModelSelected = false,
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
          iconSrc={icMove}
          active={currentTool === 'select'}
          onClick={() => onChangeTool('select')}
          title="Select (V)"
        />
        <ToolButton
          iconSrc={icBrush}
          active={currentTool === 'brush'}
          onClick={() => onChangeTool('brush')}
          title="Brush (B)"
        />
        <ToolButton
          iconSrc={icArrow}
          active={currentTool === 'arrow'}
          onClick={() => onChangeTool('arrow')}
          title="Arrow (A)"
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
          iconSrc={icUndo}
          onClick={onUndo}
          title="Undo (Cmd+Z)"
          disabled={!canUndo}
        />
        <ActionButton
          iconSrc={icRedo}
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
          iconSrc={icDelete}
          onClick={onDelete}
          title="Delete"
          disabled={!hasSelection}
          danger
        />
        <ActionButton
          iconSrc={ic3D}
          onClick={onConvertTo3D}
          title="Convert Image to 3D"
          disabled={!hasImageSelected}
        />
        <ActionButton
          iconSrc={icSave}
          onClick={onSave}
          title="Save as JPEG"
        />
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  iconSrc,
  active,
  onClick,
  title,
}: {
  icon?: string;
  iconSrc?: string;
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
        padding: '6px',
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
      {iconSrc ? (
        <img 
          src={iconSrc} 
          alt={title}
          style={{ 
            width: '20px', 
            height: '20px',
            filter: active ? 'brightness(0) invert(1)' : 'none'
          }} 
        />
      ) : (
        icon
      )}
    </button>
  );
}

function ActionButton({
  icon,
  iconSrc,
  onClick,
  title,
  disabled,
  danger,
}: {
  icon?: string;
  iconSrc?: string;
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
        padding: '6px',
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
      {iconSrc ? (
        <img 
          src={iconSrc} 
          alt={title}
          style={{ 
            width: '20px', 
            height: '20px',
            opacity: disabled ? 0.3 : 1,
            filter: danger && !disabled ? 'brightness(0) saturate(100%) invert(20%) sepia(85%) saturate(3176%) hue-rotate(347deg) brightness(91%) contrast(89%)' : 'none'
          }} 
        />
      ) : (
        icon
      )}
    </button>
  );
}

