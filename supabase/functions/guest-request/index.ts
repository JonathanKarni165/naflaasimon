// נפל האסימון: a request from someone without an account (they leave a phone number).
// Public endpoint (the site calls it from the browser). It checks the details, rate-limits by phone,
// address and tutor, runs the same word filter as the rest of the site, stores the request in
// public.guest_requests and emails the tutor. Sending lives in ../_shared/mail.ts.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { SITE, esc, layout, button, quote, send } from '../_shared/mail.ts';

const env = (k: string) => Deno.env.get(k) || '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });


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
        const html = layout(subject, `<p>היי ${esc(first)},</p><p><b>${esc(name)}</b> השאיר/ה פנייה${esc(about)} בלי להירשם לאתר:</p>${quote(message)}<p>טלפון: <b dir="ltr">${esc(phone)}</b>${email ? `<br>מייל: <b dir="ltr">${esc(email)}</b>` : ''}</p>${button(link, 'לפניות בפאנל')}`, 'קיבלת את המייל כי יש לך פרופיל מורה בנפל האסימון.');
        await send({ to, subject, html, text, replyTo: email || undefined });
      }
    } catch (e) { console.error(e); }
  }
  return json({ ok: true });
});
