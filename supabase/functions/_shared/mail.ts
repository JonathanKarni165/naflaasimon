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
export const SITE = (env('SITE_URL') || 'https://nafalhaasimon.co.il/').replace(/\/?$/, '/');
export const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const NAME = 'נפל האסימון';
const gmailUser = () => env('GMAIL_USER');
// Where replies and unsubscribe requests land: an inbox someone reads.
const contact = () => env('MAIL_REPLY_TO') || gmailUser() || 'nafalaasimon@gmail.com';

// Branded frame shared by all notification emails (the auth templates in supabase/email/ use the same markup).
// Site colours: butter #F4E29C header, gold coin #DFC166, teal #0F5C5B, ink #3A3130 on cream #F3F0E9.
// Tables + inline styles only, so Gmail, Outlook and phone mail apps all show it the same; no images
// (the coin is drawn with CSS, it shows as a gold square in old Outlook).
const COIN = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;background:#DFC166;border:2px solid #3A3130;border-radius:50%;mso-line-height-rule:exactly;line-height:34px"><div style="width:18px;height:4px;margin:0 auto;background:#6B5A2A;border-radius:2px;font-size:0;line-height:0">&nbsp;</div></td></tr></table>`;
export function layout(title: string, inner: string, why: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F3F0E9">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="background:#F3F0E9"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;border-collapse:separate">
    <tr><td style="background:#F4E29C;border:2px solid #3A3130;border-bottom:0;border-radius:18px 18px 0 0;padding:16px 22px">
      <a href="${SITE}" style="text-decoration:none;color:#3A3130"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-left:10px">${COIN}</td>
        <td style="font-family:Arial,Helvetica,sans-serif;text-align:right"><div style="font-size:21px;font-weight:bold;color:#3A3130;line-height:1.2">${NAME}</div><div style="font-size:13px;color:#4F4644">מורים פרטיים למתמטיקה ועוד</div></td>
      </tr></table></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:2px solid #3A3130;border-top:4px solid #DFC166;border-radius:0 0 18px 18px;padding:26px 22px 22px;font-family:Arial,Helvetica,sans-serif;color:#3A3130;text-align:right;font-size:16px;line-height:1.65">
      <div style="font-size:20px;font-weight:bold;line-height:1.35;margin:0 0 14px">${esc(title)}</div>
      ${inner}
    </td></tr>
    <tr><td style="padding:16px 8px 0;font-family:Arial,Helvetica,sans-serif;color:#7D7976;font-size:12px;line-height:1.6;text-align:center">
      ${why}<br>לא רוצים לקבל מיילים כאלה? אפשר להשיב למייל הזה במילה "הסרה".<br>
      <a href="${SITE}" style="color:#0F5C5B;font-weight:bold;text-decoration:none">${NAME}</a> · בלי עמלות, פונים ישירות למורה
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}
// A big gold button that works everywhere, with the plain link under it for copying.
export const button = (link: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;border-collapse:separate"><tr><td align="center" style="background:#DFC166;border:2px solid #3A3130;border-radius:12px">
    <a href="${link}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#3A3130;text-decoration:none">${esc(label)} &larr;</a></td></tr></table>
  <p style="margin:0;font-size:12px;color:#7D7976;line-height:1.5">הכפתור לא עובד? אפשר להעתיק את הקישור:<br><span dir="ltr" style="display:block;text-align:right"><a href="${link}" style="color:#0F5C5B;word-break:break-all">${esc(link)}</a></span></p>`;
// The quoted message: cream box with a teal edge on the reading side.
export const quote = (t: string) => `<div style="white-space:pre-wrap;background:#F3F0E9;border-right:4px solid #0F5C5B;border-radius:8px;padding:12px 14px;margin:12px 0">${esc(t)}</div>`;

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
