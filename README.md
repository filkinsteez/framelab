# FrameLab

A drag-and-drop canvas application built on tldraw with AI image generation (FAL + Nano Banana), GLSL shader effects, and 3D visualization.

## Features

- **Interactive Canvas**: Built on tldraw with pan, zoom, and transform controls
- **Drag & Drop**: Drop images and videos directly onto the canvas
- **AI Generation**: Generate images using Nano Banana model via FAL AI
- **GLSL Effects**: Ripple shader effects on shape drops
- **3D Viewer**: View your canvas in 3D space
- **Export**: Export canvas as PNG or JPEG with high resolution

## Project Structure

```
/frontend - React + Vite + TypeScript frontend
/backend  - Node.js + Express backend proxy for FAL AI
/Docs     - Project documentation
```

## Prerequisites

- Node.js 18+ and npm
- FAL AI API key (get from https://fal.ai)

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your FAL API key:
   ```bash
   echo "FAL_KEY=your_fal_api_key_here" > .env
   echo "PORT=3001" >> .env
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

   The server will run on http://localhost:3001

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```bash
   echo "VITE_API_URL=http://localhost:3001" > .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will run on http://localhost:5173

## Usage

### Basic Canvas Operations

- **Pan**: Click and drag the canvas background
- **Zoom**: Use mouse wheel or pinch gesture
- **Select**: Click on any shape to select it
- **Transform**: Drag corners to resize, rotate handle to rotate
- **Delete**: Select a shape and press Delete/Backspace

### Adding Images

- Drag and drop image files directly onto the canvas
- Supported formats: PNG, JPEG, GIF, WebP
- Images auto-scale to fit on canvas
- Ripple effect plays on drop

### AI Generation

1. Click the **Prompt** button in the toolbar
2. A prompt box will appear on the canvas
3. Enter your description (e.g., "a cat wearing a spacesuit")
4. Click **Generate**
5. Wait for generation to complete
6. A gallery of 4 variations will appear
7. Click any image in the gallery to add it to your canvas

### Gallery

- Click **Gallery** button to manually add an empty gallery
- Generated images automatically populate galleries
- Click any thumbnail to create a new image shape
- Click the × on thumbnails to remove them

### Export

- **PNG**: Click the PNG button for lossless export with transparency
- **JPEG**: Click the JPEG button for smaller file size
- Exports are 2x canvas resolution for high quality

### 3D View

- Click the **3D View** button to toggle 3D visualization
- Your canvas appears as a textured plane in 3D space
- Drag to rotate, scroll to zoom
- The 3D view updates in real-time

## Custom Shapes

FrameLab includes custom tldraw shapes:

- **ImageShape**: Displays images with optional AI generation metadata
- **VideoShape**: Embeds video files with playback controls
- **PromptBoxShape**: Interactive AI generation prompt interface
- **GalleryShape**: Grid display of generated image variations

## Architecture

### Frontend

- **React 18** with TypeScript
- **tldraw** for canvas and shape management
- **Three.js** + React Three Fiber for 3D rendering
- **WebGL** for GLSL shader effects

### Backend

- **Express** server
- **FAL AI** client for Nano Banana integration
- CORS-enabled proxy to protect API keys
- Request queuing and error handling

## Development

### Frontend Development

```bash
cd frontend
npm run dev
```

Hot module reloading is enabled. Changes to components will reflect immediately.

### Backend Development

```bash
cd backend
npm run dev
```

Uses nodemon + tsx for TypeScript hot reloading.

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### "WebGL not supported" Error

Make sure your browser supports WebGL. Try enabling hardware acceleration in browser settings.

### Generation Fails

1. Check that the backend is running
2. Verify FAL API key in `backend/.env`
3. Check browser console for CORS errors
4. Ensure backend URL is correct in `frontend/.env.local`

### CORS Errors

Make sure the backend is running and the CORS origin matches your frontend URL (default: http://localhost:5173).

### Shapes Not Appearing

1. Check browser console for errors
2. Make sure all dependencies are installed
3. Try refreshing the page
4. Check that custom shapes are properly registered

## Performance

- Images are converted to data URIs for inline storage
- Max file size: 10MB per file
- Recommended canvas size: < 4000x4000px
- Gallery displays up to 100 images efficiently

## API Endpoints

### POST /api/generate

Generate images using Nano Banana model.

**Request:**
```json
{
  "prompt": "a cat in space",
  "imageUrl": "optional_base_image_url",
  "strength": 0.75,
  "guidanceScale": 7.5,
  "numImages": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "url": "https://...",
        "width": 1024,
        "height": 1024,
        "contentType": "image/jpeg"
      }
    ],
    "seed": 12345,
    "prompt": "a cat in space"
  }
}
```

## License

ISC

## Credits

- Built with [tldraw](https://tldraw.dev)
- AI generation powered by [FAL AI](https://fal.ai)
- 3D rendering with [Three.js](https://threejs.org)

