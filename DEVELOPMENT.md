# FrameLab Development Guide

## Project Architecture

### Frontend (`/frontend`)

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- tldraw (canvas library)
- Three.js + React Three Fiber (3D rendering)
- WebGL (shader effects)

**Key Directories:**
- `/src/components` - React components
- `/src/shapes` - Custom tldraw shapes
- `/src/shaders` - GLSL shader code
- `/src/lib` - Utilities and services
- `/src/hooks` - Custom React hooks

**Custom Shapes:**
1. **ImageShape** - Displays images with optional AI metadata
2. **VideoShape** - Embeds videos with controls
3. **PromptBoxShape** - Interactive AI prompt interface
4. **GalleryShape** - Grid of generated images

### Backend (`/backend`)

**Tech Stack:**
- Node.js + TypeScript
- Express (web framework)
- FAL AI client (image generation)

**Key Directories:**
- `/src/routes` - API endpoints
- `/src/services` - Business logic (FAL integration)
- `/src/middleware` - Express middleware

**API Endpoints:**
- `POST /api/generate` - Generate images
- `GET /api/generate/:id` - Get generation status
- `GET /health` - Health check

## Development Workflow

### Running Locally

**Option 1: Both servers together**
```bash
npm run dev
```

**Option 2: Separate terminals**

Terminal 1:
```bash
npm run dev:backend
```

Terminal 2:
```bash
npm run dev:frontend
```

### Hot Reloading

- **Frontend**: Vite HMR - changes reflect instantly
- **Backend**: nodemon - server restarts on file changes

### Debugging

**Frontend:**
- Open Chrome DevTools (F12)
- Check Console for errors
- Use React DevTools extension
- Network tab for API calls

**Backend:**
- Check terminal output
- Logs show all requests
- Use Node debugger in VS Code

## Code Structure

### Adding a New Custom Shape

1. Create shape file in `/frontend/src/shapes/`
2. Define shape props interface
3. Create shape validator with `RecordProps`
4. Extend `BaseBoxShapeUtil`
5. Implement `component()` and `indicator()`
6. Register in `Canvas.tsx` customShapeUtils array

Example:
```typescript
// MyShape.tsx
import { BaseBoxShapeUtil, type TLBaseShape, type RecordProps, T } from 'tldraw';

export type MyShapeProps = {
  w: number;
  h: number;
  text: string;
};

export type MyShape = TLBaseShape<'my-shape', MyShapeProps>;

export const myShapeProps: RecordProps<MyShape> = {
  w: T.number,
  h: T.number,
  text: T.string,
};

export class MyShapeUtil extends BaseBoxShapeUtil<MyShape> {
  static override type = 'my-shape' as const;
  static override props = myShapeProps;
  
  override getDefaultProps() {
    return { w: 200, h: 100, text: '' };
  }
  
  override component(shape: MyShape) {
    return <div>{shape.props.text}</div>;
  }
  
  override indicator(shape: MyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

### Adding a New API Endpoint

1. Create route handler in `/backend/src/routes/`
2. Add business logic in `/backend/src/services/`
3. Register route in `server.ts`

Example:
```typescript
// routes/myroute.ts
import { Router, type Request, type Response } from 'express';

const router = Router();

router.post('/myendpoint', async (req: Request, res: Response) => {
  try {
    const result = { success: true };
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
```

### Adding a Shader Effect

1. Create shader files in `/frontend/src/shaders/`
   - `.vert` for vertex shader
   - `.frag` for fragment shader
2. Update ShaderManager to load new shader
3. Add controls in SettingsPanel

## Testing

### Manual Testing Checklist

- [ ] Drag & drop image file
- [ ] Drag & drop video file
- [ ] Create prompt box
- [ ] Generate images (requires backend + FAL key)
- [ ] Click gallery thumbnail
- [ ] Export PNG
- [ ] Export JPEG
- [ ] Toggle 3D view
- [ ] Open settings panel
- [ ] Transform shapes (move, resize, rotate)
- [ ] Use tldraw drawing tools
- [ ] Check ripple effect on drop

### API Testing

Test the backend with curl:

```bash
# Health check
curl http://localhost:3001/health

# Generate (requires FAL key configured)
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a cat in space","numImages":4}'
```

## Performance Optimization

### Frontend

- Images converted to data URIs (10MB limit enforced)
- Shapes lazy-rendered by tldraw
- WebGL cleanup on unmount
- Settings changes don't trigger re-renders

### Backend

- Request queuing handled by FAL SDK
- CORS configured for security
- JSON body size limit: 50MB (for data URIs)

## Common Issues

### WebGL Context Lost

The shader overlay may fail if:
- Too many browser tabs open
- GPU resources exhausted
- Browser doesn't support WebGL

Solution: Reload page, close other tabs

### Large File Uploads

Files > 10MB are rejected. To increase:

Edit `frontend/src/lib/file-utils.ts`:
```typescript
export function validateFileSize(file: File, maxSizeMB: number = 20) {
  // Changed from 10 to 20
}
```

### CORS Errors

Make sure:
1. Backend is running (port 3001)
2. Frontend is on port 5173
3. No conflicting processes on those ports

## Building for Production

```bash
# Build both
npm run build

# Or separately
npm run build:frontend
npm run build:backend
```

**Frontend output:** `frontend/dist/`
**Backend output:** `backend/dist/`

### Deployment

**Frontend:**
- Deploy `frontend/dist` to static hosting (Vercel, Netlify, etc.)
- Update `VITE_API_URL` to production backend URL

**Backend:**
- Deploy to Node.js hosting (Railway, Render, Fly.io, etc.)
- Set environment variables:
  - `FAL_KEY`
  - `PORT`
  - `CORS_ORIGIN` (production frontend URL)

## Code Style

- TypeScript strict mode enabled
- Use `type` imports for type-only imports
- Functional components with hooks
- Props interfaces for all components
- Async/await for promises
- Error boundaries for React errors

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Build to verify no TypeScript errors
5. Submit PR with description

## Resources

- [tldraw Documentation](https://tldraw.dev/docs)
- [FAL AI Documentation](https://fal.ai/docs)
- [Three.js Documentation](https://threejs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [WebGL Fundamentals](https://webglfundamentals.org/)

