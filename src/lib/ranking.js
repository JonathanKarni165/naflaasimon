import { PRIOR_WEIGHT, cityByName } from '../data/constants.js';

/**
 * Bayesian average: a tutor with few reviews is pulled toward the site-wide mean.
 * score = (C * m + n * avg) / (C + n). One 5-star review ≈ 4.4 with C = 5, m ≈ 4.3,
 * while 40 reviews averaging 4.8 stays ≈ 4.75, so the experienced tutor ranks higher.
 */
export function bayesScore(avg, count, globalMean, C = PRIOR_WEIGHT) {
  if (!count) return globalMean - 0.01; // no reviews yet: just under the mean
  return (C * globalMean + count * avg) / (C + count);
}

export function globalMean(tutors) {
  let sum = 0, n = 0;
  for (const t of tutors) { sum += (t.ratingAvg || 0) * (t.ratingCount || 0); n += t.ratingCount || 0; }
  return n ? sum / n : 4;
}

export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function tutorPoint(t) {
  if (t.lat != null && t.lng != null) return { lat: t.lat, lng: t.lng };
  const c = cityByName(t.city);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

/** Price the student would pay for the chosen mode ('online' | 'frontal' | 'any'). */
export function priceFor(t, mode) {
  const on = t.teachesOnline && t.priceOnline ? Number(t.priceOnline) : null;
  const fr = t.teachesFrontal && t.priceFrontal ? Number(t.priceFrontal) : null;
  if (mode === 'online') return on;
  if (mode === 'frontal') return fr;
  const all = [on, fr].filter((p) => p != null);
  return all.length ? Math.min(...all) : null;
}

/** Does this tutor say they teach the topic (ticked in the profile, or written in the headline/about)? */
export function topicMatch(t, topic) {
  if (!topic) return false;
  return (t.topics || []).includes(topic) || `${t.headline || ''} ${t.about || ''}`.includes(topic);
}

/** Tutors who teach the chosen topic come first; the chosen sort order is kept inside each part. */
export function topicFirst(list, topic) {
  if (!topic) return list;
  return [...list.filter((t) => topicMatch(t, topic)), ...list.filter((t) => !topicMatch(t, topic))];
}

export function filterTutors(tutors, f) {
  const q = (f.q || '').trim();
  return tutors.filter((t) => {
    if (f.subject && !(t.subjects || []).includes(f.subject)) return false;
    if (f.level && !(t.levels || []).includes(f.level)) return false;
    if (f.mode === 'online' && !t.teachesOnline) return false;
    if (f.mode === 'frontal' && !t.teachesFrontal) return false;
    if (f.maxPrice) { const p = priceFor(t, f.mode); if (p == null || p > f.maxPrice) return false; }
    if (f.place && !`${t.city || ''} ${t.area || ''}`.includes(f.place.trim())) return false;
    if (q && !`${t.name} ${t.headline || ''} ${t.about || ''} ${t.city || ''} ${(t.subjects || []).join(' ')} ${(t.topics || []).join(' ')}`.includes(q)) return false;
    if (f.maxKm && f.origin && f.mode !== 'online') {
      const d = distanceKm(f.origin, tutorPoint(t));
      if (d == null || d > f.maxKm) return false;
    }
    return true;
  });
}

/** sort: 'best' (weighted rating) | 'near' | 'popular' */
export function sortTutors(tutors, sort, { origin, mode } = {}) {
  const m = globalMean(tutors);
  const withScore = tutors.map((t) => ({
    ...t,
    score: bayesScore(t.ratingAvg || 0, t.ratingCount || 0, m),
    distance: origin ? distanceKm(origin, tutorPoint(t)) : null,
    price: priceFor(t, mode),
  }));
  const byScore = (a, b) => b.score - a.score;
  const cmp = {
    best: byScore,
    near: (a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || byScore(a, b),
    popular: (a, b) => popularity(b) - popularity(a) || byScore(a, b),
  }[sort] || byScore;
  return withScore.sort(cmp);
}

/** Demand: inquiries sent through the site plus reviewers (each review is a lesson that happened). */
export function popularity(t) {
  return (t.contactCount || 0) + 3 * (t.ratingCount || 0);
}
