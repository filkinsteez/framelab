import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import generateRoutes from './routes/generate.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Support large data URIs
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', generateRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`FrameLab backend server running on port ${config.port}`);
  console.log(`CORS enabled for: ${config.corsOrigin}`);
});

