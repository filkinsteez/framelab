import type { FrameMode } from '../lib/konva-types';

interface TopBarProps {
  frameMode: FrameMode;
  onChangeFrame: (mode: FrameMode) => void;
}

export function TopBar({
  frameMode: _frameMode,
  onChangeFrame: _onChangeFrame,
}: TopBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        zIndex: 2000,
      }}
    >
      Frames
    </div>
  );
}


