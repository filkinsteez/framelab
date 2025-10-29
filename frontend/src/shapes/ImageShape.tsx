import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLBaseShape,
  type RecordProps,
} from 'tldraw';
import type { GenerationParams } from '../lib/types';

// Define the shape props
export type ImageShapeProps = {
  w: number;
  h: number;
  url: string;
  assetId: string | null;
  generationParams: GenerationParams | null;
};

// Define the shape type
export type ImageCustomShape = TLBaseShape<'image-custom', ImageShapeProps>;

// Validator for the shape props
export const imageShapeProps: RecordProps<ImageCustomShape> = {
  w: T.number,
  h: T.number,
  url: T.string,
  assetId: T.string.nullable(),
  generationParams: T.any.nullable(),
};

/**
 * Custom Image Shape for FrameLab
 * Supports drag-dropped images with generation metadata
 */
export class ImageShapeUtil extends BaseBoxShapeUtil<ImageCustomShape> {
  static override type = 'image-custom' as const;
  static override props = imageShapeProps;

  override getDefaultProps(): ImageShapeProps {
    return {
      w: 300,
      h: 300,
      url: '',
      assetId: null,
      generationParams: null,
    };
  }

  override canResize = () => true;
  override canBind = () => false;

  // Render the shape
  override component(shape: ImageCustomShape) {
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
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '4px',
            backgroundColor: '#f0f0f0',
          }}
        >
          {shape.props.url ? (
            <img
              src={shape.props.url}
              alt="Canvas image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              draggable={false}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px',
              }}
            >
              Loading...
            </div>
          )}

          {/* Show generation badge if this was AI-generated */}
          {shape.props.generationParams && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                pointerEvents: 'none',
              }}
            >
              AI Generated
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  // Indicator for the shape (border when selected)
  override indicator(shape: ImageCustomShape) {
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

