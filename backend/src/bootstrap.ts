// Bootstrap file - sets environment before any imports
// This MUST be imported first in server.ts

// Disable SSL verification for development (fixes certificate issues on some systems)
// Node.js 18+ native fetch respects this environment variable automatically
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔓 SSL verification disabled for development');
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

