import { useState, useRef, useEffect } from 'react';

interface FramePlusButtonProps {
  onNewFrame: () => void;
  isLarge?: boolean; // true for end-of-strip button
}

export function FramePlusButton({
  onNewFrame,
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
          width: isLarge ? '80px' : '32px',
          height: isLarge ? '80px' : '32px',
          borderRadius: '50%',
          border: '2px dashed #ccc',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isLarge ? '32px' : '20px',
          color: '#666',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007bff';
          e.currentTarget.style.color = '#007bff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ccc';
          e.currentTarget.style.color = '#666';
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
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px',
            zIndex: 1000,
            minWidth: '160px',
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
