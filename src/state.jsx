import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from './api/index.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Routes are real paths (/naflaasimon/tutor/<id>) so search engines, AI tools and link previews can read each page.
// Old links with #tutor-<id> still work: they are moved to the path on load.
export const BASE = import.meta.env.BASE_URL || '/';
const ROUTE_RE = /^(search|groups|groups-marathons|about|terms|privacy|cookies|accessibility|contact|login|signup|panel(-[a-z]+)?|(tutor|group|chat)-.+)$/;

/** Route name ("tutor-abc", "search", "") to its path. */
export function to(name = '') {
  const m = String(name).match(/^(tutor|group|chat)-(.+)$/);
  // Trailing slash: GitHub Pages serves each prerendered page as <path>/index.html.
  return BASE + (m ? `${m[1]}/${encodeURIComponent(m[2])}/` : name ? `${name}/` : '');
}

/** Path back to a route name, or null when the path is not one of ours. */
export function nameOfPath(path) {
  if (!path.startsWith(BASE) && path + '/' !== BASE) return null;
  const rest = path.slice(BASE.length).replace(/\/+$/, '').replace(/\/index\.html$|^index\.html$/, '');
  const m = rest.match(/^(tutor|group|chat)\/([^/]+)$/);
  if (m) return `${m[1]}-${decodeURIComponent(m[2])}`;
  return rest;
}

export function parseRoute(name) {
  const h = (name || '').replace(/^#/, '');
  const m = h.match(/^(tutor|group|chat)-(.+)$/);
  if (m) return { name: m[1], id: m[2] };
  return { name: h || 'home' };
}

/** The current route name, moving a legacy "#name" link to its path first. */
export function currentName() {
  const h = window.location.hash.replace(/^#/, '');
  if (h && ROUTE_RE.test(h)) { history.replaceState(history.state, '', to(h) + window.location.search); return h; }
  return nameOfPath(window.location.pathname) ?? '';
}

export function go(name, search = '') {
  const path = to(name);
  if (path !== window.location.pathname || window.location.hash || search) history.pushState(null, '', path + search);
  window.dispatchEvent(new Event('naflaasimon:route'));
}

const DEFAULT_FILTERS = { subject: '', topic: '', mode: 'any', city: '', origin: null, sort: 'best', maxPrice: 0, maxKm: 0, q: '', place: '' };

export function AppProvider({ children }) {
  const [route, setRoute] = useState(() => parseRoute(currentName()));
  const [user, setUser] = useState(api.auth.current());
  // The last list we saw is shown at once on the next visit, then refreshed in the background.
  const [tutors, setTutors] = useState(() => readCache()?.tutors || null);
  const [groups, setGroups] = useState(() => readCache()?.groups || null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState('');
  const [loginGuest, setLoginGuest] = useState(null); // { tutor, group }: lets the login dialog offer "phone number only"
  const [guestTarget, setGuestTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [version, setVersion] = useState(0);
  // The signed-in student's tutors ("מורה שלי"): they may write one review on each (supabase/verified-reviews.sql).
  const [myTutors, setMyTutors] = useState([]);

  useEffect(() => {
    // Coming back from a tutor or group page to a list (search, groups, home) returns to where you were scrolled.
    const ys = {};
    let prev = currentName();
    const isList = (h) => /^(search|groups(-marathons)?)?$/.test(h);
    const on = (e) => {
      const from = prev, now = currentName();
      // Back from a dialog (same page) only closes the dialog; the page stays where it is.
      if (e.type === 'popstate' && now === from) return;
      ys[from] = window.scrollY; prev = now;
      setRoute(parseRoute(now)); window.scrollTo(0, 0);
      const y = ys[now];
      if (y && isList(now) && /^(tutor|group)-/.test(from)) {
        let tries = 0;
        const restore = () => {
          if (document.documentElement.scrollHeight - window.innerHeight >= y || tries++ > 20) window.scrollTo(0, y);
          else setTimeout(restore, 50);
        };
        requestAnimationFrame(() => requestAnimationFrame(restore));
      }
    };
    // Internal links are ordinary <a href="/naflaasimon/..."> (readable by crawlers); a plain click stays in the app.
    const click = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const hash = a.getAttribute('href').startsWith('#') ? a.getAttribute('href').slice(1) : null;
      const name = hash !== null ? (ROUTE_RE.test(hash) || hash === '' ? hash : null) : nameOfPath(url.pathname);
      if (name === null) return;
      e.preventDefault();
      go(name, hash === null ? url.search : '');
    };
    window.addEventListener('popstate', on);
    window.addEventListener('naflaasimon:route', on);
    document.addEventListener('click', click);
    return () => { window.removeEventListener('popstate', on); window.removeEventListener('naflaasimon:route', on); document.removeEventListener('click', click); };
  }, []);
  useEffect(() => api.auth.onChange((u) => {
    setUser(u);
    if (!u) return;
    setLoginOpen(false);
    // Back from Google sign-in: return to the page the person started from.
    let back = null;
    try { back = sessionStorage.getItem('naflaasimon-oauth-return'); sessionStorage.removeItem('naflaasimon-oauth-return'); } catch { /* private mode */ }
    const name = back ? nameOfPath(back) : null;
    if (name && back !== window.location.pathname) { history.replaceState(null, '', to(name)); window.dispatchEvent(new Event('naflaasimon:route')); }
  }), []);

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

  useEffect(() => {
    let live = true;
    if (!user || !api.myTutors) { setMyTutors([]); return undefined; }
    api.myTutors().then((list) => { if (live) setMyTutors(list || []); }).catch(() => {});
    return () => { live = false; };
  }, [user, version]);

  const notify = useCallback((text, bad = false) => {
    setToast({ text, bad, at: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const requireLogin = useCallback((reason, guest) => {
    if (user) return true;
    setLoginReason(reason || ''); setLoginGuest(guest || null); setLoginOpen(true); return false;
  }, [user]);
  const openGuest = useCallback((target) => setGuestTarget(target), []);
  const closeGuest = useCallback(() => setGuestTarget(null), []);

  const value = useMemo(() => ({
    api, route, user, tutors, groups, reload, version, notify, toast, online, myTutors,
    loginOpen, setLoginOpen, loginReason, loginGuest, requireLogin, guestTarget, openGuest, closeGuest,
    filters, setFilters, resetFilters: () => setFilters(DEFAULT_FILTERS),
  }), [route, user, tutors, groups, reload, version, notify, toast, online, myTutors, loginOpen, loginReason, loginGuest, requireLogin, guestTarget, openGuest, closeGuest, filters]);

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
