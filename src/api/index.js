// Picks the backend: Supabase when it is configured (api/config.js), otherwise the in-browser demo.
// Every write that carries user text goes through the spam/profanity filter first (lib/moderation.js);
// the database runs the same rules again (supabase/moderation.sql), so this is only for a fast message.
import * as demo from './demo.js';
import { SUPABASE_URL } from './config.js';
import { RULES, assertClean } from '../lib/moderation.js';

const backend = SUPABASE_URL ? await import('./supabase.js') : demo;

const api = { ...backend };
for (const [name, fields] of Object.entries(RULES)) {
  const fn = backend[name];
  if (typeof fn !== 'function') continue;
  api[name] = async (...args) => {
    const user = backend.auth?.current?.() ?? null;
    if (!user?.isAdmin) assertClean(fields(...args));
    return fn(...args);
  };
}
export default api;
