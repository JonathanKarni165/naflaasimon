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


const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Lower-case, drop niqqud/punctuation/geresh, unify final letters, collapse spaces. */
export function normText(x) {
  return String(x || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0591-\u05C7\u0300-\u036f]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[׳'"”“״`´.,\-_()]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function within1(a, b) { // edit distance <= 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
/** Every word the person typed must appear (any order, any part of a word); long words may have one typo. */
export function smartMatch(haystack, query) {
  const hay = normText(haystack);
  const words = hay.split(' ');
  return normText(query).split(' ').filter(Boolean).every((tok) =>
    hay.includes(tok) || (tok.length >= 4 && words.some((w) => within1(tok, w.slice(0, tok.length)) || within1(tok, w))));
}

/** 2 = typed words are in the name, 1 = only elsewhere in the profile, 0 = no text typed. */
export function nameRelevance(t, q) {
  if (!q || !normText(q)) return 0;
  return smartMatch(t.name, q) ? 2 : 1;
}

/** Name matches first; inside each group the existing order (rating-weighted for "best") is kept. */
export function queryFirst(list, q) {
  if (!q || !normText(q)) return list;
  return list.map((t, i) => [t, i]).sort((a, b) => nameRelevance(b[0], q) - nameRelevance(a[0], q) || a[1] - b[1]).map((x) => x[0]);
}

export function filterTutors(tutors, f) {
  const q = (f.q || '').trim();
  return tutors.filter((t) => {
    if (f.subject && !(t.subjects || []).includes(f.subject)) return false;
    if (f.level && !(t.levels || []).includes(f.level)) return false;
    if (f.mode === 'online' && !t.teachesOnline) return false;
    if (f.mode === 'frontal' && !t.teachesFrontal) return false;
    if (f.maxPrice) { const p = priceFor(t, f.mode); if (p == null || p > f.maxPrice) return false; }
    if (f.place && !smartMatch(`${t.city || ''} ${t.area || ''}`, f.place)) return false;
    if (q && !smartMatch(`${t.name} ${t.headline || ''} ${t.about || ''} ${t.city || ''} ${t.area || ''} ${(t.subjects || []).join(' ')} ${(t.topics || []).join(' ')}`, q)) return false;
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

/**
 * One weighted score per tutor (a linear objective): score = sum(w_i * x_i) / sum(w_i of the signals that apply).
 * Signals, each scaled 0..1: text match (name > profile), chosen topic, rating (Bayesian, so few reviews count less),
 * review volume + demand (log scale) and distance (when a location is chosen). Signals that don't apply are left out,
 * so the same formula works for every search.
 */
export const SEARCH_WEIGHTS = { text: 0.30, topic: 0.20, rating: 0.30, volume: 0.10, near: 0.10 };
export function blendedRank(list, { q, topic, origin, mode } = {}) {
  const m = globalMean(list);
  const hasQ = !!(q && normText(q));
  const W = SEARCH_WEIGHTS;
  return list.map((t) => {
    const parts = [[W.rating, Math.max(0, Math.min(1, bayesScore(t.ratingAvg || 0, t.ratingCount || 0, m) / 5))],
      [W.volume, Math.min(1, Math.log1p(popularity(t)) / Math.log1p(60))]];
    if (hasQ) parts.push([W.text, nameRelevance(t, q) === 2 ? 1 : 0.4]);
    if (topic) parts.push([W.topic, topicMatch(t, topic) ? 1 : 0]);
    if (origin && mode !== 'online') { const d = distanceKm(origin, tutorPoint(t)); parts.push([W.near, d == null ? 0 : Math.max(0, 1 - d / 40)]); }
    const wsum = parts.reduce((a, [w]) => a + w, 0);
    return { ...t, rank: parts.reduce((a, [w, x]) => a + w * x, 0) / wsum };
  }).sort((a, b) => b.rank - a.rank);
}

/** Demand: inquiries sent through the site plus reviewers (each review is a lesson that happened). */
export function popularity(t) {
  return (t.contactCount || 0) + 3 * (t.ratingCount || 0);
}
