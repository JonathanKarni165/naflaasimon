// נפל האסימון: emails the tutor when a student sends an inquiry.
// Called by the database (supabase/notify.sql) right after a row is added to public.inquiries.
// Mail goes through Resend when RESEND_API_KEY is set (needs a verified domain), otherwise through
// Gmail SMTP with GMAIL_USER + GMAIL_APP_PASSWORD (an app password, not the account password).
// Secrets: NOTIFY_SECRET (same value as in private.notify_settings), SITE_URL, and one of the two mail setups.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const env = (k: string) => Deno.env.get(k) || '';
const SITE = env('SITE_URL') || 'https://jonathankarni165.github.io/naflaasimon/';
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function send(to: string, subject: string, html: string, text: string) {
  if (env('RESEND_API_KEY')) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('MAIL_FROM') || 'נפל האסימון <noreply@naflaasimon.co.il>', to, subject, html, text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
    return;
  }
  const user = env('GMAIL_USER');
  if (!user || !env('GMAIL_APP_PASSWORD')) throw new Error('no mail provider configured');
  const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password: env('GMAIL_APP_PASSWORD') } } });
  await client.send({ from: `נפל האסימון <${user}>`, to, subject, content: text, html });
  await client.close();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  if (!env('NOTIFY_SECRET') || req.headers.get('x-notify-secret') !== env('NOTIFY_SECRET')) return new Response('forbidden', { status: 403 });
  const { inquiry_id } = await req.json().catch(() => ({}));
  if (!inquiry_id) return new Response('missing inquiry_id', { status: 400 });

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: q, error } = await db.from('inquiries').select('id, name, subject, level, message, contact_via, phone, email, tutor_id, tutors(name, owner_id)').eq('id', inquiry_id).single();
  if (error || !q) return new Response('not found', { status: 404 });
  const owner = (q as any).tutors?.owner_id;
  if (!owner) return new Response('tutor has no account', { status: 200 });
  const { data: u } = await db.auth.admin.getUserById(owner);
  const to = u?.user?.email;
  if (!to) return new Response('tutor has no email', { status: 200 });

  const first = String((q as any).tutors?.name || '').split(' ')[0];
  const link = `${SITE.replace(/\/?$/, '/')}#panel-inbox`;
  const via = (q.contact_via || ['site']).map((v: string) => ({ site: 'צ׳אט באתר', phone: 'טלפון', email: 'מייל' }[v] || v)).join(', ');
  const subject = `פנייה חדשה מ${q.name}${q.subject ? ` (${q.subject})` : ''}`;
  const text = `היי ${first},\n\nקיבלת פנייה חדשה בנפל האסימון.\n\n${q.message}\n\nדרך קשר מועדפת: ${via}\n\nלתשובה: ${link}`;
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#3A3130;max-width:560px">
    <p>היי ${esc(first)},</p><p>קיבלת <b>פנייה חדשה</b> בנפל האסימון מ<b>${esc(q.name)}</b>.</p>
    <div style="white-space:pre-wrap;background:#F3F0E9;border-radius:10px;padding:12px 14px">${esc(q.message)}</div>
    <p>דרך קשר מועדפת: ${esc(via)}</p>
    <p><a href="${link}" style="display:inline-block;background:#3A3130;color:#F3F0E9;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">לתשובה בפאנל</a></p>
    <p style="color:#7D7976;font-size:13px">קיבלת את המייל כי יש לך פרופיל מורה בנפל האסימון.</p></div>`;
  try { await send(to, subject, html, text); } catch (e) { console.error(e); return new Response('mail failed', { status: 502 }); }
  return new Response('sent', { status: 200 });
});
