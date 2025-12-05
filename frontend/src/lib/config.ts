const isDev = import.meta.env.DEV;

export const config = {
  // In development, use local backend. In production, use Vercel serverless functions.
  apiUrl: isDev ? 'http://localhost:3001' : '',
  isDevelopment: isDev,
};
