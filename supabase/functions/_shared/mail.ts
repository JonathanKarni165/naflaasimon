// נפל האסימון: one place that sends every site email (inquiries, chat messages, guest requests).
// Provider: Resend when RESEND_API_KEY is set (needs the verified domain, see docs/email-setup.md),
// otherwise Gmail SMTP with GMAIL_USER + GMAIL_APP_PASSWORD (an app password, not the account password).
//
// Deliverability rules kept here so every function gets them:
// - every message goes to ONE recipient in To (no BCC blasts, which Gmail treats as bulk spam);
// - a plain-text part next to the HTML, a full <html lang="he" dir="rtl"> document, no images;
// - List-Unsubscribe header (Gmail and Outlook show "unsubscribe" instead of the spam button);
// - a Reply-To that reaches a person, never a dead noreply address.
import nodemailer from 'npm:nodemailer@6.9.14';

const env = (k: string) => Deno.env.get(k) || '';
export const SITE = (env('SITE_URL') || 'https://jonathankarni165.github.io/naflaasimon/').replace(/\/?$/, '/');
export const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const NAME = 'נפל האסימון';
const gmailUser = () => env('GMAIL_USER');
// Where replies and unsubscribe requests land: an inbox someone reads.
const contact = () => env('MAIL_REPLY_TO') || gmailUser() || 'nafalaasimon@gmail.com';

// Branded frame shared by all notification emails (same look as the auth templates in supabase/email/).
export function layout(title: string, inner: string, why: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F3F0E9">
<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#F3F0E9;padding:24px 12px;color:#3A3130">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:2px solid #3A3130;border-radius:18px;padding:24px;text-align:right">
    <div style="font-size:20px;font-weight:bold">${NAME}</div>
    <div style="color:#7D7976;font-size:13px;margin-bottom:18px">מורים פרטיים למתמטיקה ועוד</div>
    <div style="font-size:16px;line-height:1.6">${inner}</div>
    <p style="color:#7D7976;font-size:12px;line-height:1.5;margin:20px 0 0;border-top:1px solid #F3F0E9;padding-top:12px">${why}<br>לא רוצים לקבל מיילים כאלה? אפשר להשיב למייל הזה במילה "הסרה".</p>
  </div>
</div></body></html>`;
}
export const button = (link: string, label: string) =>
  `<p style="margin:18px 0"><a href="${link}" style="display:inline-block;background:#3A3130;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:bold">${esc(label)}</a></p>`;
export const quote = (t: string) => `<div style="white-space:pre-wrap;background:#F3F0E9;border-radius:10px;padding:12px 14px">${esc(t)}</div>`;

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function gmail() {
  if (!gmailUser() || !env('GMAIL_APP_PASSWORD')) throw new Error('no mail provider configured');
  // nodemailer encodes Hebrew subjects and names correctly (denomailer produced a broken message).
  transport ??= nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, pool: true, maxConnections: 2, auth: { user: gmailUser(), pass: env('GMAIL_APP_PASSWORD') } });
  return transport;
}

export async function send(m: Mail) {
  const replyTo = m.replyTo || contact();
  const unsub = `<mailto:${contact()}?subject=${encodeURIComponent('הסרה מרשימת התפוצה')}>`;
  const text = `${m.text}\n\n--\n${NAME} · ${SITE}\nלהסרה: השיבו למייל הזה במילה "הסרה".`;
  if (env('RESEND_API_KEY')) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('MAIL_FROM') || `${NAME} <hello@naflaasimon.co.il>`, to: [m.to], reply_to: replyTo, subject: m.subject, html: m.html, text, headers: { 'List-Unsubscribe': unsub } }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
    return;
  }
  await gmail().sendMail({ from: { name: NAME, address: gmailUser() }, to: m.to, replyTo, subject: m.subject, text, html: m.html, headers: { 'List-Unsubscribe': unsub } });
}

// Same message to many people, one email each (never BCC). Failures of one recipient don't stop the rest.
export async function sendEach(tos: string[], m: Omit<Mail, 'to'>) {
  const res = await Promise.allSettled([...new Set(tos)].map((to) => send({ ...m, to })));
  const failed = res.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error((r as PromiseRejectedResult).reason));
  if (failed.length === res.length && res.length) throw new Error('all sends failed');
}
