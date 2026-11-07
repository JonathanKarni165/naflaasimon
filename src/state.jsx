import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

const DEFAULT_FILTERS = { subject: 'מתמטיקה', topic: '', level: '', mode: 'any', city: '', origin: null, sort: 'best', maxPrice: 0, maxKm: 0, q: '', place: '' };

export function AppProvider({ children }) {
  const [route, setRoute] = useState(parseRoute(window.location.hash));
  const [user, setUser] = useState(api.auth.current());
  const [tutors, setTutors] = useState(null);
  const [groups, setGroups] = useState(null);
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
    } catch (e) {
      setToast({ text: 'לא הצלחנו לטעון נתונים: ' + e.message, bad: true });
      setTutors((t) => t || []); setGroups((g) => g || []);
    }
  }, []);
  useEffect(() => { reload(); }, [reload, user?.id]);
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
    api, route, user, tutors, groups, reload, version, notify, toast,
    loginOpen, setLoginOpen, loginReason, requireLogin,
    filters, setFilters, resetFilters: () => setFilters(DEFAULT_FILTERS),
  }), [route, user, tutors, groups, reload, version, notify, toast, loginOpen, loginReason, requireLogin, filters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Runs an async loader when deps change. Returns [data, loading, error, refresh]. */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve().then(fn).then(
      (data) => live && setState({ data, loading: false, error: null }),
      (error) => live && setState({ data: null, loading: false, error }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return [state.data, state.loading, state.error, () => setN((x) => x + 1)];
}
