// Demo backend: keeps everything in this browser (localStorage), seeded with example data.
// Same interface as api/supabase.js, so the UI does not know which one it talks to.
import { SEED_TUTORS, DEMO_USERS, buildSeedReviews, buildSeedGroups, buildSeedInquiries } from '../data/seed.js';

const KEY = 'naflaasimon-demo-v6'; // v6: more tutors, sub-topics per subject
const SESSION_KEY = 'naflaasimon-demo-user';
const CONTACTS_KEY = 'naflaasimon-demo-contacts'; // saved name/phone per account, kept across sign-outs
let mem = null;
const listeners = new Set();

function fresh() {
  const { groups, seats, messages } = buildSeedGroups();
  return { tutors: SEED_TUTORS.map((t) => ({ ...t })), reviews: buildSeedReviews(), groups, seats, messages, inquiries: buildSeedInquiries() };
}
function db() {
  if (mem) return mem;
  try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch { /* storage blocked */ }
  if (!mem) mem = fresh();
  mem.inquiries ||= [];
  mem.inquiryMessages ||= [];
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* keep in memory */ } }
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 60));
const clone = (v) => JSON.parse(JSON.stringify(v));

let user = null;
try { user = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { /* none */ }
function contacts() { try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '{}'); } catch { return {}; } }
function setUser(u) {
  user = u;
  try { if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); else localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  listeners.forEach((cb) => cb(user));
}

function need() { if (!user) throw new Error('צריך להתחבר כדי לעשות את זה'); return user; }
function canEditTutor(t) { return user && (user.isAdmin || t.ownerId === user.id); }

function stats(tutorId) {
  const rs = db().reviews.filter((r) => r.tutorId === tutorId);
  const sum = rs.reduce((a, r) => a + r.rating, 0);
  return { ratingCount: rs.length, ratingAvg: rs.length ? sum / rs.length : 0 };
}
function publicTutor(t) {
  const { phone, ...rest } = t; // the phone number never leaves the "server" without login
  return { ...rest, ...stats(t.id) };
}
const seatStatus = (s) => s.status || 'approved';
function groupView(g) {
  const d = db();
  const t = d.tutors.find((x) => x.id === g.tutorId);
  const seats = d.seats.filter((s) => s.groupId === g.id);
  return {
    ...g, joinMode: g.joinMode || 'open',
    seatsTaken: seats.filter((s) => seatStatus(s) === 'approved').length,
    pendingCount: seats.filter((s) => seatStatus(s) === 'pending').length,
    tutor: t ? publicTutor(t) : null,
  };
}

export const mode = 'demo';
export const demoUsers = DEMO_USERS;

export const auth = {
  current: () => user,
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signInWithGoogle(demoUser) {
    setUser({ phone: '', ...demoUser, ...(contacts()[demoUser.id] || {}) });
    return user;
  },
  async signOut() { setUser(null); },
};

/** The signed-in person's saved contact details, filled in automatically on every form. */
export async function saveMyContact({ name, phone }) {
  const u = need();
  const all = contacts();
  all[u.id] = { name: (name || u.name).trim(), phone: (phone || '').trim() };
  try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  setUser({ ...u, ...all[u.id] });
  return wait(user);
}

export async function listTutors() { return wait(db().tutors.map(publicTutor)); }
export async function getTutor(id) { const t = db().tutors.find((x) => x.id === id); return wait(t ? publicTutor(t) : null); }
export async function getMyTutor() { if (!user) return null; const t = db().tutors.find((x) => x.ownerId === user.id); return wait(t ? clone(t) : null); }
export async function getTutorForEdit(id) {
  const t = db().tutors.find((x) => x.id === id);
  if (!t || !canEditTutor(t)) throw new Error('אין הרשאה לערוך את המורה הזה');
  return wait(clone(t));
}

// Inquiries: a student asks a tutor through the site; the tutor answers from the panel.
export async function sendInquiry({ tutorId, name, phone, email, contactVia, subject, level, mode, lessons, goal, slots, message }) {
  const u = need(); const d = db();
  const t = d.tutors.find((x) => x.id === tutorId);
  if (!t) throw new Error('המורה לא נמצא');
  if (t.ownerId === u.id) throw new Error('אי אפשר לשלוח פנייה לעצמכם');
  const inq = { id: uid('q'), tutorId, userId: u.id, name, phone: phone || '', email: email || '', contactVia: contactVia || ['site'], lessons: lessons || '', goal: goal || '', slots: slots || [], subject, level, mode, message, status: 'new', reply: '', createdAt: new Date().toISOString(), repliedAt: null };
  d.inquiries.push(inq);
  t.contactCount = (t.contactCount || 0) + 1;
  save(); return wait(clone(inq));
}
const withTutor = (q) => {
  const d = db();
  const t = d.tutors.find((x) => x.id === q.tutorId);
  const msgs = d.inquiryMessages.filter((m) => m.inquiryId === q.id);
  const last = msgs[msgs.length - 1];
  return { ...clone(q), tutor: t ? publicTutor(t) : null, messageCount: msgs.length, lastFromTutor: last ? last.fromTutor : !!q.reply, lastAt: last?.createdAt || q.repliedAt || q.createdAt };
};

