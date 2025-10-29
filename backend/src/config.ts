import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  falApiKey: process.env.FAL_KEY || 'c07e8f8b-ad8f-4ced-9ff5-7373741e630f:e1d9e2cf76d576e052a88f67513b408d',
  corsOrigin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
};

