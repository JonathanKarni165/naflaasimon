import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from './api/index.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function parseRoute(hash) {
  const h = (hash || '').replace(/^#/, '');
  const m = h.match(/^(tutor|group)-(.+)$/);
  if (m) return { name: m[1], id: m[2] };
  return { name: h || 'home' };
}

export function go(name) {
  if (('#' + name) === window.location.hash || (!name && !window.location.hash)) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = name;
  }
}

const DEFAULT_FILTERS = { subject: '', topic: '', level: '', mode: 'any', city: '', origin: null, sort: 'best', maxPrice: 0, maxKm: 0, q: '', place: '' };

export function AppProvider({ children }) {
  const [route, setRoute] = useState(parseRoute(window.location.hash));
  const [user, setUser] = useState(api.auth.current());
  // The last list we saw is shown at once on the next visit, then refreshed in the background.
  const [tutors, setTutors] = useState(() => readCache()?.tutors || null);
  const [groups, setGroups] = useState(() => readCache()?.groups || null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState('');
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const on = () => { setRoute(parseRoute(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => api.auth.onChange((u) => { setUser(u); if (u) setLoginOpen(false); }), []);

  const reload = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([api.listTutors(), api.listGroups()]);
      setTutors(t); setGroups(g); setVersion((v) => v + 1);
      writeCache({ tutors: t, groups: g });
    } catch (e) {
      // Offline with a saved list: keep showing it, the banner already says why nothing is new.
      if (!navigator.onLine && readCache()) return;
      setToast({ text: 'לא הצלחנו לטעון נתונים: ' + e.message, bad: true });
      setTutors((t) => t || []); setGroups((g) => g || []);
    }
  }, []);
  useEffect(() => { reload(); }, [reload, user?.id]);
  // Connection lost / back: show a banner, and refresh as soon as we're back online.
  useEffect(() => {
    const up = () => { setOnline(true); reload(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [reload]);
  // Coming back to a tab left open for a while refreshes the data.
  useEffect(() => {
    let hiddenAt = 0;
    const vis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) reload();
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [reload]);
  // Live: when anyone changes data, refresh (debounced so a burst of changes reloads once).
  useEffect(() => {
    if (!api.subscribe) return undefined;
    let t = null;
    const off = api.subscribe(() => { clearTimeout(t); t = setTimeout(reload, 400); });
    return () => { clearTimeout(t); off(); };
  }, [reload]);

  const notify = useCallback((text, bad = false) => {
    setToast({ text, bad, at: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const requireLogin = useCallback((reason) => {
    if (user) return true;
    setLoginReason(reason || ''); setLoginOpen(true); return false;
  }, [user]);

  const value = useMemo(() => ({
    api, route, user, tutors, groups, reload, version, notify, toast, online,
    loginOpen, setLoginOpen, loginReason, requireLogin,
    filters, setFilters, resetFilters: () => setFilters(DEFAULT_FILTERS),
  }), [route, user, tutors, groups, reload, version, notify, toast, online, loginOpen, loginReason, requireLogin, filters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Runs an async loader when deps change. Returns [data, loading, error, refresh]. */
const LIST_CACHE = 'naflaasimon-cache-v1';
function readCache() {
  try { return JSON.parse(localStorage.getItem(LIST_CACHE) || 'null'); } catch { return null; }
}
function writeCache(v) {
  try { localStorage.setItem(LIST_CACHE, JSON.stringify(v)); } catch { /* full or blocked: just don't cache */ }
}

// Results of page loads, kept for this visit: going back to a page shows it at once and refreshes it quietly.
const LOAD_CACHE = new Map();
export function useLoad(fn, deps) {
  const key = String(fn) + JSON.stringify(deps);
  const [state, setState] = useState(() => (LOAD_CACHE.has(key)
    ? { data: LOAD_CACHE.get(key), loading: false, error: null } : { data: null, loading: true, error: null }));
  const [n, setN] = useState(0);
  // Has this hook loaded at least once? A refresh after that (e.g. after sending a message) keeps the page on
  // screen instead of swapping it for the loading coin, even when the data is legitimately null.
  const loaded = useRef(LOAD_CACHE.has(key));
  useEffect(() => {
    let live = true;
    if (LOAD_CACHE.has(key)) setState({ data: LOAD_CACHE.get(key), loading: false, error: null });
    else setState((s) => ({ ...s, loading: true }));
    Promise.resolve().then(fn).then(
      (data) => { LOAD_CACHE.set(key, data); if (live) { loaded.current = true; setState({ data, loading: false, error: null }); } },
      (error) => live && setState((s) => (s.data != null && !navigator.onLine ? { ...s, loading: false } : { data: null, loading: false, error })),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return [state.data, state.loading, state.error, () => setN((x) => x + 1), loaded.current];
}

/** The signed-in user's tutor profile (null for students). Shared by the menu, the header and the panel. */
export function useMyTutor() {
  const { api, user, version } = useApp();
  return useLoad(() => (user ? api.getMyTutor() : null), [user?.id || '', version]);
}