// Chat on an inquiry: the student and the tutor write back and forth without sharing a phone number.
function inquiryFor(id) {
  const d = db();
  const q = d.inquiries.find((x) => x.id === id);
  const t = q && d.tutors.find((x) => x.id === q.tutorId);
  if (!q || !user || (q.userId !== user.id && !canEditTutor(t))) throw new Error('אין הרשאה לשיחה הזאת');
  return q;
}
export async function listInquiryMessages(inquiryId) {
  inquiryFor(inquiryId);
  return wait(clone(db().inquiryMessages.filter((m) => m.inquiryId === inquiryId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
}
export async function sendInquiryMessage(inquiryId, text, asTutor) {
  const u = need(); const q = inquiryFor(inquiryId);
  const fromTutor = !!asTutor && q.userId !== u.id;
  const m = { id: uid('c'), inquiryId, senderId: u.id, fromTutor, text, createdAt: new Date().toISOString() };
  db().inquiryMessages.push(m);
  if (fromTutor && q.status === 'new') q.status = 'replied';
  save(); return wait(clone(m));
}
export async function myInquiries() {
  if (!user) return [];
  return wait(db().inquiries.filter((q) => q.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withTutor));
}
export async function tutorInquiries() {
  need(); const d = db();
  const ids = d.tutors.filter((t) => t.ownerId === user.id || (user.isAdmin && !t.ownerId)).map((t) => t.id);
  return wait(d.inquiries.filter((q) => ids.includes(q.tutorId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withTutor));
}
export async function answerInquiry(id, { status, reply }) {
  need(); const d = db();
  const q = d.inquiries.find((x) => x.id === id);
  if (!q || !canEditTutor(d.tutors.find((t) => t.id === q.tutorId))) throw new Error('אין הרשאה');
  if (status) q.status = status;
  if (reply != null) { q.reply = reply; q.repliedAt = new Date().toISOString(); if (q.status === 'new') q.status = 'replied'; }
  save(); return wait(clone(q));
}

export async function saveTutor(input) {
  const u = need();
  const d = db();
  if (input.id) {
    const t = d.tutors.find((x) => x.id === input.id);
    if (!t || !canEditTutor(t)) throw new Error('אין הרשאה לערוך את המורה הזה');
    Object.assign(t, input, { verified: u.isAdmin ? !!input.verified : t.verified, ownerId: t.ownerId });
    save(); return wait(clone(t));
  }
  if (!u.isAdmin && d.tutors.some((x) => x.ownerId === u.id)) throw new Error('כבר יש לכם פרופיל מורה');
  const t = { contactCount: 0, ...input, id: uid('t'), ownerId: input.forSelf || !u.isAdmin ? u.id : null, verified: u.isAdmin ? !!input.verified : false, createdAt: new Date().toISOString() };
  delete t.forSelf;
  d.tutors.push(t); save();
  return wait(clone(t));
}

export async function deleteTutor(id) {
  need(); const d = db();
  const t = d.tutors.find((x) => x.id === id);
  if (!t || !canEditTutor(t)) throw new Error('אין הרשאה');
  d.tutors = d.tutors.filter((x) => x.id !== id);
  d.reviews = d.reviews.filter((r) => r.tutorId !== id);
  const gids = d.groups.filter((g) => g.tutorId === id).map((g) => g.id);
  d.groups = d.groups.filter((g) => g.tutorId !== id);
  d.seats = d.seats.filter((s) => !gids.includes(s.groupId));
  const qids = d.inquiries.filter((q) => q.tutorId === id).map((q) => q.id);
  d.inquiries = d.inquiries.filter((q) => q.tutorId !== id);
  d.inquiryMessages = d.inquiryMessages.filter((m) => !qids.includes(m.inquiryId));
  save(); return wait(true);
}

export async function uploadPhoto(file) {
  // Shrink to 480px and keep as a data URL (the real site uploads to storage).
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.width, img.height); const c = document.createElement('canvas'); c.width = c.height = 480;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 480, 480);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export async function listReviews(tutorId) {
  return wait(clone(db().reviews.filter((r) => r.tutorId === tutorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}
export async function addReview({ tutorId, rating, text }) {
  const u = need(); const d = db();
  const t = d.tutors.find((x) => x.id === tutorId);
  if (t?.ownerId === u.id) throw new Error('אי אפשר לכתוב ביקורת על עצמכם');
  const existing = d.reviews.find((r) => r.tutorId === tutorId && r.userId === u.id);
  if (existing) Object.assign(existing, { rating, text, createdAt: new Date().toISOString() });
  else d.reviews.push({ id: uid('r'), tutorId, userId: u.id, userName: u.name, rating, text, createdAt: new Date().toISOString() });
  save(); return wait(true);
}
export async function deleteReview(id) {
  const u = need(); const d = db();
  const r = d.reviews.find((x) => x.id === id);
  if (!r || (r.userId !== u.id && !u.isAdmin)) throw new Error('אין הרשאה');
  d.reviews = d.reviews.filter((x) => x.id !== id); save(); return wait(true);
}

export async function listGroups() { return wait(db().groups.map(groupView)); }
export async function getGroup(id) { const g = db().groups.find((x) => x.id === id); return wait(g ? groupView(g) : null); }
export async function saveGroup(input) {
  const u = need(); const d = db();
  const tutor = d.tutors.find((x) => x.id === input.tutorId);
  if (!tutor || !canEditTutor(tutor)) throw new Error('אפשר לפתוח קבוצה רק בשם פרופיל המורה שלכם');
  if (input.id) {
    const g = d.groups.find((x) => x.id === input.id);
    const owner = d.tutors.find((x) => x.id === g?.tutorId);
    if (!g || !canEditTutor(owner)) throw new Error('אין הרשאה');
    Object.assign(g, input); save(); return wait(clone(g));
  }
  const g = { ...input, id: uid('g'), createdAt: new Date().toISOString() };
  d.groups.push(g); save(); void u; return wait(clone(g));
}
export async function deleteGroup(id) {
  need(); const d = db();
  const g = d.groups.find((x) => x.id === id);
  if (!g || !canEditTutor(d.tutors.find((t) => t.id === g.tutorId))) throw new Error('אין הרשאה');
  d.groups = d.groups.filter((x) => x.id !== id);
  d.seats = d.seats.filter((s) => s.groupId !== id);
  save(); return wait(true);
}
export async function joinGroup(groupId, { name, phone, note }) {
  const u = need(); const d = db();
  const g = d.groups.find((x) => x.id === groupId);
  if (!g) throw new Error('הקבוצה לא נמצאה');
  const mine = d.seats.find((s) => s.groupId === groupId && s.userId === u.id);
  if (mine && seatStatus(mine) !== 'declined') throw new Error('כבר נרשמתם לקבוצה הזאת');
  if (d.seats.filter((s) => s.groupId === groupId && seatStatus(s) === 'approved').length >= g.maxSeats) throw new Error('הקבוצה מלאה');
  if (mine) d.seats = d.seats.filter((s) => s !== mine);
  const status = (g.joinMode || 'open') === 'approval' ? 'pending' : 'approved';
  d.seats.push({ id: uid('s'), groupId, userId: u.id, name, phone, note, status, createdAt: new Date().toISOString() });
  save(); return wait(status);
}
export async function setSeatStatus(seatId, status) {
  need(); const d = db();
  const s = d.seats.find((x) => x.id === seatId);
  const g = d.groups.find((x) => x.id === s?.groupId);
  if (!s || !g || !canEditTutor(d.tutors.find((t) => t.id === g.tutorId))) throw new Error('אין הרשאה');
  if (status === 'approved' && seatStatus(s) !== 'approved'
    && d.seats.filter((x) => x.groupId === g.id && seatStatus(x) === 'approved').length >= g.maxSeats) throw new Error('הקבוצה מלאה. הגדילו את מספר המקומות כדי לאשר עוד');
  s.status = status; save(); return wait(true);
}
export async function leaveGroup(groupId) {
  const u = need(); const d = db();
  d.seats = d.seats.filter((s) => !(s.groupId === groupId && s.userId === u.id)); save(); return wait(true);
}
export async function mySeats() {
  if (!user) return [];
  return wait(clone(db().seats.filter((s) => s.userId === user.id).map((s) => ({ ...s, status: seatStatus(s) }))));
}
export async function listGroupSeats(groupId) {
  need(); const d = db();
  const g = d.groups.find((x) => x.id === groupId);
  if (!g || !canEditTutor(d.tutors.find((t) => t.id === g.tutorId))) throw new Error('רק המורה של הקבוצה רואה את רשימת הנרשמים');
  return wait(clone(d.seats.filter((s) => s.groupId === groupId).map((s) => ({ ...s, status: seatStatus(s) }))));
}
export async function listGroupMessages(groupId) {
  return wait(clone(db().messages.filter((m) => m.groupId === groupId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
}
export async function addGroupMessage(groupId, text) {
  const u = need(); const d = db();
  const g = d.groups.find((x) => x.id === groupId);
  const t = d.tutors.find((x) => x.id === g?.tutorId);
  const isTutor = !!t && t.ownerId === u.id;
  d.messages.push({ id: uid('m'), groupId, userId: u.id, userName: isTutor ? t.name : u.name, isTutor, text, createdAt: new Date().toISOString() });
  save(); return wait(true);
}

export function resetDemo() { mem = fresh(); save(); }

// Demo "live" updates: other tabs of this browser see changes right away.
export function subscribe(onChange) {
  const on = (e) => { if (e.key === KEY) { mem = null; onChange('all'); } };
  window.addEventListener('storage', on);
  return () => window.removeEventListener('storage', on);
}
