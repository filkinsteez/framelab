import type { FrameMode } from '../lib/konva-types';

interface TopBarProps {
  frameMode: FrameMode;
  onChangeFrame: (mode: FrameMode) => void;
  onOpenPrompt?: () => void;
}

export function TopBar({
  frameMode,
  onChangeFrame,
  onOpenPrompt,
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


      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <button
        onClick={() => onOpenPrompt?.()}
        style={{
          padding: '10px 20px',
          backgroundColor: '#9C27B0',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
        }}
      >
        <span style={{ fontSize: '18px' }}>💬</span>
        Generate with AI
      </button>
    </div>
  );
}


