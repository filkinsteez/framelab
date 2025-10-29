# FrameLab API Documentation

## Base URL

**Development:** `http://localhost:3001`
**Production:** Configure based on deployment

## Authentication

No authentication required for the proxy server. The FAL API key is stored server-side in environment variables.

## Endpoints

### Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

---

### Generate Images

Generate images using the Nano Banana model via FAL AI.

**Endpoint:** `POST /api/generate`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  prompt: string;           // Required: Description of desired image
  imageUrl?: string;        // Optional: Base image URL for img2img
  strength?: number;        // Optional: 0-1, default 0.75 (img2img strength)
  guidanceScale?: number;   // Optional: 1-20, default 7.5 (prompt adherence)
  numImages?: number;       // Optional: 1-8, default 4 (number of variations)
}
```

**Example Request:**
```json
{
  "prompt": "a futuristic city at sunset, cyberpunk style",
  "strength": 0.75,
  "guidanceScale": 7.5,
  "numImages": 4
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "url": "https://fal.media/files/...",
        "width": 1024,
        "height": 1024,
        "contentType": "image/jpeg"
      }
    ],
    "seed": 123456789,
    "prompt": "a futuristic city at sunset, cyberpunk style"
  }
}
```

**Error Response:** `400 Bad Request` or `500 Internal Server Error`
```json
{
  "error": "Prompt is required and must be a string"
}
```

---

### Get Generation Status

Check the status of a generation request (for async workflows).

**Endpoint:** `GET /api/generate/:requestId`

**Parameters:**
- `requestId` (path parameter): The request ID returned by FAL queue

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "logs": [...],
    "result": {...}
  }
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Status check failed"
}
```

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid parameters |
| 500 | Internal Server Error | FAL API error, network issues, invalid API key |
| 503 | Service Unavailable | FAL service down, rate limited |

## Rate Limiting

Rate limits are determined by your FAL AI plan:
- Free tier: Limited requests per minute
- Pro tier: Higher limits

The backend does not implement additional rate limiting.

## CORS

CORS is enabled for the configured origin (default: `http://localhost:5173`).

To change allowed origins, update `CORS_ORIGIN` environment variable in backend.

## Data Limits

- Request body size: 50MB (to support large data URIs)
- Image URLs: Must be publicly accessible
- Timeout: 60 seconds per request

## FAL AI Integration

This backend uses the FAL AI SDK to interact with the Nano Banana model.

**Model:** `fal-ai/fast-sdxl`

**SDK Documentation:** https://fal.ai/docs

### Request Flow

1. Client sends POST to `/api/generate`
2. Backend validates request
3. Backend calls FAL API with credentials
4. FAL processes generation (queue-based)
5. Backend receives result
6. Backend returns images to client

### Supported Parameters

The following parameters are passed through to FAL:

- `prompt` (required)
- `image_url` (for img2img)
- `strength` (img2img strength)
- `guidance_scale` (CFG scale)
- `num_images` (batch size)

Additional FAL parameters can be added in `backend/src/services/fal-service.ts`.

## Example Integration

### JavaScript/TypeScript

```typescript
// Generate images
const response = await fetch('http://localhost:3001/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful landscape',
    numImages: 4
  })
});

const data = await response.json();

if (data.success) {
  console.log('Generated images:', data.data.images);
}
```

### cURL

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a serene mountain lake",
    "guidanceScale": 8.0,
    "numImages": 4
  }'
```

### Python

```python
import requests

response = requests.post('http://localhost:3001/api/generate', json={
    'prompt': 'abstract art',
    'numImages': 4
})

data = response.json()
if data['success']:
    for img in data['data']['images']:
        print(f"Image URL: {img['url']}")
```

## Security

- API keys never exposed to frontend
- All FAL requests go through backend proxy
- CORS restricts origins
- Input validation on all endpoints
- No authentication (add if deploying publicly)

## Monitoring

### Logs

Backend logs all requests:
```
2025-10-29T12:00:00.000Z POST /api/generate
```

Enable debug logging:
```bash
export DEBUG=framelab:*
npm run dev
```

### Health Monitoring

Poll `/health` endpoint for uptime monitoring:
```bash
*/5 * * * * curl -f http://localhost:3001/health || alert
```

## Extending the API

### Adding New Generation Models

Edit `backend/src/services/fal-service.ts`:

```typescript
export async function generateWithModel(model: string, params: any) {
  const result = await fal.subscribe(model, {
    input: params,
  });
  return result;
}
```

### Adding Webhooks

To receive async completion notifications:

1. Set up webhook endpoint in your backend
2. Configure FAL webhook URL
3. Handle webhook POST requests
4. Notify frontend via WebSocket or polling

### Custom Middleware

Add to `backend/src/middleware/`:

```typescript
// rate-limiter.ts
export function rateLimiter(req, res, next) {
  // Implement rate limiting logic
  next();
}
```

Register in `server.ts`:
```typescript
import { rateLimiter } from './middleware/rate-limiter.js';
app.use(rateLimiter);
```

## Performance Tips

1. **Optimize images before generation** - Smaller base images = faster
2. **Use fewer images** - numImages affects generation time
3. **Cache results** - Store generated images to avoid re-generation
4. **Batch requests** - Don't spam the API
5. **Monitor quotas** - Check FAL dashboard for usage

## Troubleshooting API Issues

### 400 Bad Request
- Check request body format
- Ensure prompt is not empty
- Validate parameter types

### 500 Internal Server Error
- Check backend logs
- Verify FAL API key
- Check FAL service status
- Test with simpler prompt

### CORS Errors
- Confirm backend CORS_ORIGIN matches frontend
- Check preflight OPTIONS requests
- Verify ports are correct

### Timeout Errors
- Complex prompts take longer
- Check FAL queue status
- Reduce num_images
- Simplify prompt

## API Versioning

Current version: v1 (implicit)

Future versions can be added as:
- `/api/v2/generate`
- Keep v1 for backwards compatibility

