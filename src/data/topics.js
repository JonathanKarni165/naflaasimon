// Study topics for the free-text "מה רוצים ללמוד?" search. Each line: subject | level hint | topics.
// A topic narrows the search to its subject (and to the level when the hint names one of LEVELS).
// Tutors can tick the topics they teach; those tutors come first in the results.
// Add topics freely: one comma-separated line per subject and level.
import { LEVELS } from './constants.js';

const RAW = `
מתמטיקה|3 יח״ל|שאלון 371, שאלון 372, שאלון 35181, שאלון 35182
מתמטיקה|4 יח״ל|שאלון 471, שאלון 472, שאלון 35481, שאלון 35482
מתמטיקה|5 יח״ל|שאלון 581, שאלון 582, שאלון 35581, שאלון 35582
מתמטיקה|אקדמיה|חדו״א 1, חדו״א 2, אינפי 1, אינפי 2, אלגברה לינארית 1, אלגברה לינארית 2, משוואות דיפרנציאליות, מתמטיקה בדידה, לוגיקה, תורת הגרפים, קומבינטוריקה, אלגברה מופשטת, פונקציות מרוכבות, אנליזה נומרית, מתמטיקה לכלכלנים, מכינה במתמטיקה
מתמטיקה|יסודי|
מתמטיקה|חטיבת ביניים|
פיזיקה|תיכון|
פיזיקה|אקדמיה|פיזיקה 1, פיזיקה 2, מכניקה קלאסית, אלקטרומגנטיות, מכניקת הקוונטים, תרמודינמיקה, פיזיקה סטטיסטית
כימיה|תיכון|
כימיה|אקדמיה|כימיה כללית, כימיה אורגנית, כימיה פיזיקלית, כימיה אנליטית, ביוכימיה
ביולוגיה|תיכון|
ביולוגיה|אקדמיה|ביולוגיה של התא, ביולוגיה מולקולרית, גנטיקה, מיקרוביולוגיה, פיזיולוגיה, אנטומיה
מדעי המחשב|תיכון|
מדעי המחשב|אקדמיה|מבוא למדעי המחשב, מבני נתונים, אלגוריתמים, תכנות בשפת C, תכנות מונחה עצמים, מערכות הפעלה, ארכיטקטורת מחשבים, רשתות תקשורת, בסיסי נתונים, אוטומטים וחישוביות, למידת מכונה, בינה מלאכותית
אנגלית|תיכון|
אנגלית|אקדמיה|אמיר״ם, פטור באנגלית, TOEFL, IELTS, אנגלית אקדמית
לשון|תיכון|
לשון|אקדמיה|מבחן יע״ל, כתיבה אקדמית
ספרות|תיכון|
היסטוריה|תיכון|
אזרחות|תיכון|
תנ״ך|תיכון|
ערבית|תיכון|
סטטיסטיקה|אקדמיה|מבוא לסטטיסטיקה, סטטיסטיקה 1, סטטיסטיקה 2, מבוא להסתברות, שיטות מחקר
פסיכומטרי|פסיכומטרי|מבחן מימד, מבחן מתא״ם
כלכלה|תיכון|
כלכלה|אקדמיה|מיקרו כלכלה, מאקרו כלכלה, אקונומטריקה, מימון
חשבונאות|אקדמיה|חשבונאות פיננסית, הנהלת חשבונות, מיסים, בחינות רואי חשבון
גאוגרפיה|תיכון|
מחשבת ישראל|תיכון|
צרפתית|תיכון|
ספרדית|תיכון|
הנדסת חשמל|אקדמיה|מעגלים חשמליים, אותות ומערכות, מערכות ספרתיות, אלקטרוניקה, התקני מוליכים למחצה, שדות אלקטרומגנטיים, מערכות בקרה, תקשורת ספרתית, עיבוד אותות, מערכות הספק
הנדסת מכונות|אקדמיה|סטטיקה, דינמיקה, חוזק חומרים, מכניקת זורמים, מעבר חום, תכן מכני, שרטוט הנדסי
הנדסה אזרחית|אקדמיה|ניתוח מבנים, בטון מזוין, מכניקת קרקע, הידראוליקה
הנדסת תעשייה וניהול|אקדמיה|חקר ביצועים, סימולציה, הנדסת איכות, כלכלה הנדסית
הנדסה כימית|אקדמיה|תופעות מעבר, תכן ריאקטורים, תהליכי הפרדה
הנדסה ביו-רפואית|אקדמיה|ביומכניקה, עיבוד אותות ביו-רפואיים
פסיכולוגיה|אקדמיה|מבוא לפסיכולוגיה, שיטות מחקר בפסיכולוגיה
משפטים|אקדמיה|דיני חוזים, דיני נזיקין, משפט חוקתי, משפט פלילי, בחינות לשכת עורכי הדין
מנהל עסקים|אקדמיה|שיווק, מימון, ניהול
`;

