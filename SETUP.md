# FrameLab Setup Guide

## Quick Start (All Platforms)

### 1. Install Dependencies

From the project root:
```bash
npm run install:all
```

This will install dependencies for both frontend and backend.

### 2. Configure Environment

The backend already has the FAL API key configured. If you need to change it:

**Backend (.env):**
```bash
cd backend
# Edit .env file
FAL_KEY=your_api_key_here
PORT=3001
```

**Frontend (.env.local):**
```bash
cd frontend
# Edit .env.local file
VITE_API_URL=http://localhost:3001
```

### 3. Start Development Servers

From the project root:
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

**Or start them separately:**

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
npm run dev:frontend
```

### 4. Open the App

Navigate to: http://localhost:5173

## Manual Setup

### Backend Only

```bash
cd backend
npm install
npm run dev
```

Server runs on http://localhost:3001

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

App runs on http://localhost:5173

## Verification

### Check Backend

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### Check Frontend

Open browser to http://localhost:5173 - you should see the tldraw canvas.

## Troubleshooting

### Port Already in Use

**Backend (3001):**
Change PORT in `backend/.env`

**Frontend (5173):**
Change port in `frontend/vite.config.ts`

### CORS Errors

Make sure:
1. Backend is running on port 3001
2. Frontend is running on port 5173
3. Check CORS_ORIGIN in backend config matches frontend URL

### Module Not Found

Run `npm run install:all` again from the project root.

### FAL API Errors

1. Verify API key in `backend/.env`
2. Check FAL AI dashboard for quota/limits
3. Check backend console logs for detailed errors

## Development Tips

- Backend auto-reloads on file changes (nodemon + tsx)
- Frontend hot-reloads on file changes (Vite HMR)
- Check browser console for frontend errors
- Check terminal for backend errors
- Use browser DevTools Network tab to debug API calls

## Next Steps

Once running:
1. Try dragging an image onto the canvas
2. Click "Prompt" button to add a generation box
3. Enter a prompt and click "Generate"
4. Explore the 3D view toggle
5. Export your creation

Enjoy building with FrameLab!

