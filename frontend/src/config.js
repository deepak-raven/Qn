const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
let cleanBase = rawApiBase.trim().replace(/\/+$/, '');
if (!cleanBase.endsWith('/api')) {
  cleanBase = `${cleanBase}/api`;
}
export const API_BASE = cleanBase;

console.log(`[Config] API Base URL: ${API_BASE}`);