const LEVEL_SET = new Set(LEVELS);
// Exam codes decide the level: שאלון 582 → 5 יח״ל, etc.
const examLevel = (name) => {
  // Old codes: 371/471/581 (first digit = units). New codes: 35181 / 35481 / 35581 (351 = 3 units, 354 = 4, 355 = 5).
  const old = name.match(/^שאלון\s*([345])\d\d$/);
  if (old) return `${old[1]} יח״ל`;
  const nw = name.match(/^שאלון\s*35([145])8\d$/);
  return nw ? `${{ 1: 3, 4: 4, 5: 5 }[nw[1]]} יח״ל` : '';
};

export const TOPICS = RAW.trim().split('\n').flatMap((line) => {
  const [subject, hint, list] = line.split('|');
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((name) => {
    // Only exam codes, academia and psychometry narrow the level: a 4-unit topic is taught by 5-unit tutors too.
    const level = examLevel(name) || (hint === 'אקדמיה' || hint === 'פסיכומטרי' ? hint : '');
    return { name, subject, hint, level };
  });
}).filter((t, i, all) => {
  // The same topic listed at two levels (e.g. organic chemistry in school and university) appears once, without a level.
  const first = all.findIndex((x) => x.subject === t.subject && x.name === t.name);
  if (first !== i) { all[first].level = all[first].level === t.level ? t.level : ''; return false; }
  return true;
});

// Subjects and the levels they are taught at come from every line, including lines with no courses.
const LINES = RAW.trim().split('\n').map((line) => line.split('|'));
export const TOPIC_SUBJECTS = [...new Set(LINES.map(([subject]) => subject))];

