# FrameLab Deployment Guide

## Pre-Deployment Checklist

### Frontend

- [x] Production build succeeds (`npm run build`)
- [x] No TypeScript errors
- [x] No console errors in production build
- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Test production build locally (`npm run preview`)
- [ ] Verify all assets load correctly

### Backend

- [x] Production build succeeds (`npm run build`)
- [x] No TypeScript errors
- [ ] Set production `FAL_KEY` environment variable
- [ ] Set production `CORS_ORIGIN` to frontend URL
- [ ] Test with `npm start`
- [ ] Verify health endpoint responds

## Deployment Options

### Frontend Deployment

#### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy from frontend directory:
   ```bash
   cd frontend
   vercel
   ```

3. Follow prompts:
   - Project name: framelab
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

4. Set environment variables in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

5. Redeploy:
   ```bash
   vercel --prod
   ```

**Live URL:** `https://framelab.vercel.app`

#### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Deploy:
   ```bash
   cd frontend
   netlify deploy --prod
   ```

3. Configuration:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. Environment variables:
   - `VITE_API_URL`: Your backend URL

#### Option 3: GitHub Pages

1. Add to `frontend/vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/framelab/', // Your repo name
     // ... rest of config
   });
   ```

2. Build:
   ```bash
   cd frontend
   npm run build
   ```

3. Deploy `dist` folder to gh-pages branch

**Note:** GitHub Pages is HTTPS-only, backend must also be HTTPS.

### Backend Deployment

#### Option 1: Railway (Recommended)

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Initialize from backend directory:
   ```bash
   cd backend
   railway init
   ```

4. Set environment variables:
   ```bash
   railway variables set FAL_KEY="your_api_key"
   railway variables set CORS_ORIGIN="https://your-frontend.vercel.app"
   ```

5. Deploy:
   ```bash
   railway up
   ```

**Railway will:**
- Auto-detect Node.js
- Install dependencies
- Run build script
- Start with `npm start`

**Live URL:** `https://your-app.up.railway.app`

#### Option 2: Render

1. Create account at render.com
2. New Web Service
3. Connect GitHub repo
4. Settings:
   - Build command: `cd backend && npm install && npm run build`
   - Start command: `cd backend && npm start`
   - Environment: Node

5. Environment variables:
   - `FAL_KEY`
   - `CORS_ORIGIN`

#### Option 3: Fly.io

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Create app:
   ```bash
   cd backend
   fly launch
   ```

4. Set secrets:
   ```bash
   fly secrets set FAL_KEY="your_key"
   fly secrets set CORS_ORIGIN="https://your-frontend.vercel.app"
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

## Environment Variables

### Frontend

Create `.env.production` in frontend:
```bash
VITE_API_URL=https://your-backend.railway.app
```

### Backend

Set in deployment platform:
```bash
FAL_KEY=c07e8f8b-ad8f-4ced-9ff5-7373741e630f:e1d9e2cf76d576e052a88f67513b408d
PORT=3001
CORS_ORIGIN=https://your-frontend.vercel.app
NODE_ENV=production
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-backend.railway.app/health
```

Expected:
```json
{"status":"ok","timestamp":"..."}
```

### 2. CORS Test

Open browser console on frontend:
```javascript
fetch('https://your-backend.railway.app/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'test' })
})
```

Should not show CORS errors.

### 3. Full Workflow

1. Open production frontend URL
2. Drop an image
3. Create prompt box
4. Generate images
5. Export canvas
6. Toggle 3D view

All should work identically to local.

## Performance Optimization

### Frontend

**Enable compression in Vercel/Netlify:**
Both platforms auto-enable gzip/brotli.

**Add caching headers:**
Static assets cached for 1 year (automatic).

**Optimize images:**
Consider adding image optimization:
```bash
npm install -D vite-plugin-imagemin
```

### Backend

**Add compression:**
```bash
npm install compression
```

```typescript
import compression from 'compression';
app.use(compression());
```

**Add rate limiting:**
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

## Monitoring

### Frontend

**Vercel Analytics:**
Add to `frontend/package.json`:
```json
{
  "dependencies": {
    "@vercel/analytics": "^1.0.0"
  }
}
```

Add to `App.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### Backend

**Logging Service:**
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- DataDog for APM

**Health Monitoring:**
Use UptimeRobot or similar to ping `/health` every 5 minutes.

