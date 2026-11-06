// Picks the backend: Supabase when it is configured (api/config.js), otherwise the in-browser demo.
import * as demo from './demo.js';
import { SUPABASE_URL } from './config.js';

const api = SUPABASE_URL ? await import('./supabase.js') : demo;
export default api;
