// נפל האסימון: emails the tutor when a student sends an inquiry.
// Called by the database (supabase/notify.sql) right after a row is added to public.inquiries.
// Sending (Resend or Gmail SMTP) lives in ../_shared/mail.ts.
// Each inquiry is mailed at most once and only within 10 minutes of being sent (inquiries.notified_at),
// so the public URL can't be used to spam anyone. Secrets: GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { SITE, esc, layout, button, quote, send } from '../_shared/mail.ts';

const env = (k: string) => Deno.env.get(k) || '';


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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const { inquiry_id } = await req.json().catch(() => ({}));
  if (!inquiry_id) return new Response('missing inquiry_id', { status: 400 });

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  // Claim the inquiry: only a fresh one that wasn't mailed yet. Two calls can't both win.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: q, error } = await db.from('inquiries').update({ notified_at: new Date().toISOString() })
    .eq('id', inquiry_id).is('notified_at', null).gt('created_at', since)
    .select('id, name, subject, level, message, contact_via, phone, email, tutor_id, tutors(name, owner_id)').maybeSingle();
  if (error || !q) return new Response('nothing to send', { status: 200 });
  const owner = (q as any).tutors?.owner_id;
  if (!owner) return new Response('tutor has no account', { status: 200 });
  const { data: u } = await db.auth.admin.getUserById(owner);
  const to = u?.user?.email;
  if (!to) return new Response('tutor has no email', { status: 200 });

  const first = String((q as any).tutors?.name || '').split(' ')[0];
  const link = `${SITE}#panel-inbox`;
  const via = (q.contact_via || ['site']).map((v: string) => ({ site: 'צ׳אט באתר', phone: 'טלפון', email: 'מייל' }[v] || v)).join(', ');
  const subject = `פנייה חדשה מ${q.name}${q.subject ? ` (${q.subject})` : ''}`;
  const text = `היי ${first},\n\nקיבלת פנייה חדשה בנפל האסימון.\n\n${q.message}\n\nדרך קשר מועדפת: ${via}\n\nלתשובה: ${link}`;
  const html = layout(subject, `<p>היי ${esc(first)},</p><p>קיבלת <b>פנייה חדשה</b> מ<b>${esc(q.name)}</b>${q.subject ? ` בנושא ${esc(q.subject)}` : ''}.</p>
    ${quote(q.message)}<p>דרך קשר מועדפת: ${esc(via)}</p>${button(link, 'לתשובה בפאנל')}`, 'קיבלת את המייל כי יש לך פרופיל מורה בנפל האסימון.');
  // Replying from the mail client reaches the student directly when they asked to be contacted by email.
  const replyTo = (q.contact_via || []).includes('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email || '') ? q.email : undefined;
  try { const ph = await waPhone(db, owner, (q as any).tutor_id); if (ph) await whatsapp(ph, 'new_inquiry', [first || 'שלום', q.name, link]); } catch (e) { console.error(e); }
  try { await send({ to, subject, html, text, replyTo }); } catch (e) { console.error(e); return new Response('mail failed', { status: 502 }); }
  return new Response('sent', { status: 200 });
});
