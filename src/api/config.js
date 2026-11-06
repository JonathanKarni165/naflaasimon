// Public Supabase connection details. The publishable (anon) key is meant to be in the browser:
// what each visitor may read or write is enforced by row level security in supabase/schema.sql.
// Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) override these.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
