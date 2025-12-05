import { useState, useRef, useEffect } from 'react';

interface FramePlusButtonProps {
  onNewFrame: () => void;
  onNextFrame: () => void;
  canGenerateNext: boolean; // false if previous frame is empty
  isLarge?: boolean; // true for end-of-strip button
}

export function FramePlusButton({
  onNewFrame,
  onNextFrame,
  canGenerateNext,
  isLarge = false,
}: FramePlusButtonProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  const handleNewFrame = () => {
    console.log('FramePlusButton: New Frame clicked');
    onNewFrame();
    setShowPopover(false);
  };

  const handleNextFrame = () => {
    if (canGenerateNext) {
      onNextFrame();
      setShowPopover(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={() => setShowPopover(!showPopover)}
        style={{
          width: isLarge ? '60px' : '40px',
          height: isLarge ? '60px' : '40px',
          borderRadius: '50%',
          border: '2px dashed #1610ff',
          background: showPopover ? '#1610ff' : '#fff',
          color: showPopover ? '#fff' : '#1610ff',
          fontSize: isLarge ? '32px' : '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          lineHeight: 1,
          paddingBottom: '5px', // Optical centering - move plus up slightly
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1610ff';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          if (!showPopover) {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = '#1610ff';
          }
        }}
        title="Add frame"
      >
        +
      </button>

      {showPopover && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '8px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px',
            zIndex: 1000,
            minWidth: '180px',
          }}
        >
          <button
            onClick={handleNewFrame}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <span>📄</span>
            <span>New Frame</span>
          </button>

        </div>
      )}
    </div>
  );
}

