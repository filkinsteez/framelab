import { useState, useEffect, useRef } from 'react';
import type { PromptBoxObject } from '../lib/konva-types';

// ===== PromptBox Modal (DOM overlay) =====

interface PromptBoxModalProps {
  object: PromptBoxObject;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export function PromptBoxModal({
  object,
  screenX,
  screenY,
  onClose,
  onGenerate,
}: PromptBoxModalProps) {
  const [prompt, setPrompt] = useState(object.prompt);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          left: screenX,
          top: screenY,
          backgroundColor: 'white',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '16px',
          width: '400px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        AI Generation Prompt
      </div>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
        💡 Canvas will be used as base image
      </div>

      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to generate..."
        disabled={object.isGenerating}
        style={{
          width: '100%',
          height: '100px',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'system-ui',
          resize: 'none',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || object.isGenerating}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: object.isGenerating ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: object.isGenerating ? 'not-allowed' : 'pointer',
          }}
        >
          {object.isGenerating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
    </>
  );
}