## SSL/HTTPS

Both frontend and backend need HTTPS in production:

- **Vercel/Netlify:** Auto-provides SSL
- **Railway/Render:** Auto-provides SSL
- **Custom domain:** Add SSL certificate

Ensure all API calls use `https://` URLs.

## Custom Domain Setup

### Frontend (Vercel)

1. Go to project settings
2. Add custom domain
3. Update DNS records (provided by Vercel)
4. Wait for SSL certificate

### Backend (Railway)

1. Go to project settings
2. Add custom domain
3. Update DNS:
   - Type: CNAME
   - Name: api (for api.yourdomain.com)
   - Value: Provided by Railway

## Scaling Considerations

### Frontend

- **Static hosting:** Unlimited scale
- **CDN:** Global distribution
- **No server costs:** Only bandwidth

### Backend

**Railway scaling:**
- Vertical: Upgrade instance size
- Horizontal: Add replicas (Pro plan)

**Load balancing:**
If needed, use Railway's built-in load balancing or add Cloudflare.

## Cost Estimates

### Development (Free)
- Frontend: Free (local)
- Backend: Free (local)
- FAL API: Free tier (limited)

### Production (Monthly)

**Frontend:**
- Vercel/Netlify: $0-20/mo (hobby tier sufficient)

**Backend:**
- Railway: $5-20/mo (starter plan)
- Render: $7/mo (starter)

**FAL AI:**
- Pay-per-use based on generations
- ~$0.01-0.05 per image
- Monitor usage carefully

**Total: ~$12-40/month** for low-traffic app

## Rollback Plan

### Frontend

**Vercel:**
```bash
vercel rollback
```

Or use dashboard to revert to previous deployment.

### Backend

**Railway:**
Use dashboard to redeploy previous version.

**Manual:**
Keep last working dist folder:
```bash
cp -r dist dist.backup
```

## Security Hardening

### 1. Add Helmet (Backend)

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

### 2. Add CSRF Protection

For forms/POST requests:
```bash
npm install csurf
```

### 3. Rate Limiting

Already covered above - highly recommended for production.

### 4. Input Sanitization

Add validation library:
```bash
npm install validator
```

### 5. Environment Variables

Never commit:
- `.env` files
- API keys
- Secrets

Use platform-specific secret management.

## Monitoring & Alerts

### Set Up Alerts

**Backend Down:**
```bash
curl https://uptimerobot.com/api/...
```

**High Error Rate:**
Use Sentry alerts for > 10 errors/minute

**High Costs:**
Monitor FAL API usage dashboard

## Backup & Recovery

### Canvas Data

If adding database:
- Daily backups
- Point-in-time recovery
- Replication across regions

### Generated Images

Consider:
- Storing image URLs in database
- Caching popular generations
- CDN for image delivery

## CI/CD Pipeline (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install && npm run build
      - run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Production URL Structure

Recommended:
```
Frontend: https://framelab.yourdomain.com
Backend:  https://api-framelab.yourdomain.com
```

Or subdomain:
```
Frontend: https://app.framelab.com
Backend:  https://api.framelab.com
```

## Go-Live Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed and accessible
- [ ] Health endpoint returns 200 OK
- [ ] CORS configured correctly
- [ ] FAL API key set and working
- [ ] SSL certificates active (HTTPS)
- [ ] Custom domain configured (optional)
- [ ] Monitoring/alerts set up
- [ ] Error tracking enabled
- [ ] Test full user workflow
- [ ] Document production URLs
- [ ] Share with users!

## Maintenance

### Regular Tasks

- **Weekly:** Check error logs
- **Monthly:** Review FAL API usage/costs
- **Quarterly:** Update dependencies
- **As needed:** Scale resources

### Updating Dependencies

```bash
# Check outdated
npm outdated

# Update
npm update

# Test
npm run build
npm run dev
```

### Hotfix Process

1. Fix bug locally
2. Test thoroughly
3. Build and verify
4. Deploy to production
5. Monitor for 1 hour
6. Document in changelog

## Success Metrics

Track:
- Daily active users
- Generations per day
- Average session time
- Export count
- Error rate
- API response time

## Support

For deployment issues:
- Check platform documentation
- Review logs carefully
- Test locally first
- Verify environment variables

🚀 Happy deploying!

