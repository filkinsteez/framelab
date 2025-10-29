import { useState } from 'react';
import { Canvas } from './components/Canvas';
import { ThreeDViewer } from './components/ThreeDViewer';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel } from './components/SettingsPanel';
import type { Editor } from 'tldraw';

function App() {
  const [show3DView, setShow3DView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleEditorMount = (editor: Editor) => {
    console.log('Editor mounted:', editor);
    setEditor(editor);
  };

  const handle3DViewToggle = () => {
    setShow3DView(!show3DView);
  };

  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas onEditorMount={handleEditorMount} />
      
      <Toolbar
        editor={editor}
        on3DViewToggle={handle3DViewToggle}
        show3DView={show3DView}
        onSettingsToggle={handleSettingsToggle}
        showSettings={showSettings}
      />

      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} />

      <ThreeDViewer visible={show3DView} />

      {/* Instructions overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#333',
          maxWidth: '300px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          FrameLab Quick Start
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Drag & drop images/videos onto the canvas</li>
          <li>Click "Prompt" to add an AI generation box</li>
          <li>Use tldraw tools to draw and annotate</li>
          <li>Export your creation as PNG or JPEG</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
