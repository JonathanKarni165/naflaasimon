// נפל האסימון: emails people about new messages.
//  - kind "group":   a tutor's message in a group chat goes to every approved member (one mail, members in BCC).
//  - kind "inquiry": a chat message between student and tutor goes to the other side (bursts are batched: at most one mail per 5 minutes per direction).
// Called by the database (supabase/groupchat.sql). Each message is mailed at most once and only within 10 minutes of being sent (notified_at).
// Mail: Resend when RESEND_API_KEY is set, otherwise Gmail SMTP with GMAIL_USER + GMAIL_APP_PASSWORD.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.14';

const env = (k: string) => Deno.env.get(k) || '';
const SITE = (env('SITE_URL') || 'https://jonathankarni165.github.io/naflaasimon/').replace(/\/?$/, '/');
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));


// WhatsApp (Meta Cloud API). Does nothing until WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are set; never throws.
// Only people who opted in (profiles.whatsapp_optin) with a phone number get a message, and only through approved templates.
const toE164 = (p: string) => { const d = String(p || '').replace(/\D/g, ''); if (d.startsWith('972')) return d; if (d.startsWith('0')) return '972' + d.slice(1); return d.length >= 9 ? '972' + d : ''; };
async function whatsapp(phone: string, template: string, params: string[]) {
  const token = env('WHATSAPP_TOKEN'), id = env('WHATSAPP_PHONE_ID'), to = toE164(phone);
  if (!token || !id || !to) return;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: 'he' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text).slice(0, 300) })) }] } }),
    });
    if (!r.ok) console.error('whatsapp', r.status, await r.text());
  } catch (e) { console.error('whatsapp', e); }
}
// Phone of a user who opted in to WhatsApp ('' if none). Tutors' private phone lives in tutor_contacts.
async function waPhone(db: any, uid: string, tutorId?: string) {
  const { data: p } = await db.from('profiles').select('phone, whatsapp_optin').eq('id', uid).maybeSingle();
  if (!p?.whatsapp_optin) return '';
  if (tutorId) { const { data: c } = await db.from('tutor_contacts').select('phone').eq('tutor_id', tutorId).maybeSingle(); if (c?.phone) return c.phone; }
  return p.phone || '';
}

async function send(to: string[], bcc: string[], subject: string, html: string, text: string) {
  if (env('RESEND_API_KEY')) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('MAIL_FROM') || 'נפל האסימון <noreply@naflaasimon.co.il>', to, ...(bcc.length ? { bcc } : {}), subject, html, text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
    return;
  }
  const user = env('GMAIL_USER');
  if (!user || !env('GMAIL_APP_PASSWORD')) throw new Error('no mail provider configured');
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass: env('GMAIL_APP_PASSWORD') } });
  await transport.sendMail({ from: { name: 'נפל האסימון', address: user }, to: to.length ? to : user, bcc: bcc.length ? bcc : undefined, subject, text, html });
}

