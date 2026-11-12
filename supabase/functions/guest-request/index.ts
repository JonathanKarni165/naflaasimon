// נפל האסימון: a request from someone without an account (they leave a phone number).
// Public endpoint (the site calls it from the browser). It checks the details, rate-limits by phone,
// address and tutor, runs the same word filter as the rest of the site, stores the request in
// public.guest_requests and emails the tutor. Secrets: GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.14';

const env = (k: string) => Deno.env.get(k) || '';
const SITE = (env('SITE_URL') || 'https://jonathankarni165.github.io/naflaasimon/').replace(/\/?$/, '/');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
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
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass: env('GMAIL_APP_PASSWORD') } });
  await transport.sendMail({ from: { name: 'נפל האסימון', address: user }, to, subject, text, html });
}

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s + env('SUPABASE_SERVICE_ROLE_KEY').slice(-12)));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').replace(/[\s-]/g, '');
  const email = String(b.email || '').trim();
  const message = String(b.message || '').trim();
  if (b.hp) return json({ ok: true }); // honeypot: bots fill hidden fields
  if (name.length < 2 || name.length > 80) return json({ error: 'name' }, 400);
  if (!/^0\d{1,2}\d{7}$/.test(phone)) return json({ error: 'phone' }, 400);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'email' }, 400);
  if (!message || message.length > 1000) return json({ error: 'message' }, 400);
  if (!/^[0-9a-f-]{36}$/.test(String(b.tutor_id || ''))) return json({ error: 'tutor' }, 400);
  const groupId = /^[0-9a-f-]{36}$/.test(String(b.group_id || '')) ? String(b.group_id) : null;

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: tutor } = await db.from('tutors').select('id, name, owner_id, approval').eq('id', b.tutor_id).maybeSingle();
  if (!tutor || tutor.approval !== 'approved') return json({ error: 'tutor' }, 404);
  let groupTitle = '';
  if (groupId) {
    const { data: g } = await db.from('groups').select('title, tutor_id').eq('id', groupId).maybeSingle();
    if (!g || g.tutor_id !== tutor.id) return json({ error: 'group' }, 404);
    groupTitle = g.title;
  }

  // Same word filter as the site (profanity, links, spam).
  const { data: bad } = await db.rpc('mod_check', { t: `${name}\n${message}`, allow_phone: true });
  if (bad) return json({ error: 'moderation', reason: bad }, 400);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha(ip);
  const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const count = async (col: string, val: string) => (await db.from('guest_requests').select('id', { count: 'exact', head: true }).eq(col, val).gt('created_at', hour)).count || 0;
  if ((await count('phone', phone)) >= 3 || (await count('ip_hash', ipHash)) >= 5 || (await count('tutor_id', tutor.id)) >= 20) return json({ error: 'rate' }, 429);

  const { error } = await db.from('guest_requests').insert({ tutor_id: tutor.id, group_id: groupId, name, phone, email: email || null, message, ip_hash: ipHash });
  if (error) { console.error(error); return json({ error: 'save' }, 500); }

  // Tell the tutor by email (a tutor without an account just sees it in the panel once they have one).
  if (tutor.owner_id) {
    try {
      const to = (await db.auth.admin.getUserById(tutor.owner_id)).data?.user?.email;
      if (to) {
        const first = String(tutor.name || '').split(' ')[0];
        const link = `${SITE}#panel-inbox`;
        const about = groupTitle ? ` לקבוצה "${groupTitle}"` : '';
        const subject = `פנייה חדשה מ${name} (בלי חשבון)`;
        const text = `היי ${first},\n\n${name} השאיר/ה פנייה${about} בלי להירשם לאתר:\n\n${message}\n\nטלפון: ${phone}${email ? `\nמייל: ${email}` : ''}\n\nאפשר לראות ולסמן כטופל כאן: ${link}`;
        const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#3A3130;max-width:560px"><p>היי ${esc(first)},</p><p><b>${esc(name)}</b> השאיר/ה פנייה${esc(about)} בלי להירשם לאתר:</p><div style="white-space:pre-wrap;background:#F3F0E9;border-radius:10px;padding:12px 14px">${esc(message)}</div><p>טלפון: <b dir="ltr">${esc(phone)}</b>${email ? `<br>מייל: <b dir="ltr">${esc(email)}</b>` : ''}</p><p><a href="${link}" style="display:inline-block;background:#3A3130;color:#F3F0E9;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">לפניות בפאנל</a></p><p style="color:#7D7976;font-size:13px">קיבלת את המייל כי יש לך פרופיל מורה בנפל האסימון.</p></div>`;
        await send(to, subject, html, text);
      }
    } catch (e) { console.error(e); }
  }
  return json({ ok: true });
});
