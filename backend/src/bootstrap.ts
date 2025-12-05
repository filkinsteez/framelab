// Bootstrap file - sets environment before any imports
// This MUST be imported first in server.ts

import { setGlobalDispatcher, ProxyAgent } from 'undici';

// Disable SSL verification for development (fixes certificate issues on some systems)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔓 SSL verification disabled for development');
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

// Configure proxy if set in environment
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  console.log('🌐 Configuring proxy:', proxyUrl);
  const proxyAgent = new ProxyAgent({
    uri: proxyUrl,
    requestTls: {
      rejectUnauthorized: false, // Allow self-signed certs through proxy
    },
  });
  setGlobalDispatcher(proxyAgent);
  console.log('✅ Proxy agent configured for all fetch requests');
} else {
  console.log('ℹ️ No proxy configured');
}