// Hebrew-friendly matching: ignore quotes/geresh, hyphens and spaces, and the prefix ה.
export const norm = (s) => String(s || '').toLowerCase()
  .replace(/[״"׳'`\-–]/g, '').replace(/\s+/g, ' ').trim();

// Bagrut units that actually exist per subject (high school). Only these get a "subject - N יח״ל" row.
// Compulsory humanities are 2 units, with a 5-unit extended track; the sciences are 5-unit majors.
export const BAGRUT_UNITS = {
  'מתמטיקה': [3, 4, 5], 'אנגלית': [3, 4, 5],
  'פיזיקה': [5], 'כימיה': [5], 'ביולוגיה': [5], 'מדעי המחשב': [5], 'כלכלה': [5],
  'לשון': [2], 'ספרות': [2, 5], 'היסטוריה': [2, 5], 'אזרחות': [2, 5], 'תנ״ך': [2, 5],
  'מחשבת ישראל': [2, 5], 'גאוגרפיה': [2, 5], 'ערבית': [3, 5], 'צרפתית': [3, 5], 'ספרדית': [3, 5],
};
const unitsOf = (subject) => (BAGRUT_UNITS[subject] || []).map((n) => `${n} יח״ל`);
const HINT_LEVELS = { 'תיכון': unitsOf };
/** Search options: "מקצוע - הכל", "מקצוע - רמה" and "מקצוע - נושא". */
export const OPTIONS = (() => {
  const out = [];
  for (const subject of TOPIC_SUBJECTS) {
    out.push({ key: `s:${subject}`, label: `${subject} - הכל`, subject, level: '', topic: '' });
    const hints = [...new Set(LINES.filter(([x]) => x === subject).map(([, hint]) => hint))];
    const levels = [...new Set(hints.flatMap((h) => (HINT_LEVELS[h] ? HINT_LEVELS[h](subject) : LEVEL_SET.has(h) && h !== subject ? [h] : [])))]
      .sort((x, y) => LEVELS.indexOf(x) - LEVELS.indexOf(y));
    // A subject taught at one level only (e.g. engineering) doesn't need a "subject - level" row.
    // Exam codes are the same thing as their level (שאלון 582 = 5 יח״ל), so they live inside the level row:
    // "מתמטיקה - 5 יח״ל (581, 582)", and typing "582" finds that row.
    if (levels.length > 1) levels.forEach((level) => {
      const exams = TOPICS.filter((t) => t.subject === subject && examLevel(t.name) === level).map((t) => t.name.replace(/^שאלון\s*/, ''));
      const short = exams.filter((c) => c.length <= 3);
      out.push({
        key: `l:${subject}:${level}`, label: `${subject} - ${level}${short.length ? ` (שאלונים ${short.join(', ')})` : ''}`,
        match: exams.length ? `${subject} ${level} שאלון ${exams.join(' ')}` : '', subject, level, topic: '',
      });
    });
  }
  TOPICS.filter((t) => !examLevel(t.name)).forEach((t) => out.push({ key: `t:${t.subject}:${t.name}`, label: `${t.subject} - ${t.name}`, subject: t.subject, level: t.level, topic: t.name }));
  return out;
})();

/** Best matches for what was typed: subject rows first when the subject matches, then topics. */
export function searchOptions(text, limit = 14) {
  const q = norm(text);
  if (!q) return [];
  const words = q.split(' ');
  const scored = [];
  for (const o of OPTIONS) {
    const n = norm(o.label + ' ' + (o.match || ''));
    if (!words.every((w) => n.includes(w))) continue;
    const subj = norm(o.subject);
    const topicN = norm(o.topic);
    let score;
    if (subj.startsWith(q) || q.startsWith(subj)) score = o.topic ? 3 : o.level ? 1 : 0;
    else if (!o.topic && subj.split(' ').some((x) => x.startsWith(words[0]))) score = o.level ? 1.2 : 0.5;
    else if (!o.topic && o.level && norm(o.level).startsWith(q)) score = o.subject === 'מתמטיקה' ? 1 : 1.5;
    else if (topicN.startsWith(q)) score = 2;
    else if (topicN.split(' ').some((x) => x.startsWith(words[0]))) score = 4;
    else score = 5;
    // A match only through the hidden exam codes ranks just below a match on the visible label.
    if (o.match && !words.every((w) => norm(o.label).includes(w))) score += 0.5;
    scored.push([score, o]);
  }
  // Ties keep the list order (levels from young to academia, courses as written).
  return scored.sort((a, b) => a[0] - b[0] || OPTIONS.indexOf(a[1]) - OPTIONS.indexOf(b[1])).slice(0, limit).map(([, o]) => o);
}

export const optionLabel = ({ subject, level, topic }) => (!subject ? '' : topic ? `${subject} - ${topic}` : `${subject} - ${level || 'הכל'}`);

export const topicByName = (name) => TOPICS.find((t) => t.name === name);

// Sub-topics a tutor ticks under each subject they teach (מקצוע ← תת נושא), e.g. מתמטיקה ← אלגברה לינארית 1.
// Broad chapters per subject come first, then the exam codes and courses from RAW above.
// These chapters are for tutor profiles only; the search suggestions stay subjects, exams and courses.
const CHAPTERS = {
  'מתמטיקה': 'חשבון, שברים ואחוזים, אלגברה, גאומטריה, טריגונומטריה, הסתברות, סטטיסטיקה, סדרות, חדו״א, וקטורים, מספרים מרוכבים, גדילה ודעיכה',
  'פיזיקה': 'מכניקה, חשמל ומגנטיות, קרינה וחומר, אופטיקה וגלים, מעבדה',
  'כימיה': 'מבנה וקישור, סטויכיומטריה, חומצות ובסיסים, חמצון חיזור, כימיה אורגנית, אנרגיה וקצב תגובה, מעבדה',
  'ביולוגיה': 'התא, גוף האדם, גנטיקה, אקולוגיה, מעבדה',
  'מדעי המחשב': 'יסודות התכנות, Java, Python, C#, מבני נתונים, תכנות מונחה עצמים',
  'אנגלית': 'אוצר מילים ודקדוק, הבנת הנקרא (Unseen), כתיבה, שיחה (Oral), ספרות (Literature)',
  'לשון': 'תחביר, מורפולוגיה, הבנת הנקרא, כתיבה',
  'ספרות': 'שירה, סיפור קצר, רומן, דרמה',
  'היסטוריה': 'לאומיות וציונות, השואה, הקמת המדינה, העת החדשה',
  'אזרחות': 'עקרונות הדמוקרטיה, מוסדות השלטון, זכויות האדם, מדינת ישראל כמדינה יהודית ודמוקרטית',
  'תנ״ך': 'תורה, נביאים, כתובים',
  'ערבית': 'דקדוק, הבנת הנקרא, שיחה (ערבית מדוברת), תרגום',
  'סטטיסטיקה': 'סטטיסטיקה תיאורית, הסתברות, התפלגויות, בדיקת השערות, רגרסיה, SPSS',
  'כלכלה': 'מיקרו כלכלה, מאקרו כלכלה',
  'חשבונאות': 'דוחות כספיים',
  'גאוגרפיה': 'גאוגרפיה פיזית, גאוגרפיה של האדם, ארץ ישראל',
  'מחשבת ישראל': 'פילוסופיה יהודית, הגות בעת החדשה',
  'צרפתית': 'דקדוק, שיחה, הבנת הנקרא',
  'ספרדית': 'דקדוק, שיחה, הבנת הנקרא',
  'פסיכומטרי': 'חשיבה כמותית, חשיבה מילולית, אנגלית, כתיבת חיבור',
  'פסיכולוגיה': 'סטטיסטיקה לפסיכולוגים',
};
const split = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

/** Sub-topics of a subject, chapters first, then exam codes and courses (no repeats). */
export const subtopicsOf = (subject) => [...new Set([...split(CHAPTERS[subject]), ...TOPICS.filter((t) => t.subject === subject).map((t) => t.name)])];

/** A tutor's sub-topics grouped under the subjects they teach: [[subject, [topic…]]…]; topics outside every subject go under "אחר". */
export function topicsBySubject(subjects = [], topics = []) {
  const left = new Set(topics);
  const out = [];
  for (const s of subjects) {
    const own = subtopicsOf(s).filter((x) => topics.includes(x));
    own.forEach((x) => left.delete(x));
    if (own.length) out.push([s, own]);
  }
  if (left.size) out.push(['אחר', [...left]]);
  return out;
}
