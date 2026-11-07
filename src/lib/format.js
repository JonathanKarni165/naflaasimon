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
  const d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return d;
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

const AVATAR_COLORS = ['#0F5C5B', '#8A5A12', '#6B4E9B', '#A1452F', '#2F5D8A', '#5C6B1F'];
export const avatarColor = (id = '') => AVATAR_COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const dft = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dateTime = (iso) => (iso ? dft.format(new Date(iso)) : '');

export const isPhone = (p) => /^0\d{8,9}$/.test(String(p || '').replace(/[\s-]/g, ''));
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
