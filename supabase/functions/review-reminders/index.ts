// נפל האסימון: review requests and "did a lesson happen?" questions (supabase/verified-reviews.sql).
// pg_cron calls this every hour. Which emails are due is decided in the database (claim_review_reminders):
// each one is stamped as sent in the same statement, so calling this URL again never sends anything twice.
//  - review1 / review2: to the student, ~2 and ~10 days after the tutor marked "נקבע שיעור" ("מה דעתך על ...?").
//  - lesson: to the tutor, ~3 days after opening a student's details (or a two-way chat) without marking "נקבע שיעור".
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { SITE, esc, layout, button, send } from '../_shared/mail.ts';

const env = (k: string) => Deno.env.get(k) || '';
const firstOf = (n: string) => String(n || '').trim().split(/\s+/)[0] || '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: due, error } = await db.rpc('claim_review_reminders');
  if (error) { console.error(error); return new Response('claim failed', { status: 500 }); }
  if (!due?.length) return new Response('nothing due', { status: 200 });

  const tutorIds = [...new Set(due.map((d: any) => d.tutor_id))];
  const { data: tutors } = await db.from('tutors').select('id, name, owner_id').in('id', tutorIds);
  const tmap = Object.fromEntries((tutors || []).map((t: any) => [t.id, t]));
  const userIds = [...new Set(due.map((d: any) => d.user_id).filter(Boolean))];
  const { data: people } = await db.from('profiles').select('id, name').in('id', userIds);
  const pmap = Object.fromEntries((people || []).map((p: any) => [p.id, p]));
  const { data: inqs } = await db.from('inquiries').select('id, name').in('id', due.map((d: any) => d.inquiry_id));
  const qmap = Object.fromEntries((inqs || []).map((q: any) => [q.id, q]));
  const emailOf = async (uid: string) => (uid ? (await db.auth.admin.getUserById(uid)).data?.user?.email || '' : '');

  let sent = 0;
  for (const d of due as any[]) {
    try {
      const t = tmap[d.tutor_id];
      if (!t) continue;
      const tFirst = firstOf(t.name);
      if (d.kind === 'lesson') {
        const to = await emailOf(t.owner_id);
        if (!to) continue;
        const student = qmap[d.inquiry_id]?.name || pmap[d.user_id]?.name || 'התלמיד';
        const link = `${SITE}?lesson=${d.inquiry_id}#panel-inbox`;
        const subject = `התקיים שיעור עם ${student}?`;
        const text = `היי ${tFirst},\n\nלפני כמה ימים יצרת קשר עם ${student} דרך נפל האסימון.\nאם קבעתם שיעור, סמנו "נקבע שיעור" בפנייה: ${link}\n\nכל תלמיד שמסומן נספר בפרופיל שלך ("תלמידים דרך נפל האסימון") ויוכל לכתוב עליך ביקורת. רק תלמיד שסימנת יכול לכתוב ביקורת.\nחשוב לסמן רק שיעור שבאמת נקבע: אנחנו שואלים גם את התלמיד.`;
        const html = layout(subject, `<p>היי ${esc(tFirst)},</p>
          <p>לפני כמה ימים יצרת קשר עם <b>${esc(student)}</b> דרך האתר. קבעתם שיעור?</p>
          <p>אם כן, סמנו <b>"נקבע שיעור"</b> בפנייה. כל תלמיד שמסומן נספר בפרופיל שלך (<b>"תלמידים דרך נפל האסימון"</b>) ויוכל לכתוב עליך ביקורת. רק תלמידים שסימנת יכולים לכתוב ביקורות, אז זו הדרך לצבור ביקורות.</p>
          ${button(link, 'לפנייה של ' + student)}
          <p style="margin-top:18px;font-size:14px;color:#4F4644">חשוב לסמן רק שיעור שבאמת נקבע: אנחנו מאמתים מול התלמיד, וכך המספר בפרופיל שלך נשאר אמין.</p>`,
          'קיבלת את המייל כי יצרת קשר עם תלמיד דרך פאנל המורה בנפל האסימון.');
        await send({ to, subject, html, text });
        sent++;
        continue;
      }
      // review1 / review2: to the student.
      const to = await emailOf(d.user_id);
      if (!to) continue;
      const sFirst = firstOf(pmap[d.user_id]?.name || qmap[d.inquiry_id]?.name) || 'שלום';
      const { data: shown } = await db.rpc('reviewer_name', { u: d.user_id });
      const link = `${SITE}?review=1#tutor-${d.tutor_id}`;
      const last = d.kind === 'review2';
      const subject = last ? `עדיין אפשר לספר: איך היה עם ${tFirst}?` : `מה דעתך על ${tFirst}?`;
      const opener = `${tFirst} סימן/ה שנקבע ביניכם שיעור דרך נפל האסימון.`;
      const text = `היי ${sFirst},\n\n${opener} איך היה?\nביקורת קצרה עוזרת לתלמידים אחרים לבחור מורה: ${link}\n\nהביקורת תופיע בשם "${shown || 'תלמיד/ה'}", ואפשר לערוך אותה אחר כך.\nלא היה שיעור בסוף? השיבו למייל הזה וספרו לנו.${last ? '\n\nזו התזכורת האחרונה בנושא.' : ''}`;
      const html = layout(subject, `<p>היי ${esc(sFirst)},</p>
        <p>${esc(opener)} <b>איך היה?</b></p>
        <p>כמה כוכבים ומשפט או שניים עוזרים לתלמידים אחרים לבחור מורה, ול${esc(tFirst)} לדעת מה עבד.</p>
        ${button(link, `מה דעתך על ${tFirst}?`)}
        <p style="margin-top:18px;font-size:14px;color:#4F4644">הביקורת תופיע בשם <b>${esc(shown || 'תלמיד/ה')}</b>, ואפשר לערוך אותה אחר כך. לא היה שיעור בסוף? השיבו למייל הזה וספרו לנו.${last ? '<br>זו התזכורת האחרונה בנושא.' : ''}</p>`,
        `קיבלת את המייל כי ${esc(t.name)} סימן/ה שנקבע ביניכם שיעור בנפל האסימון.`);
      await send({ to, subject, html, text });
      sent++;
    } catch (e) { console.error(d.kind, d.inquiry_id, e); }
  }
  return new Response(`sent ${sent}/${due.length}`, { status: 200 });
});
