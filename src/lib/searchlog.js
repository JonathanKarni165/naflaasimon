// Logs what visitors search for, so the admin's "סטטיסטיקות" can show demand and searches that found no tutor.
// Only the search itself is kept (subject, course, words, city, mode, price cap, result counts): no user id,
// no exact location. A search is logged once it has been still for a moment, and once per visit.
import { useEffect } from 'react';
import { useApp } from '../state.jsx';

const seen = new Set();
const clip = (s, n) => (s || '').toString().trim().slice(0, n) || null;

export function useSearchLog(kind, search, results, realResults) {
  const { api, user } = useApp();
  const key = JSON.stringify([kind, search]);
  useEffect(() => {
    if (results == null || user?.isAdmin || !api.logSearch) return undefined;
    const { subject, topic, q, place, mode, maxPrice } = search;
    if (!subject && !topic && !(q || '').trim() && !place && (!mode || mode === 'any')) return undefined; // nothing searched yet
    const id = setTimeout(() => {
      const k = key + '|' + (realResults > 0);
      if (seen.has(k)) return;
      seen.add(k);
      api.logSearch({
        kind, subject: clip(subject, 60), topic: clip(topic, 80), q: clip(q, 60),
        place: place === 'המיקום שלי' ? 'מיקום נוכחי' : clip(place, 60),
        mode: ['online', 'frontal'].includes(mode) ? mode : 'any',
        max_price: maxPrice ? Math.min(1000, Number(maxPrice)) : null,
        results, real_results: realResults,
      });
    }, 2000);
    return () => clearTimeout(id);
  }, [key, results, realResults, user?.isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps
}
