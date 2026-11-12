// Real backend: Supabase (Postgres + Google sign-in + storage). Same interface as api/demo.js.
import { MESSAGES } from '../lib/moderation.js';
import { createClient } from '@supabase/supabase-js';
import { cityByName } from '../data/constants.js';

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// PKCE: the sign-in result comes back as ?code=... in the query string. The default (implicit) flow appends
// #access_token=... to the address, which collides with this site's #hash routes and silently drops the login.
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });

export const mode = 'supabase';
export const demoUsers = [];

let user = null;
const listeners = new Set();

async function loadProfile(session) {
  if (!session?.user) return null;
  const u = session.user;
  const cols = 'name, is_admin, avatar, phone, birth_date, area, profile_done';
  let { data, error } = await sb.from('profiles').select(cols).eq('id', u.id).maybeSingle();
  // Before supabase/accounts.sql (or contact.sql) has run some columns don't exist yet.
  if (error) ({ data } = await sb.from('profiles').select('name, is_admin, avatar').eq('id', u.id).maybeSingle());
  // The site mailbox is an admin even before its profile row says so (see is_admin() in accounts.sql).
  const { data: adminFlag } = await sb.rpc('is_admin');
  return {
    id: u.id, email: u.email, phone: data?.phone || '',
    name: data?.name || u.user_metadata?.full_name || u.email,
    avatar: data?.avatar || u.user_metadata?.avatar_url || null,
    birthDate: data?.birth_date || '', area: data?.area || '',
    profileDone: data ? data.profile_done !== false : true,
    isAdmin: !!(data?.is_admin || adminFlag),
  };
}

const ready = sb.auth.getSession().then(async ({ data }) => { user = await loadProfile(data.session); listeners.forEach((cb) => cb(user)); });
sb.auth.onAuthStateChange((_e, session) => {
  setTimeout(async () => { user = await loadProfile(session); listeners.forEach((cb) => cb(user)); }, 0);
});

function authError(e) {
  const m = (e.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'המייל או הסיסמה לא נכונים';
  if (m.includes('not confirmed')) return 'צריך לאשר את המייל קודם. חפשו את מייל האימות שלנו (גם בספאם)';
  if (m.includes('already registered')) return 'המייל הזה כבר רשום. נסו להיכנס, או לחצו על "שכחתי סיסמה"';
  if (m.includes('password')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
  if (m.includes('rate limit') || m.includes('too many')) return 'נשלחו הרבה בקשות. נסו שוב בעוד כמה דקות';
  return e.message || 'משהו השתבש, נסו שוב';
}

export const auth = {
  current: () => user,
  ready,
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname + window.location.hash;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },
  /** Sign-up with email + password. Supabase mails a confirmation link; the account works once it is clicked. */
  async signUpEmail({ email, password, name }) {
    const emailRedirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo, data: { full_name: name || '' } } });
    if (error) throw new Error(authError(error));
    return { needsConfirm: !data.session };
  },
  async signInEmail({ email, password }) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authError(error));
  },
  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    if (error) throw new Error(authError(error));
  },
  async signOut() { await sb.auth.signOut(); user = null; listeners.forEach((cb) => cb(null)); },
};

function need() { if (!user) throw new Error('צריך להתחבר כדי לעשות את זה'); return user; }
function check({ data, error }) {
  if (error) {
    const m = error.message || '';
    const mod = m.match(/moderation: (\w+)/);
    if (mod) throw new Error(MESSAGES[mod[1]] || MESSAGES.profanity);
    if (m.includes('rate limit')) throw new Error('שלחתם הרבה הודעות בזמן קצר. נסו שוב מאוחר יותר');
    if (m.includes('group full')) throw new Error('הקבוצה מלאה');
    if (m.includes('duplicate')) throw new Error('כבר נרשמתם');
    if (m.includes('login required')) throw new Error('צריך להתחבר כדי לעשות את זה');
    if (m.includes('cannot join your own group')) throw new Error('אי אפשר להצטרף לקבוצה של עצמכם');
    if (m.includes('tutor details required')) throw new Error('חסרים פרטי חובה למורה: ' + (m.split('required:')[1] || 'שם, טלפון, כתובת, תאריך לידה ותמונה').trim());
    if (m.includes('cannot contact yourself')) throw new Error('אי אפשר לשלוח פנייה לעצמכם');
    if (m.includes('not allowed')) throw new Error('אין הרשאה');
    throw new Error(m || 'משהו השתבש, נסו שוב');
  }
  return data;
}

