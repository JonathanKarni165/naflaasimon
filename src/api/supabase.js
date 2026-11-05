// Real backend: Supabase (Postgres + Google sign-in + storage). Same interface as api/demo.js.
import { createClient } from '@supabase/supabase-js';
import { cityByName } from '../data/constants.js';

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

export const mode = 'supabase';
export const demoUsers = [];

let user = null;
const listeners = new Set();

async function loadProfile(session) {
  if (!session?.user) return null;
  const u = session.user;
  const { data } = await sb.from('profiles').select('name, is_admin, avatar').eq('id', u.id).maybeSingle();
  return {
    id: u.id, email: u.email,
    name: data?.name || u.user_metadata?.full_name || u.email,
    avatar: data?.avatar || u.user_metadata?.avatar_url || null,
    isAdmin: !!data?.is_admin,
  };
}

const ready = sb.auth.getSession().then(async ({ data }) => { user = await loadProfile(data.session); listeners.forEach((cb) => cb(user)); });
sb.auth.onAuthStateChange((_e, session) => {
  setTimeout(async () => { user = await loadProfile(session); listeners.forEach((cb) => cb(user)); }, 0);
});

export const auth = {
  current: () => user,
  ready,
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname + window.location.hash;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },
  async signOut() { await sb.auth.signOut(); user = null; listeners.forEach((cb) => cb(null)); },
};

function need() { if (!user) throw new Error('צריך להתחבר כדי לעשות את זה'); return user; }
function check({ data, error }) {
  if (error) {
    const m = error.message || '';
    if (m.includes('group full')) throw new Error('הקבוצה מלאה');
    if (m.includes('duplicate')) throw new Error('כבר נרשמתם');
    if (m.includes('login required')) throw new Error('צריך להתחבר כדי לעשות את זה');
    throw new Error(m || 'משהו השתבש, נסו שוב');
  }
  return data;
}

const tutorFromRow = (r, stats = {}) => ({
  id: r.id, ownerId: r.owner_id, name: r.name, photo: r.photo, headline: r.headline, about: r.about,
  subjects: r.subjects || [], levels: r.levels || [], city: r.city, area: r.area, lat: r.lat, lng: r.lng,
  teachesOnline: r.teaches_online, teachesFrontal: r.teaches_frontal, priceOnline: r.price_online, priceFrontal: r.price_frontal,
  experienceYears: r.experience_years, verified: r.verified, contactCount: r.contact_count, createdAt: r.created_at,
  ratingCount: stats.rating_count || 0, ratingAvg: stats.rating_avg || 0,
});
const tutorToRow = (t) => {
  const c = cityByName(t.city);
  return {
    name: t.name, photo: t.photo || null, headline: t.headline || null, about: t.about || null,
    subjects: t.subjects || [], levels: t.levels || [], city: t.city || null, area: t.area || null,
    lat: c?.lat ?? null, lng: c?.lng ?? null,
    teaches_online: !!t.teachesOnline, teaches_frontal: !!t.teachesFrontal,
    price_online: t.teachesOnline && t.priceOnline !== '' ? Number(t.priceOnline) || null : null,
    price_frontal: t.teachesFrontal && t.priceFrontal !== '' ? Number(t.priceFrontal) || null : null,
    experience_years: t.experienceYears === '' || t.experienceYears == null ? null : Number(t.experienceYears),
    verified: !!t.verified,
  };
};

async function statsMap() {
  const rows = check(await sb.from('tutor_stats').select('*'));
  return Object.fromEntries(rows.map((r) => [r.tutor_id, r]));
}

export async function listTutors() {
  const [rows, stats] = await Promise.all([sb.from('tutors').select('*').then(check), statsMap()]);
  return rows.map((r) => tutorFromRow(r, stats[r.id]));
}
export async function getTutor(id) {
  const r = check(await sb.from('tutors').select('*').eq('id', id).maybeSingle());
  if (!r) return null;
  const s = check(await sb.from('tutor_stats').select('*').eq('tutor_id', id).maybeSingle());
  return tutorFromRow(r, s || {});
}
async function withPhone(t) {
  const c = check(await sb.from('tutor_contacts').select('phone').eq('tutor_id', t.id).maybeSingle());
  return { ...t, phone: c?.phone || '' };
}
export async function getMyTutor() {
  if (!user) return null;
  const r = check(await sb.from('tutors').select('*').eq('owner_id', user.id).maybeSingle());
  return r ? withPhone(tutorFromRow(r)) : null;
}
export async function getTutorForEdit(id) {
  const r = check(await sb.from('tutors').select('*').eq('id', id).single());
  return withPhone(tutorFromRow(r));
}
export async function revealPhone(tutorId) {
  need();
  return check(await sb.rpc('reveal_phone', { t: tutorId }));
}
export async function saveTutor(input) {
  const u = need();
  const row = tutorToRow(input);
  let saved;
  if (input.id) {
    saved = check(await sb.from('tutors').update(row).eq('id', input.id).select().single());
  } else {
    row.owner_id = input.forSelf || !u.isAdmin ? u.id : null;
    saved = check(await sb.from('tutors').insert(row).select().single());
  }
  check(await sb.from('tutor_contacts').upsert({ tutor_id: saved.id, phone: input.phone || '' }));
  return tutorFromRow(saved);
}
export async function deleteTutor(id) { need(); check(await sb.from('tutors').delete().eq('id', id)); return true; }

