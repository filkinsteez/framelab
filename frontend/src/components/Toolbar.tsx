import { Editor } from 'tldraw';
import { ExportCompositor } from '../lib/export-compositor';

interface ToolbarProps {
  editor: Editor | null;
  on3DViewToggle?: () => void;
  show3DView?: boolean;
  onSettingsToggle?: () => void;
  showSettings?: boolean;
}

/**
 * Toolbar component with canvas controls
 */
export function Toolbar({ editor, on3DViewToggle, show3DView, onSettingsToggle, showSettings }: ToolbarProps) {
  const createPromptBox = () => {
    console.log('Creating prompt box, editor:', editor);
    
    if (!editor) {
      console.error('No editor available');
      alert('Canvas not ready. Please wait a moment and try again.');
      return;
    }

    try {
      const center = editor.getViewportPageBounds().center;
      console.log('Creating prompt box at:', center);
      
      const shapeId = editor.createShape({
        type: 'prompt-box',
        x: center.x - 200,
        y: center.y - 75,
        props: {
          w: 400,
          h: 150,
          prompt: '',
          isGenerating: false,
          progress: null,
          color: 'black',
        },
      });
      
      console.log('Created prompt box with ID:', shapeId);
    } catch (error) {
      console.error('Failed to create prompt box:', error);
      alert('Failed to create prompt box. Check console for details.');
    }
  };

  const createGallery = () => {
    if (!editor) return;

    const center = editor.getViewportPageBounds().center;
    
    editor.createShape({
      type: 'gallery',
      x: center.x - 300,
      y: center.y - 300,
      props: {
        w: 600,
        h: 600,
        images: [],
        columns: 2,
      },
    });
  };

  const handleExportPNG = async () => {
    if (!editor) return;
    
    try {
      await ExportCompositor.exportAndDownload(editor, {
        format: 'png',
        scale: 2,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  const handleExportJPEG = async () => {
    if (!editor) return;
    
    try {
      await ExportCompositor.exportAndDownload(editor, {
        format: 'jpeg',
        scale: 2,
        quality: 0.95,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        backgroundColor: 'white',
        border: '2px solid #333',
        borderRadius: '8px',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <ToolbarButton onClick={createPromptBox} title="Add Prompt Box">
        <span style={{ fontSize: '18px' }}>💬</span>
        <span style={{ fontSize: '11px' }}>Prompt</span>
      </ToolbarButton>

      <ToolbarButton onClick={createGallery} title="Add Gallery">
        <span style={{ fontSize: '18px' }}>🖼️</span>
        <span style={{ fontSize: '11px' }}>Gallery</span>
      </ToolbarButton>

      <div
        style={{
          width: '1px',
          backgroundColor: '#ddd',
          margin: '4px 0',
        }}
      />

      <ToolbarButton onClick={handleExportPNG} title="Export as PNG">
        <span style={{ fontSize: '18px' }}>📥</span>
        <span style={{ fontSize: '11px' }}>PNG</span>
      </ToolbarButton>

      <ToolbarButton onClick={handleExportJPEG} title="Export as JPEG">
        <span style={{ fontSize: '18px' }}>📄</span>
        <span style={{ fontSize: '11px' }}>JPEG</span>
      </ToolbarButton>

      {on3DViewToggle && (
        <>
          <div
            style={{
              width: '1px',
              backgroundColor: '#ddd',
              margin: '4px 0',
            }}
          />
          <ToolbarButton 
            onClick={on3DViewToggle} 
            title="Toggle 3D View"
            active={show3DView}
          >
            <span style={{ fontSize: '18px' }}>🎮</span>
            <span style={{ fontSize: '11px' }}>3D View</span>
          </ToolbarButton>
        </>
      )}

      {onSettingsToggle && (
        <>
          <div
            style={{
              width: '1px',
              backgroundColor: '#ddd',
              margin: '4px 0',
            }}
          />
          <ToolbarButton 
            onClick={onSettingsToggle} 
            title="Settings"
            active={showSettings}
          >
            <span style={{ fontSize: '18px' }}>⚙️</span>
            <span style={{ fontSize: '11px' }}>Settings</span>
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '8px 12px',
        backgroundColor: active ? '#e3f2fd' : 'transparent',
        border: active ? '1px solid #1610ff' : '1px solid transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
        minWidth: '60px',
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
      {children}
    </button>
  );
}

