const nf = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
export const money = (n) => (n == null || n === '' ? '' : nf.format(Number(n)));

const df = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
const dfs = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
export const dateLong = (iso) => (iso ? df.format(new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))) : '');
export const dateShort = (iso) => (iso ? dfs.format(new Date(iso)) : '');

export function relDays(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  const days = Math.round((d - new Date()) / 86400000);
  if (days < 0) return 'כבר התחילה';
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days < 7) return `בעוד ${days} ימים`;
  if (days < 14) return 'בעוד שבוע';
  return `בעוד ${Math.round(days / 7)} שבועות`;
}

export const km = (d) => (d == null ? '' : d < 1 ? 'פחות מק״מ ממך' : `${d < 10 ? d.toFixed(1) : Math.round(d)} ק״מ ממך`);

export const rating1 = (n) => (n ? Number(n).toFixed(1) : '');

export function reviewsLabel(n) {
  if (!n) return 'אין עדיין ביקורות';
  return n === 1 ? 'ביקורת אחת' : `${n} ביקורות`;
}

export function normalizePhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2); // 00972...
  if (d.startsWith('9720')) return '972' + d.slice(4); // +972 (0)50...
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  if (/^5\d{8}$/.test(d)) return '972' + d; // 501234567, the leading 0 dropped
  return d;
}

/** One-tap WhatsApp chat (wa.me) with an optional prefilled message. Empty when the number can't be used. */
export function waLink(phone, text = '') {
  const n = normalizePhone(phone);
  if (n.length < 11 || n.length > 15) return '';
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

const AVATAR_COLORS = ['#0F5C5B', '#8A5A12', '#6B4E9B', '#A1452F', '#2F5D8A', '#5C6B1F'];
export const avatarColor = (id = '') => AVATAR_COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const dft = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dateTime = (iso) => (iso ? dft.format(new Date(iso)) : '');

export const isPhone = (p) => /^0\d{8,9}$/.test(String(p || '').replace(/[\s-]/g, ''));
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

/** A group has ended once its last weekly session is in the past (a marathon: once its day has passed). */
export function groupEnded(g) {
  if (!g?.startDate) return false;
  const last = new Date(g.startDate + 'T23:59:59');
  last.setDate(last.getDate() + 7 * Math.max(0, (Number(g.sessions) || 1) - 1));
  return last < new Date();
}

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
/**
 * Checks "ימי ג׳ 18:00" against the first meeting's date. Returns the weekday letter of the start date when the
 * text names meeting days that don't include it, otherwise ''.
 */
export function weekdayMismatch(startDate, time) {
  if (!startDate || !time) return '';
  const m = String(time).match(/ימי?\s+([אבגדהוש][׳'`]?(?:\s*(?:,|ו|-|–)\s*[אבגדהוש][׳'`]?)*)/);
  if (!m) return '';
  const named = new Set((m[1].match(/[אבגדהוש](?=[׳'`]|\s|,|$)/g) || []));
  const day = DAY_LETTERS[new Date(startDate + 'T12:00:00').getDay()];
  return named.size && !named.has(day) ? day : '';
}

/** Weekly sessions not yet held (today's session still counts as ahead). */
export function sessionsLeft(g) {
  const total = Math.max(1, Number(g?.sessions) || 1);
  if (!g?.startDate) return total;
  const start = new Date(g.startDate + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (today <= start) return total;
  const held = Math.floor((today - start) / (7 * 86400000)) + (((today - start) / 86400000) % 7 === 0 ? 0 : 1);
  return Math.max(0, total - held);
}

// Common typos in email domains ("gmial.com"): returns the corrected address, or '' when it looks fine.
const DOMAIN_FIX = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmali.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.co.il': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
  'walla.co': 'walla.co.il', 'wala.co.il': 'walla.co.il', 'walla.co.l': 'walla.co.il', 'walla.com': 'walla.co.il',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com', 'icloud.co': 'icloud.com',
};
export function emailTypo(email) {
  const [local, domain] = String(email || '').trim().toLowerCase().split('@');
  const fix = local && domain ? DOMAIN_FIX[domain] : '';
  return fix ? `${local}@${fix}` : '';
}

// Instagram, Facebook, TikTok and similar apps open links in their own browser, where Google blocks sign-in.
export const isInAppBrowser = () => typeof navigator !== 'undefined'
  && /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|BytedanceWebview|musical_ly|Snapchat|LinkedInApp/i.test(navigator.userAgent || '');

// Sign-up password: at least 8 characters with an English letter and a digit (the server checks the same).
export function passwordProblem(p) {
  const v = String(p || '');
  if (v.length < 8) return 'הסיסמה צריכה לפחות 8 תווים';
  if (!v.trim()) return 'הסיסמה לא יכולה להיות רק רווחים';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'הסיסמה צריכה לכלול לפחות אות אחת באנגלית ומספר אחד';
  return '';
}