export async function uploadPhoto(file) {
  const u = need();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${u.id}/${Date.now()}.${ext}`;
  check(await sb.storage.from('tutor-photos').upload(path, file, { upsert: true, contentType: file.type }));
  return sb.storage.from('tutor-photos').getPublicUrl(path).data.publicUrl;
}

const reviewFromRow = (r) => ({ id: r.id, tutorId: r.tutor_id, userId: r.user_id, userName: r.user_name, rating: r.rating, text: r.text, createdAt: r.created_at });
export async function listReviews(tutorId) {
  return check(await sb.from('reviews').select('*').eq('tutor_id', tutorId).order('created_at', { ascending: false })).map(reviewFromRow);
}
export async function addReview({ tutorId, rating, text }) {
  const u = need();
  check(await sb.from('reviews').upsert({ tutor_id: tutorId, user_id: u.id, user_name: u.name, rating, text, created_at: new Date().toISOString() }, { onConflict: 'tutor_id,user_id' }));
  return true;
}
export async function deleteReview(id) { need(); check(await sb.from('reviews').delete().eq('id', id)); return true; }

const groupFromRow = (g, counts = {}, tutors = {}) => ({
  id: g.id, tutorId: g.tutor_id, title: g.title, subject: g.subject, level: g.level, description: g.description,
  startDate: g.start_date, time: g.time, sessions: g.sessions, mode: g.mode, city: g.city, location: g.location,
  pricePerPerson: g.price_per_person, maxSeats: g.max_seats, createdAt: g.created_at,
  seatsTaken: counts[g.id] || 0, tutor: tutors[g.tutor_id] || null,
});
async function countsMap() {
  const rows = check(await sb.from('group_seat_counts').select('*'));
  return Object.fromEntries(rows.map((r) => [r.group_id, r.seats_taken]));
}
export async function listGroups() {
  const [rows, counts, tutors] = await Promise.all([sb.from('groups').select('*').then(check), countsMap(), listTutors()]);
  const tmap = Object.fromEntries(tutors.map((t) => [t.id, t]));
  return rows.map((g) => groupFromRow(g, counts, tmap));
}
export async function getGroup(id) {
  const g = check(await sb.from('groups').select('*').eq('id', id).maybeSingle());
  if (!g) return null;
  const [counts, tutor] = await Promise.all([countsMap(), getTutor(g.tutor_id)]);
  return groupFromRow(g, counts, { [g.tutor_id]: tutor });
}
export async function saveGroup(input) {
  need();
  const row = {
    tutor_id: input.tutorId, title: input.title, subject: input.subject || null, level: input.level || null,
    description: input.description || null, start_date: input.startDate, time: input.time || null,
    sessions: Number(input.sessions) || 1, mode: input.mode, city: input.mode === 'frontal' ? input.city || null : null,
    location: input.mode === 'frontal' ? input.location || null : null,
    price_per_person: Number(input.pricePerPerson) || 0, max_seats: Number(input.maxSeats) || 1,
  };
  const q = input.id ? sb.from('groups').update(row).eq('id', input.id) : sb.from('groups').insert(row);
  return groupFromRow(check(await q.select().single()));
}
export async function deleteGroup(id) { need(); check(await sb.from('groups').delete().eq('id', id)); return true; }
export async function joinGroup(groupId, { name, phone, note }) {
  need();
  check(await sb.rpc('join_group', { g: groupId, p_name: name, p_phone: phone, p_note: note || '' }));
  return true;
}
export async function leaveGroup(groupId) { const u = need(); check(await sb.from('group_seats').delete().eq('group_id', groupId).eq('user_id', u.id)); return true; }
const seatFromRow = (s) => ({ id: s.id, groupId: s.group_id, userId: s.user_id, name: s.name, phone: s.phone, note: s.note, createdAt: s.created_at });
export async function mySeats() {
  if (!user) return [];
  return check(await sb.from('group_seats').select('*').eq('user_id', user.id)).map(seatFromRow);
}
export async function listGroupSeats(groupId) {
  need();
  return check(await sb.from('group_seats').select('*').eq('group_id', groupId).order('created_at')).map(seatFromRow);
}
export async function listGroupMessages(groupId) {
  return check(await sb.from('group_messages').select('*').eq('group_id', groupId).order('created_at'))
    .map((m) => ({ id: m.id, groupId: m.group_id, userId: m.user_id, userName: m.user_name, isTutor: m.is_tutor, text: m.text, createdAt: m.created_at }));
}
export async function addGroupMessage(groupId, text) {
  const u = need();
  const g = check(await sb.from('groups').select('tutor_id').eq('id', groupId).single());
  const t = check(await sb.from('tutors').select('name, owner_id').eq('id', g.tutor_id).single());
  const isTutor = t.owner_id === u.id;
  check(await sb.from('group_messages').insert({ group_id: groupId, user_id: u.id, user_name: isTutor ? t.name : u.name, is_tutor: isTutor, text }));
  return true;
}

export function resetDemo() {}