const tutorFromRow = (r, stats = {}) => ({
  id: r.id, ownerId: r.owner_id, name: r.name, photo: r.photo, headline: r.headline, about: r.about,
  subjects: r.subjects || [], levels: r.levels || [], topics: r.topics || [], availability: r.availability || [], city: r.city, area: r.area, lat: r.lat, lng: r.lng,
  teachesOnline: r.teaches_online, teachesFrontal: r.teaches_frontal, priceOnline: r.price_online, priceFrontal: r.price_frontal,
  experienceYears: r.experience_years, verified: r.verified, contactCount: r.contact_count, createdAt: r.created_at,
  ratingCount: stats.rating_count || 0, ratingAvg: stats.rating_avg || 0,
  approval: r.approval || 'approved', rejectReason: r.reject_reason || '',
});
const tutorToRow = (t) => {
  const c = cityByName(t.city);
  return {
    name: t.name, photo: t.photo || null, headline: t.headline || null, about: t.about || null,
    subjects: t.subjects || [], levels: t.levels || [], city: t.city || null, area: t.area || null,
    topics: t.topics || [], availability: t.availability || [], // columns from supabase/contact.sql
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
  // Tutors waiting for approval are visible to their owner and to admins by row level security; the public lists show approved ones only.
  return rows.filter((r) => (r.approval || 'approved') === 'approved').map((r) => tutorFromRow(r, stats[r.id]));
}
/** Admin: every tutor with its approval state. */
export async function listAllTutors() {
  const [rows, stats] = await Promise.all([sb.from('tutors').select('*').then(check), statsMap()]);
  return rows.map((r) => tutorFromRow(r, stats[r.id]));
}
export async function reviewTutor(id, approve, reason) {
  need();
  check(await sb.rpc('review_tutor', { t: id, p_approve: !!approve, p_reason: reason || '' }));
  return true;
}
export async function getTutor(id) {
  const r = check(await sb.from('tutors').select('*').eq('id', id).maybeSingle());
  if (!r) return null;
  const s = check(await sb.from('tutor_stats').select('*').eq('tutor_id', id).maybeSingle());
  return tutorFromRow(r, s || {});
}
async function withPhone(t) {
  const { data: c } = await sb.from('tutor_contacts').select('phone, birth_date, address').eq('tutor_id', t.id).maybeSingle();
  return { ...t, phone: c?.phone || '', birthDate: c?.birth_date || '', address: c?.address || '' };
}
export async function getMyTutor() {
  if (!user) return null;
  const r = check(await sb.from('tutors').select('*').eq('owner_id', user.id).maybeSingle());
  return r ? withPhone(tutorFromRow(r)) : null;
}
export async function getTutorForEdit(id) {
  const r = check(await sb.from('tutors').select('*').eq('id', id).single());
  const t = await withPhone(tutorFromRow(r));
  // Admins also see the account email of the tutor (profiles are readable by the owner and admins only).
  if (user?.isAdmin && r.owner_id) {
    const { data: p } = await sb.from('profiles').select('email').eq('id', r.owner_id).maybeSingle();
    t.email = p?.email || '';
  }
  return t;
}
const inquiryFromRow = (q) => ({
  id: q.id, tutorId: q.tutor_id, userId: q.user_id, name: q.name, phone: q.phone || '', email: q.email || '',
  contactVia: q.contact_via || (q.phone ? ['phone'] : ['site']), lessons: q.lessons || '', goal: q.goal || '', slots: q.slots || [],
  subject: q.subject, level: q.level,
  mode: q.mode, message: q.message, status: q.status, reply: q.reply || '', createdAt: q.created_at, repliedAt: q.replied_at,
});
async function attachTutors(list) {
  const ids = [...new Set(list.map((q) => q.tutorId))];
  if (!ids.length) return list;
  const rows = check(await sb.from('tutors').select('*').in('id', ids));
  const map = Object.fromEntries(rows.map((r) => [r.id, tutorFromRow(r)]));
  const { data: msgs } = await sb.from('inquiry_messages').select('inquiry_id, from_tutor, created_at').in('inquiry_id', list.map((q) => q.id)).order('created_at');
  const byQ = {};
  (msgs || []).forEach((m) => { (byQ[m.inquiry_id] ||= []).push(m); });
  return list.map((q) => {
    const ms = byQ[q.id] || []; const last = ms[ms.length - 1];
    return { ...q, tutor: map[q.tutorId] || null, messageCount: ms.length, lastFromTutor: last ? last.from_tutor : !!q.reply, lastAt: last?.created_at || q.repliedAt || q.createdAt };
  });
}
export async function sendInquiry({ tutorId, name, phone, email, contactVia, subject, level, mode, lessons, goal, slots, message }) {
  const u = need();
  const row = check(await sb.from('inquiries').insert({
    tutor_id: tutorId, user_id: u.id, name, phone: phone || null, email: email || null, contact_via: contactVia || ['site'],
    subject: subject || null, level: level || null, mode: mode ?? null, message,
    ...(lessons ? { lessons } : {}), ...(goal ? { goal } : {}), ...((slots || []).length ? { slots } : {}),
  }).select().single());
  return inquiryFromRow(row);
}

/** The signed-in person's saved contact details (private: only they and admins can read their profile row). */
export async function saveMyContact({ name, phone, birthDate, area }) {
  const u = need();
  const patch = { name: (name || u.name).trim(), phone: (phone || '').trim() || null, profile_done: true };
  if (area !== undefined) patch.area = (area || '').trim() || null;
  // A birth date can be set once; after that the database keeps the first value.
  if (birthDate && !u.birthDate) patch.birth_date = birthDate;
  check(await sb.from('profiles').update(patch).eq('id', u.id));
  user = { ...u, name: patch.name, phone: patch.phone || '', area: patch.area ?? u.area, birthDate: u.birthDate || birthDate || '', profileDone: true };
  listeners.forEach((cb) => cb(user));
  return user;
}

// Chat on an inquiry: row level security lets only the student and the tutor read or write it.
const chatFromRow = (m) => ({ id: m.id, inquiryId: m.inquiry_id, senderId: m.sender_id, fromTutor: m.from_tutor, text: m.text, createdAt: m.created_at });
export async function listInquiryMessages(inquiryId) {
  return check(await sb.from('inquiry_messages').select('*').eq('inquiry_id', inquiryId).order('created_at')).map(chatFromRow);
}
export async function sendInquiryMessage(inquiryId, text, asTutor) {
  const u = need();
  return chatFromRow(check(await sb.from('inquiry_messages').insert({ inquiry_id: inquiryId, sender_id: u.id, from_tutor: !!asTutor, text }).select().single()));
}
export async function myInquiries() {
  if (!user) return [];
  return attachTutors(check(await sb.from('inquiries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })).map(inquiryFromRow));
}
export async function tutorInquiries() {
  const u = need();
  let q = sb.from('tutors').select('id');
  q = u.isAdmin ? q.or(`owner_id.eq.${u.id},owner_id.is.null`) : q.eq('owner_id', u.id);
  const ids = check(await q).map((r) => r.id);
  if (!ids.length) return [];
  return attachTutors(check(await sb.from('inquiries').select('*').in('tutor_id', ids).order('created_at', { ascending: false })).map(inquiryFromRow));
}
export async function answerInquiry(id, { status, reply }) {
  need();
  check(await sb.rpc('answer_inquiry', { q: id, p_status: status ?? null, p_reply: reply ?? null }));
  return true;
}
export async function saveTutor(input) {
  const u = need();
  const row = tutorToRow(input);
  let saved;
  const isNew = !input.id;
  if (!isNew) {
    saved = check(await sb.from('tutors').update(row).eq('id', input.id).select().single());
  } else {
    row.owner_id = input.forSelf || !u.isAdmin ? u.id : null;
    saved = check(await sb.from('tutors').insert(row).select().single());
  }
  const { error } = await sb.from('tutor_contacts').upsert({ tutor_id: saved.id, phone: input.phone || '', birth_date: input.birthDate || null, address: input.address || null });
  if (error) {
    if (isNew) await sb.from('tutors').delete().eq('id', saved.id); // don't leave a half-filled application behind
    check({ error });
  }
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
  pricePerPerson: g.price_per_person, maxSeats: g.max_seats, joinMode: g.join_mode || 'open', createdAt: g.created_at,
  seatsTaken: counts[g.id]?.seats_taken || 0, pendingCount: counts[g.id]?.pending_count || 0, tutor: tutors[g.tutor_id] || null,
});
async function countsMap() {
  const rows = check(await sb.from('group_seat_counts').select('*'));
  return Object.fromEntries(rows.map((r) => [r.group_id, r]));
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
    join_mode: input.joinMode === 'approval' ? 'approval' : 'open',
  };
  const q = input.id ? sb.from('groups').update(row).eq('id', input.id) : sb.from('groups').insert(row);
  const saved = check(await q.select().single());
  if (input.joinMessage !== undefined) check(await sb.from('group_secrets').upsert({ group_id: saved.id, join_message: (input.joinMessage || '').trim() }));
  return groupFromRow(saved);
}
export async function deleteGroup(id) { need(); check(await sb.from('groups').delete().eq('id', id)); return true; }
export async function joinGroup(groupId, { name, phone, note }) {
  need();
  return check(await sb.rpc('join_group', { g: groupId, p_name: name, p_phone: phone, p_note: note || '' }));
}
export async function setSeatStatus(seatId, status) {
  need();
  check(await sb.rpc('set_seat_status', { s: seatId, p_status: status }));
  return true;
}
export async function leaveGroup(groupId) { const u = need(); check(await sb.from('group_seats').delete().eq('group_id', groupId).eq('user_id', u.id)); return true; }
const seatFromRow = (s) => ({ id: s.id, groupId: s.group_id, userId: s.user_id, name: s.name, phone: s.phone, note: s.note, status: s.status || 'approved', createdAt: s.created_at });
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
    .map((m) => ({ id: m.id, groupId: m.group_id, parentId: m.parent_id || null, userId: m.user_id, userName: m.user_name, isTutor: m.is_tutor, text: m.text, createdAt: m.created_at }));
}
export async function addGroupMessage(groupId, text, parentId) {
  const u = need();
  const g = check(await sb.from('groups').select('tutor_id').eq('id', groupId).single());
  const t = check(await sb.from('tutors').select('name, owner_id').eq('id', g.tutor_id).single());
  const isTutor = t.owner_id === u.id;
  check(await sb.from('group_messages').insert({ group_id: groupId, user_id: u.id, user_name: isTutor ? t.name : u.name, is_tutor: isTutor, text, ...(parentId ? { parent_id: parentId } : {}) }));
  return true;
}
/** The message the tutor wrote for people who join (e.g. a WhatsApp link). Only the tutor and members can read it. */
export async function getGroupJoinMessage(groupId) {
  if (!user) return '';
  const { data } = await sb.from('group_secrets').select('join_message').eq('group_id', groupId).maybeSingle();
  return data?.join_message || '';
}

export function resetDemo() {}

// Live updates: any change anyone makes (new group, seat, inquiry, review…) reaches every open page.
const LIVE_TABLES = ['tutors', 'groups', 'group_seats', 'group_messages', 'reviews', 'inquiries', 'inquiry_messages'];
export function subscribe(onChange) {
  const ch = sb.channel('site-changes');
  LIVE_TABLES.forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table)));
  ch.subscribe();
  return () => { sb.removeChannel(ch); };
}
