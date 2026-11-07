// Study topics for the free-text "מה רוצים ללמוד?" search. Each line: subject | level hint | topics.
// A topic narrows the search to its subject (and to the level when the hint names one of LEVELS).
// Tutors can tick the topics they teach; those tutors come first in the results.
// Add topics freely: one comma-separated line per subject and level.
import { LEVELS } from './constants.js';

const RAW = `
מתמטיקה|יסודי|חשבון ליסודי, שברים ואחוזים, הכנה למבחן מיצ״ב
מתמטיקה|חטיבת ביניים|אלגברה, גאומטריה, משוואות, פונקציות, הכנה לתיכון במתמטיקה
מתמטיקה|3 יח״ל|שאלון 371, שאלון 372, שאלון 35181, שאלון 35182
מתמטיקה|4 יח״ל|שאלון 471, שאלון 472, שאלון 35481, שאלון 35482
מתמטיקה|5 יח״ל|שאלון 581, שאלון 582, שאלון 35581, שאלון 35582
מתמטיקה|תיכון|חדו״א, טריגונומטריה, וקטורים, מספרים מרוכבים, הסתברות, סדרות, גאומטריה אנליטית, גאומטריה, בעיות מילוליות, גדילה ודעיכה, אינדוקציה
מתמטיקה|אקדמיה|חדו״א 1, חדו״א 2, אינפי 1, אינפי 2, אלגברה לינארית 1, אלגברה לינארית 2, משוואות דיפרנציאליות, מתמטיקה בדידה, לוגיקה, תורת הגרפים, קומבינטוריקה, אלגברה מופשטת, פונקציות מרוכבות, אנליזה נומרית, מתמטיקה לכלכלנים, מכינה במתמטיקה
פיזיקה|תיכון|מכניקה, חשמל ומגנטיות, קרינה וחומר, אופטיקה וגלים, פיזיקה מודרנית, מעבדה בפיזיקה, בגרות בפיזיקה
פיזיקה|אקדמיה|פיזיקה 1, פיזיקה 2, מכניקה קלאסית, אלקטרומגנטיות, מכניקת הקוונטים, תרמודינמיקה, פיזיקה סטטיסטית
כימיה|תיכון|מבנה וקישור, סטויכיומטריה, חומצות ובסיסים, חמצון חיזור, כימיה אורגנית, שיווי משקל, מעבדה בכימיה, בגרות בכימיה
כימיה|אקדמיה|כימיה כללית, כימיה אורגנית, כימיה פיזיקלית, כימיה אנליטית, ביוכימיה
ביולוגיה|תיכון|התא, גנטיקה, גוף האדם, אקולוגיה, אבולוציה, מעבדה וחקר בביולוגיה, בגרות בביולוגיה
ביולוגיה|אקדמיה|ביולוגיה של התא, ביולוגיה מולקולרית, גנטיקה, מיקרוביולוגיה, פיזיולוגיה, אנטומיה
מדעי המחשב|תיכון|פייתון, ג׳אווה, C#, מבני נתונים, בגרות במדעי המחשב, פרויקט גמר, סייבר
מדעי המחשב|אקדמיה|מבוא למדעי המחשב, מבני נתונים, אלגוריתמים, תכנות בשפת C, C++, מערכות הפעלה, ארכיטקטורת מחשבים, רשתות תקשורת, בסיסי נתונים, אוטומטים וחישוביות, למידת מכונה, בינה מלאכותית, פיתוח אתרים, הכנה לראיונות עבודה
אנגלית|תיכון|בגרות באנגלית, דקדוק, הבנת הנקרא, כתיבה באנגלית, שיחה באנגלית, אנגלית ליסודי
אנגלית|אקדמיה|אמיר״ם, פטור באנגלית, TOEFL, IELTS, אנגלית אקדמית
לשון|תיכון|בגרות בלשון, הבעה וכתיבה, תחביר, צורות
לשון|אקדמיה|מבחן יע״ל, כתיבה אקדמית
ספרות|תיכון|בגרות בספרות, שירה, סיפור קצר
היסטוריה|תיכון|בגרות בהיסטוריה
אזרחות|תיכון|בגרות באזרחות
תנ״ך|תיכון|בגרות בתנ״ך
ערבית|תיכון|ערבית מדוברת, ערבית ספרותית, בגרות בערבית
סטטיסטיקה|אקדמיה|מבוא לסטטיסטיקה, סטטיסטיקה 1, סטטיסטיקה 2, מבוא להסתברות, SPSS, שיטות מחקר
פסיכומטרי|פסיכומטרי|חשיבה כמותית, חשיבה מילולית, אנגלית לפסיכומטרי, מבחן מימד, מבחן מתא״ם
כלכלה|תיכון|בגרות בכלכלה
כלכלה|אקדמיה|מיקרו כלכלה, מאקרו כלכלה, אקונומטריקה, מימון
חשבונאות|אקדמיה|חשבונאות פיננסית, הנהלת חשבונות, מיסים, בחינות רואי חשבון
גאוגרפיה|תיכון|בגרות בגאוגרפיה
מחשבת ישראל|תיכון|בגרות במחשבת ישראל
צרפתית|תיכון|צרפתית למתחילים, בגרות בצרפתית
ספרדית|תיכון|ספרדית למתחילים
הנדסת חשמל|אקדמיה|מעגלים חשמליים, אותות ומערכות, מערכות ספרתיות, אלקטרוניקה, התקני מוליכים למחצה, שדות אלקטרומגנטיים, בקרה, תקשורת, עיבוד אותות, מערכות הספק
הנדסת מכונות|אקדמיה|סטטיקה, דינמיקה, חוזק חומרים, מכניקת זורמים, מעבר חום, תכן מכני, שרטוט הנדסי
הנדסה אזרחית|אקדמיה|סטטיקה של מבנים, ניתוח מבנים, בטון, מכניקת קרקע, הידראוליקה
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
  const m = name.match(/(?:שאלון\s*)(3|4|5)(?:8\d|\d\d)$/) || name.match(/שאלון\s*35(3|4|5)8\d/);
  return m ? `${m[1]} יח״ל` : '';
};

export const TOPICS = RAW.trim().split('\n').flatMap((line) => {
  const [subject, hint, list] = line.split('|');
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((name) => {
    // Only exam codes, academia and psychometry narrow the level: a 4-unit topic is taught by 5-unit tutors too.
    const level = examLevel(name) || (hint === 'אקדמיה' || hint === 'פסיכומטרי' ? hint : '');
    return { name, subject, hint, level };
  });
});

export const TOPIC_SUBJECTS = [...new Set(TOPICS.map((t) => t.subject))];

// Hebrew-friendly matching: ignore quotes/geresh, hyphens and spaces, and the prefix ה.
export const norm = (s) => String(s || '').toLowerCase()
  .replace(/[״"׳'`\-–]/g, '').replace(/\s+/g, ' ').trim();

