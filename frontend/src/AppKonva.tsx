import { useState, useRef } from 'react';
import Konva from 'konva';
import { KonvaCanvas } from './components/KonvaCanvas';
import { TopBar } from './components/TopBar';
import { ThreeDViewer } from './components/ThreeDViewer';
import { SettingsPanel } from './components/SettingsPanel';
import { exportAndDownload } from './lib/konva-export';
import type { CanvasObject, FrameMode, Tool } from './lib/konva-types';
import { FRAME_SPECS } from './lib/konva-types';

function AppKonva() {
  const [frameMode, setFrameMode] = useState<FrameMode>('PORTRAIT_9_16');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [show3DView, setShow3DView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const stageRef = useRef<Konva.Stage>(null);

  const { w: frameW, h: frameH } = FRAME_SPECS[frameMode];

  // Calculate frame position (centered in viewport)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - 60; // Subtract top bar height
  const frameX = (viewportWidth - frameW) / 2;
  const frameY = (viewportHeight - frameH) / 2 + 60; // Add top bar offset

  const handleExportPNG = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY - 60, 'png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleExportJPEG = async () => {
    if (!stageRef.current) {
      alert('Canvas not ready');
      return;
    }
    
    try {
      await exportAndDownload(stageRef as any, frameMode, frameX, frameY - 60, 'jpeg');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleFrameChange = (mode: FrameMode) => {
    if (objects.length > 0) {
      const confirm = window.confirm(
        'Changing frame size may affect your composition. Continue?'
      );
      if (!confirm) return;
    }
    setFrameMode(mode);
  };

  const handle3DViewToggle = () => {
    setShow3DView(!show3DView);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        frameMode={frameMode}
        onChangeFrame={handleFrameChange}
        currentTool={currentTool}
        onChangeTool={setCurrentTool}
        onExportPNG={handleExportPNG}
        onExportJPEG={handleExportJPEG}
        on3DViewToggle={handle3DViewToggle}
        show3DView={show3DView}
      />

      <div style={{ marginTop: '60px', width: '100%', height: 'calc(100vh - 60px)' }}>
        <KonvaCanvas
          frameMode={frameMode}
          objects={objects}
          setObjects={setObjects}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          currentTool={currentTool}
        />
      </div>

      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} />

      <ThreeDViewer visible={show3DView} />

      {/* Frame info overlay */}
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          Frame: {frameMode === 'PORTRAIT_9_16' ? '9:16 Portrait' : '16:9 Landscape'}
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {frameW} × {frameH} px
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
          Objects: {objects.length} | Selected: {selectedIds.length}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#333',
          maxWidth: '250px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>
          Quick Tips
        </div>
        <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
          <li>Drag & drop images into frame</li>
          <li>Scroll to zoom, drag to pan</li>
          <li>Use tools to create shapes</li>
          <li>Everything clips to frame bounds</li>
        </ul>
      </div>
    </div>
  );
}

export default AppKonva;

