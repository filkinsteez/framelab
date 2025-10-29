import type { FrameMode, Tool } from '../lib/konva-types';

interface TopBarProps {
  frameMode: FrameMode;
  onChangeFrame: (mode: FrameMode) => void;
  currentTool: Tool;
  onChangeTool: (tool: Tool) => void;
  onExportPNG: () => void;
  onExportJPEG: () => void;
  on3DViewToggle?: () => void;
  show3DView?: boolean;
}

export function TopBar({
  frameMode,
  onChangeFrame,
  currentTool,
  onChangeTool,
  onExportPNG,
  onExportJPEG,
  on3DViewToggle,
  show3DView,
}: TopBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'white',
        borderBottom: '2px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '20px',
        zIndex: 2000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Logo/Title */}
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
        FrameLab
      </div>

      <div style={{ width: '1px', height: '30px', backgroundColor: '#ddd' }} />

      {/* Frame Selector */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>
          Frame:
        </span>
        <button
          onClick={() => onChangeFrame('PORTRAIT_9_16')}
          style={{
            padding: '8px 16px',
            backgroundColor: frameMode === 'PORTRAIT_9_16' ? '#4CAF50' : '#f5f5f5',
            color: frameMode === 'PORTRAIT_9_16' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          9:16 Portrait
        </button>
        <button
          onClick={() => onChangeFrame('LANDSCAPE_16_9')}
          style={{
            padding: '8px 16px',
            backgroundColor: frameMode === 'LANDSCAPE_16_9' ? '#4CAF50' : '#f5f5f5',
            color: frameMode === 'LANDSCAPE_16_9' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          16:9 Landscape
        </button>
      </div>

      <div style={{ width: '1px', height: '30px', backgroundColor: '#ddd' }} />

      {/* Tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <ToolButton
          icon="👆"
          label="Select"
          active={currentTool === 'select'}
          onClick={() => onChangeTool('select')}
        />
        <ToolButton
          icon="✏️"
          label="Brush"
          active={currentTool === 'brush'}
          onClick={() => onChangeTool('brush')}
        />
        <ToolButton
          icon="▢"
          label="Rect"
          active={currentTool === 'rect'}
          onClick={() => onChangeTool('rect')}
        />
        <ToolButton
          icon="●"
          label="Circle"
          active={currentTool === 'circle'}
          onClick={() => onChangeTool('circle')}
        />
        <ToolButton
          icon="▲"
          label="Triangle"
          active={currentTool === 'triangle'}
          onClick={() => onChangeTool('triangle')}
        />
        <ToolButton
          icon="T"
          label="Text"
          active={currentTool === 'text'}
          onClick={() => onChangeTool('text')}
        />
        <ToolButton
          icon="💬"
          label="Prompt"
          active={currentTool === 'prompt'}
          onClick={() => onChangeTool('prompt')}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <ExportButton onClick={onExportPNG}>
          📥 PNG
        </ExportButton>
        <ExportButton onClick={onExportJPEG}>
          📄 JPEG
        </ExportButton>
        
        {on3DViewToggle && (
          <ExportButton
            onClick={on3DViewToggle}
            active={show3DView}
          >
            🎮 3D
          </ExportButton>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: '8px 12px',
        backgroundColor: active ? '#e3f2fd' : 'transparent',
        border: active ? '2px solid #2196F3' : '2px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        transition: 'all 0.2s',
        minWidth: '60px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '10px', fontWeight: active ? 'bold' : 'normal' }}>
        {label}
      </span>
    </button>
  );
}

function ExportButton({
  onClick,
  children,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        backgroundColor: active ? '#2196F3' : '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

