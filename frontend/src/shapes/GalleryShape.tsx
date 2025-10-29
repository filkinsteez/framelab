import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  useEditor,
  type TLBaseShape,
  type RecordProps,
} from 'tldraw';

// Define the shape props
export type GalleryShapeProps = {
  w: number;
  h: number;
  images: Array<{
    url: string;
    seed: number;
    selected?: boolean;
  }>;
  columns: number;
};

// Define the shape type
export type GalleryShape = TLBaseShape<'gallery', GalleryShapeProps>;

// Validator for the shape props
export const galleryShapeProps: RecordProps<GalleryShape> = {
  w: T.number,
  h: T.number,
  images: T.arrayOf(T.any),
  columns: T.number,
};

/**
 * Gallery Shape - Display grid of generated images
 */
export class GalleryShapeUtil extends BaseBoxShapeUtil<GalleryShape> {
  static override type = 'gallery' as const;
  static override props = galleryShapeProps;

  override getDefaultProps(): GalleryShapeProps {
    return {
      w: 600,
      h: 600,
      images: [],
      columns: 2,
    };
  }

  override canResize = () => true;
  override canBind = () => false;

  // Render the shape
  override component(shape: GalleryShape) {
    return <GalleryComponent shape={shape} />;
  }

  // Indicator for the shape
  override indicator(shape: GalleryShape) {
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
function GalleryComponent({ shape }: { shape: GalleryShape }) {
  const editor = useEditor();

  const handleImageClick = (index: number) => {
    const image = shape.props.images[index];
    if (!image) return;

    // Create a new ImageShape with the selected image
    const newX = shape.x + shape.props.w + 50;
    const newY = shape.y + (index * 150);

    editor.createShape({
      type: 'image-custom',
      x: newX,
      y: newY,
      props: {
        w: 400,
        h: 400,
        url: image.url,
        assetId: null,
        generationParams: {
          prompt: 'Generated',
          seed: image.seed,
          timestamp: Date.now(),
        },
      },
    });
  };

  const handleDeleteImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    const newImages = [...shape.props.images];
    newImages.splice(index, 1);

    editor.updateShape<GalleryShape>({
      id: shape.id,
      type: 'gallery',
      props: {
        images: newImages,
      },
    });
  };

  const gridTemplateColumns = `repeat(${shape.props.columns}, 1fr)`;

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
          overflow: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>
          Generated Images ({shape.props.images.length})
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns,
            gap: '12px',
          }}
        >
          {shape.props.images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              style={{
                position: 'relative',
                aspectRatio: '1',
                cursor: 'pointer',
                borderRadius: '4px',
                overflow: 'hidden',
                border: image.selected ? '3px solid #4CAF50' : '1px solid #ddd',
                transition: 'border-color 0.2s',
              }}
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image.url}
                alt={`Generated ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                draggable={false}
              />

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteImage(index, e)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {shape.props.images.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              padding: '40px',
              fontSize: '13px',
            }}
          >
            No images yet. Use a Prompt Box to generate images.
          </div>
        )}
      </div>
    </HTMLContainer>
  );
}

