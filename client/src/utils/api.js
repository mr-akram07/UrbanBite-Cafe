// Backend API Base URL helper
// Defaults to empty string on localhost (uses Vite proxy /api -> http://localhost:5000)
// Or uses VITE_API_URL if defined in environment
// Automatic fallback to live Render backend when deployed online (e.g. Vercel)
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = 
  import.meta.env.VITE_API_URL || 
  (isLocalhost ? '' : 'https://urbanbite-cafe-9qhh.onrender.com');

export function apiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
}
