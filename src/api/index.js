// Picks the backend: Supabase when its keys are set at build time, otherwise the in-browser demo.
import * as demo from './demo.js';

const api = import.meta.env.VITE_SUPABASE_URL ? await import('./supabase.js') : demo;
export default api;
