import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  useEditor,
  type TLBaseShape,
  type RecordProps,
  type TLDefaultColorStyle,
} from 'tldraw';
import { useState } from 'react';
import { FalClient } from '../lib/fal-client';
import { getCanvasAsDataUri } from '../lib/export-compositor';

// Define the shape props
export type PromptBoxShapeProps = {
  w: number;
  h: number;
  prompt: string;
  isGenerating: boolean;
  progress: number | null;
  color: TLDefaultColorStyle;
};

// Define the shape type
export type PromptBoxShape = TLBaseShape<'prompt-box', PromptBoxShapeProps>;

// Validator for the shape props
export const promptBoxShapeProps: RecordProps<PromptBoxShape> = {
  w: T.number,
  h: T.number,
  prompt: T.string,
  isGenerating: T.boolean,
  progress: T.number.nullable(),
  color: T.any,
};

/**
 * PromptBox Shape - Interactive text input for AI generation
 */
export class PromptBoxShapeUtil extends BaseBoxShapeUtil<PromptBoxShape> {
  static override type = 'prompt-box' as const;
  static override props = promptBoxShapeProps;

  override getDefaultProps(): PromptBoxShapeProps {
    return {
      w: 400,
      h: 150,
      prompt: '',
      isGenerating: false,
      progress: null,
      color: 'black',
    };
  }

  override canResize = () => true;
  override canBind = () => false;

  // Render the shape
  override component(shape: PromptBoxShape) {
    return <PromptBoxComponent shape={shape} />;
  }

  // Indicator for the shape
  override indicator(shape: PromptBoxShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    );
  }
}

// Component with interactive elements
function PromptBoxComponent({ shape }: { shape: PromptBoxShape }) {
  const editor = useEditor();
  const [localPrompt, setLocalPrompt] = useState(shape.props.prompt);

  const handleGenerate = async () => {
    if (!localPrompt.trim() || shape.props.isGenerating) return;

    // Update shape to show generating state
    editor.updateShape<PromptBoxShape>({
      id: shape.id,
      type: 'prompt-box',
      props: {
        prompt: localPrompt,
        isGenerating: true,
        progress: 0,
        color: shape.props.color,
      },
    });

    try {
      // Flatten canvas to use as base image for img2img
      console.log('Flattening canvas for img2img generation...');
      const canvasDataUri = await getCanvasAsDataUri(editor);
      
      console.log('Canvas flattened:', canvasDataUri ? 'Yes' : 'No');
      console.log('Sending generation request with prompt:', localPrompt);
      
      const result = await FalClient.generate({
        prompt: localPrompt,
        imageUrl: canvasDataUri || undefined,
        strength: canvasDataUri ? 0.75 : undefined, // Only use strength if we have a base image
        numImages: 4,
      });

      if (result.success && result.data) {
        // Create a gallery shape next to this prompt box
        const galleryX = shape.x + shape.props.w + 50;
        const galleryY = shape.y;

        editor.createShape({
          type: 'gallery',
          x: galleryX,
          y: galleryY,
          props: {
            w: 600,
            h: 600,
            images: result.data.images.map((img) => ({
              url: img.url,
              seed: result.data!.seed,
              selected: false,
            })),
            columns: 2,
          },
        });
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset generating state
      editor.updateShape<PromptBoxShape>({
        id: shape.id,
        type: 'prompt-box',
        props: {
          isGenerating: false,
          progress: null,
          color: shape.props.color,
        },
      });
    }
  };

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
          AI Generation Prompt
          <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#666', marginTop: '4px' }}>
            💡 Canvas will be used as base image for generation
          </div>
        </div>

        <textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          disabled={shape.props.isGenerating}
          style={{
            flex: 1,
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            resize: 'none',
            outline: 'none',
          }}
        />

        {shape.props.isGenerating && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            Generating...
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!localPrompt.trim() || shape.props.isGenerating}
          style={{
            padding: '10px 16px',
            backgroundColor: shape.props.isGenerating ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: shape.props.isGenerating ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {shape.props.isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </HTMLContainer>
  );
}

