const isDev = import.meta.env.DEV;

export const config = {
  // In development, use local backend. In production, backend features are disabled.
  apiUrl: isDev ? 'http://localhost:3001' : '',
  isDevelopment: isDev,
  hasBackend: isDev, // Only true when running locally
};
