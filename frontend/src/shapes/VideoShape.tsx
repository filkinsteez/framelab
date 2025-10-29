import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLBaseShape,
  type RecordProps,
} from 'tldraw';

// Define the shape props
export type VideoShapeProps = {
  w: number;
  h: number;
  url: string;
  assetId: string | null;
};

// Define the shape type
export type VideoCustomShape = TLBaseShape<'video-custom', VideoShapeProps>;

// Validator for the shape props
export const videoShapeProps: RecordProps<VideoCustomShape> = {
  w: T.number,
  h: T.number,
  url: T.string,
  assetId: T.string.nullable(),
};

/**
 * Custom Video Shape for FrameLab
 */
export class VideoShapeUtil extends BaseBoxShapeUtil<VideoCustomShape> {
  static override type = 'video-custom' as const;
  static override props = videoShapeProps;

  override getDefaultProps(): VideoShapeProps {
    return {
      w: 640,
      h: 360,
      url: '',
      assetId: null,
    };
  }

  override canResize = () => true;
  override canBind = () => false;

  // Render the shape
  override component(shape: VideoCustomShape) {
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
            backgroundColor: '#000',
          }}
        >
          {shape.props.url ? (
            <video
              src={shape.props.url}
              controls
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
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
              Loading video...
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  // Indicator for the shape
  override indicator(shape: VideoCustomShape) {
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

