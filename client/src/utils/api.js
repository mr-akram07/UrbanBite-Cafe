// Backend API Base URL helper
// Defaults to empty string (uses Vite proxy /api to http://localhost:5000)
// Or uses VITE_API_URL from .env if configured for separate deployment
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
}
