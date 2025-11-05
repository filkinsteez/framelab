import type { FrameMode } from '../lib/konva-types';

interface TopBarProps {
  frameMode: FrameMode;
  onChangeFrame: (mode: FrameMode) => void;
}

export function TopBar({
  frameMode,
  onChangeFrame,
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

    </div>
  );
}