const HINT_LEVELS = { 'תיכון': ['3 יח״ל', '4 יח״ל', '5 יח״ל'] };
/** Search options: "מקצוע - הכל", "מקצוע - רמה" and "מקצוע - נושא". */
export const OPTIONS = (() => {
  const out = [];
  for (const subject of TOPIC_SUBJECTS) {
    out.push({ key: `s:${subject}`, label: `${subject} - הכל`, subject, level: '', topic: '' });
    const hints = [...new Set(TOPICS.filter((t) => t.subject === subject).map((t) => t.hint))];
    const levels = [...new Set(hints.flatMap((h) => HINT_LEVELS[h] || (LEVEL_SET.has(h) && h !== subject ? [h] : [])))]
      .sort((x, y) => LEVELS.indexOf(x) - LEVELS.indexOf(y));
    // A subject taught at one level only (e.g. engineering) doesn't need a "subject - level" row.
    if (levels.length > 1) levels.forEach((level) => out.push({ key: `l:${subject}:${level}`, label: `${subject} - ${level}`, subject, level, topic: '' }));
  }
  TOPICS.forEach((t) => out.push({ key: `t:${t.subject}:${t.name}`, label: `${t.subject} - ${t.name}`, subject: t.subject, level: t.level, topic: t.name }));
  return out;
})();

/** Best matches for what was typed: subject rows first when the subject matches, then topics. */
export function searchOptions(text, limit = 14) {
  const q = norm(text);
  if (!q) return [];
  const words = q.split(' ');
  const scored = [];
  for (const o of OPTIONS) {
    const n = norm(o.label);
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
    scored.push([score, o]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].label.length - b[1].label.length).slice(0, limit).map(([, o]) => o);
}

export const optionLabel = ({ subject, level, topic }) => (!subject ? '' : topic ? `${subject} - ${topic}` : `${subject} - ${level || 'הכל'}`);

export const topicByName = (name) => TOPICS.find((t) => t.name === name);