const frame = (inner: string, why: string) => `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#3A3130;max-width:560px">${inner}<p style="color:#7D7976;font-size:13px">${why}</p></div>`;
const button = (link: string, label: string) => `<p><a href="${link}" style="display:inline-block;background:#3A3130;color:#F3F0E9;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">${esc(label)}</a></p>`;
const quote = (t: string) => `<div style="white-space:pre-wrap;background:#F3F0E9;border-radius:10px;padding:12px 14px">${esc(t)}</div>`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const { kind, id } = await req.json().catch(() => ({}));
  if (!id || (kind !== 'group' && kind !== 'inquiry')) return new Response('bad request', { status: 400 });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const now = new Date();
  const since = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const emailOf = async (uid: string) => (await db.auth.admin.getUserById(uid)).data?.user?.email || '';

  try {
    if (kind === 'group') {
      const { data: m } = await db.from('group_messages').update({ notified_at: now.toISOString() })
        .eq('id', id).is('notified_at', null).gt('created_at', since).eq('is_tutor', true)
        .select('id, text, user_id, user_name, group_id, groups(title)').maybeSingle();
      if (!m) return new Response('nothing to send', { status: 200 });
      const { data: seats } = await db.from('group_seats').select('user_id').eq('group_id', (m as any).group_id).eq('status', 'approved');
      const ids = [...new Set((seats || []).map((s: any) => s.user_id).filter((u: string) => u && u !== (m as any).user_id))];
      const emails = (await Promise.all(ids.map(emailOf))).filter(Boolean);
      if (!emails.length) return new Response('no members', { status: 200 });
      const title = (m as any).groups?.title || 'הקבוצה';
      const link = `${SITE}#group-${(m as any).group_id}`;
      const first = String((m as any).user_name || 'המורה').split(' ')[0];
      const subject = `הודעה חדשה בקבוצה "${title}"`;
      const text = `${first} כתב/ה בקבוצה "${title}":\n\n${(m as any).text}\n\nלצ׳אט הקבוצה: ${link}`;
      const html = frame(`<p><b>${esc(first)}</b> כתב/ה בקבוצה <b>${esc(title)}</b>:</p>${quote((m as any).text)}${button(link, 'לצ׳אט הקבוצה')}`, 'קיבלת את המייל כי נרשמת לקבוצה בנפל האסימון.');
      await Promise.all(ids.map(async (u: string) => { const ph = await waPhone(db, u); if (ph) await whatsapp(ph, 'group_message', ['שלום', title, link]); })).catch(() => {});
      await send([], emails, subject, html, text);
      return new Response('sent', { status: 200 });
    }

    // kind === 'inquiry'
    const { data: m } = await db.from('inquiry_messages').update({ notified_at: now.toISOString() })
      .eq('id', id).is('notified_at', null).gt('created_at', since)
      .select('id, text, from_tutor, inquiry_id, inquiries(user_id, name, tutor_id, tutors(name, owner_id))').maybeSingle();
    if (!m) return new Response('nothing to send', { status: 200 });
    const q = (m as any).inquiries; const tutor = q?.tutors;
    // Batch bursts: if the same side already got a mail in the last 5 minutes, skip this one.
    const recent = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { count } = await db.from('inquiry_messages').select('id', { count: 'exact', head: true })
      .eq('inquiry_id', (m as any).inquiry_id).eq('from_tutor', (m as any).from_tutor).neq('id', id).gt('notified_at', recent);
    if (count) return new Response('batched', { status: 200 });
    const toTutor = !(m as any).from_tutor;
    const to = await emailOf(toTutor ? tutor?.owner_id : q?.user_id);
    if (!to) return new Response('no recipient', { status: 200 });
    const who = toTutor ? q?.name : tutor?.name;
    const link = `${SITE}${toTutor ? '#panel-inbox' : '#panel-seats'}`;
    const first = String(toTutor ? tutor?.name || '' : q?.name || '').split(' ')[0];
    const subject = `הודעה חדשה מ${who}`;
    const text = `היי ${first},\n\n${who} שלח/ה לך הודעה בנפל האסימון:\n\n${(m as any).text}\n\nלתשובה: ${link}`;
    const html = frame(`<p>היי ${esc(first)},</p><p><b>${esc(who)}</b> שלח/ה לך הודעה בנפל האסימון:</p>${quote((m as any).text)}${button(link, 'לתשובה באתר')}`, 'קיבלת את המייל כי יש לך שיחה פעילה בנפל האסימון.');
    const recipient = toTutor ? tutor?.owner_id : q?.user_id;
    try { const ph = await waPhone(db, recipient, toTutor ? q?.tutor_id : undefined); if (ph) await whatsapp(ph, 'new_message', [first || 'שלום', who, link]); } catch (e) { console.error(e); }
    await send([to], [], subject, html, text);
    return new Response('sent', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('mail failed', { status: 502 });
  }
});
