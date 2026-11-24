// Writes a real HTML page for every route after `vite build`, so search engines, AI tools and link
// previews (WhatsApp, Facebook) see each page's title, description and text without running JavaScript.
// The React app still starts on each page and replaces the static text.
// Also writes 404.html (any other path still opens the app), sitemap.xml and robots.txt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST = 'dist';
const SITE = (process.env.SITE_URL || 'https://jonathankarni165.github.io/naflaasimon/').replace(/\/?$/, '/');
const SB_URL = process.env.VITE_SUPABASE_URL || 'https://chdzyvyvdypmjgupyrvg.supabase.co';
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f4sdNst38X-mSxc3iB3jxA_Hv6bt7fY';
const NAME = 'נפל האסימון';
const OG = SITE + 'og.png';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n = 160) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

async function rest(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
// Any other path (a tutor added after this build, a chat link) still opens the app. Written first, so it exists even if the data fetch fails.
writeFileSync(join(DIST, '404.html'), template);

function page({ path, title, description, image = OG, body, type = 'website', noindex = false }) {
  const url = SITE + path + (path ? '/' : '');
  const full = title ? `${title} | ${NAME}` : `${NAME} | מורים פרטיים למתמטיקה ועוד`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(full)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
    .replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(image)}`)
    .replace(/(<meta property="og:type" content=")[^"]*/, `$1${type}`)
    .replace('</head>', `<link rel="canonical" href="${esc(url)}">\n${noindex ? '<meta name="robots" content="noindex">\n' : ''}</head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="prerender">${body}</div></div>`);
  if (image !== OG) html = html.replace(/<meta property="og:image:(width|height)"[^>]*>\n?/g, '');
  const file = join(DIST, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return noindex ? null : url;
}

const link = (path, text) => `<a href="${esc('/naflaasimon/' + path + (path ? '/' : ''))}">${esc(text)}</a>`;
const nav = `<nav>${link('', 'דף הבית')} · ${link('search', 'חיפוש מורים')} · ${link('groups', 'קבוצות למידה')} · ${link('about', 'אודות')} · ${link('contact', 'צור קשר')}</nav>`;

const [tutors, stats, groups] = await Promise.all([
  rest('tutors?select=id,name,headline,about,subjects,topics,city,area,teaches_online,teaches_frontal,price_online,price_frontal,experience_years,photo,approval,is_example&approval=eq.approved'),
  rest('tutor_stats?select=tutor_id,rating_count,rating_avg'),
  rest('groups?select=id,tutor_id,title,subject,level,description,start_date,time,sessions,mode,city,location,price_per_person'),
]);
const stat = Object.fromEntries(stats.map((s) => [s.tutor_id, s]));
const byId = Object.fromEntries(tutors.map((t) => [t.id, t]));
const prices = (t) => [t.teaches_frontal && t.price_frontal ? `פרונטלי ${t.price_frontal} ₪ לשעה` : '', t.teaches_online && t.price_online ? `אונליין ${t.price_online} ₪ לשעה` : ''].filter(Boolean).join(', ');
const where = (t) => [t.teaches_frontal && t.city ? [t.city, t.area].filter(Boolean).join(', ') : '', t.teaches_online ? 'אונליין' : ''].filter(Boolean).join(' וגם ');
const urls = [];
// Sample tutors (is_example) and their groups stay on the site for now, but are kept out of search engines.
const real = tutors.filter((t) => !t.is_example);
const sampleGroup = (g) => !byId[g.tutor_id] || byId[g.tutor_id].is_example;
const realGroups = groups.filter((g) => !sampleGroup(g));
const tutorItem = (t) => `<li>${link(`tutor/${t.id}`, t.name)}: ${esc(t.headline || '')} · ${esc((t.subjects || []).join(', '))} · ${esc(where(t))}</li>`;

urls.push(page({
  path: '', description: 'מורים פרטיים למתמטיקה ועוד. מחפשים לפי מקצוע, רמה ומיקום, משווים מחיר וביקורות ופונים ישירות למורה, בלי עמלה.',
  body: `${nav}<h1>${NAME}: מורים פרטיים למתמטיקה ועוד</h1><p>מחפשים מורה פרטי לפי מקצוע ומיקום, משווים מחיר וביקורות, ופונים ישירות. בלי עמלה. יש גם קבוצות למידה ומרתונים לבגרות.</p>${real.length ? `<h2>מורים באתר</h2><ul>${real.map(tutorItem).join('')}</ul>` : ''}`,
}));
urls.push(page({
  path: 'search', title: 'חיפוש מורים פרטיים', description: `מורים פרטיים למתמטיקה, אנגלית, פיזיקה ועוד, פרונטלי ואונליין. משווים מחיר וביקורות ופונים ישירות.`,
  body: `${nav}<h1>מורים פרטיים</h1><ul>${real.map(tutorItem).join('')}</ul>`,
}));
const groupItem = (g) => `<li>${link(`group/${g.id}`, g.title)}: ${esc(g.subject)}${g.level ? ` · ${esc(g.level)}` : ''} · ${esc(g.start_date)} · ${g.mode === 'online' ? 'אונליין' : esc(g.city || '')} · ${esc(g.price_per_person)} ₪ לתלמיד</li>`;
urls.push(page({
  path: 'groups', title: 'קבוצות למידה ומרתונים', description: 'קבוצות למידה קטנות ומרתונים לבגרות עם מורה מאומת, בערך חצי מחיר משיעור פרטי.',
  body: `${nav}<h1>קבוצות למידה ומרתונים</h1><ul>${realGroups.map(groupItem).join('')}</ul>`,
}));
urls.push(page({ path: 'groups-marathons', title: 'מרתונים לבגרות', description: 'מרתונים לבגרות במתמטיקה, אנגלית ועוד, אונליין ופרונטלי.', body: `${nav}<h1>מרתונים לבגרות</h1><ul>${realGroups.filter((g) => Number(g.sessions) <= 1).map(groupItem).join('')}</ul>` }));
for (const [path, title, description] of [
  ['about', 'אודות', 'איך נפל האסימון עובד: חיפוש מורים פרטיים ופנייה ישירה בלי עמלה.'],
  ['terms', 'תנאי שימוש', 'תנאי השימוש של נפל האסימון: פלטפורמה בלבד, חינם לתלמידים, בלי עמלה.'],
  ['privacy', 'מדיניות פרטיות', 'איזה מידע נפל האסימון שומר, למה, ואיך מבקשים למחוק אותו.'],
  ['cookies', 'מדיניות עוגיות', 'באילו עוגיות ואחסון בדפדפן נפל האסימון משתמש.'],
  ['accessibility', 'הצהרת נגישות', 'הצהרת הנגישות של נפל האסימון ודרכי פנייה בנושא נגישות.'],
  ['contact', 'צור קשר', 'יצירת קשר עם צוות נפל האסימון.'],
]) urls.push(page({ path, title, description, body: `${nav}<h1>${esc(title)}</h1><p>${esc(description)}</p>` }));

for (const t of tutors) {
  const s = stat[t.id] || {};
  const subj = (t.subjects || []).join(', ');
  const description = clip(`${t.name}, ${t.headline || 'מורה פרטי'}. ${subj}${where(t) ? ` · ${where(t)}` : ''}${prices(t) ? ` · ${prices(t)}` : ''}. ${t.about || ''}`);
  const rating = s.rating_count ? `<p>דירוג ${Number(s.rating_avg).toFixed(1)} מתוך 5 (${s.rating_count} ביקורות)</p>` : '';
  urls.push(page({
    path: `tutor/${t.id}`, noindex: !!t.is_example, title: `${t.name}, שיעורים פרטיים ב${(t.subjects || [])[0] || 'מתמטיקה'}`, description, type: 'profile',
    image: t.photo ? (/^https?:/.test(t.photo) ? t.photo : SITE + t.photo.replace(/^\.?\//, '')) : OG,
    body: `${nav}<article><h1>${esc(t.name)}</h1><p>${esc(t.headline || '')}</p>${rating}<p>מקצועות: ${esc(subj)}</p>${(t.topics || []).length ? `<p>קורסים ונושאים: ${esc(t.topics.join(', '))}</p>` : ''}<p>איפה: ${esc(where(t))}</p>${prices(t) ? `<p>מחיר: ${esc(prices(t))}</p>` : ''}${t.experience_years ? `<p>${esc(t.experience_years)} שנות ניסיון</p>` : ''}${t.about ? `<h2>קצת עליי</h2><p>${esc(t.about)}</p>` : ''}</article>`,
  }));
}
for (const g of groups) {
  const t = byId[g.tutor_id];
  const description = clip(`${g.title}. ${g.subject}${g.level ? ` ${g.level}` : ''}, מתחילה ב-${g.start_date}, ${g.mode === 'online' ? 'אונליין' : g.city || 'פרונטלי'}, ${g.price_per_person} ₪ לתלמיד${t ? `, עם ${t.name}` : ''}. ${g.description || ''}`);
  urls.push(page({
    path: `group/${g.id}`, noindex: sampleGroup(g), title: g.title, description,
    body: `${nav}<article><h1>${esc(g.title)}</h1><p>${esc(description)}</p>${t ? `<p>המורה: ${link(`tutor/${t.id}`, t.name)}</p>` : ''}</article>`,
  }));
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.filter(Boolean).map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /naflaasimon/panel\nDisallow: /naflaasimon/chat/\n\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`prerendered ${urls.length} pages (${tutors.length} tutors, ${groups.length} groups); in sitemap: ${urls.filter(Boolean).length}`);
