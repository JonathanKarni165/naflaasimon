// Checks the spam/profanity filter. Run: npm test
// With TEST_PG=1 it also runs the same cases through mod_check() in a local Postgres (psql) and
// fails if the browser and the database disagree.
import { execFileSync } from 'node:child_process';
import { checkText } from '../src/lib/moderation.js';

// [text, expected reason or null, allow phone]
const cases = [
  ['מורה מעולה, הסבירה סבלנית ועזרה לי לעבור את הבגרות', null],
  ['Great teacher, really helped with calculus!', null],
  ['שתיתי כוס קפה לפני השיעור', null],
  ['צריך להזין את הנתונים לטבלה', null],
  ['ארוחה מזינה לפני מבחן', null],
  ['f(x) = 3x + 5, x = 2', null],
  ['המחיר 150 ₪ לשעה, 2.5 שעות', null],
  ['class assignment passed', null],
  ['תלמידה בכיתה י"א, 5 יחידות', null],
  ['המורה הזה זונה', 'profanity'],
  ['והזונה הזאת', 'profanity'],
  ['ז.ו.נ.ה', 'profanity'],
  ['זּוֹנָה', 'profanity'],
  ['כוס אמק', 'profanity'],
  ['כוסעמק של מורה', 'profanity'],
  ['שרמוטההה', 'profanity'],
  ['לך תזדיין', 'profanity'],
  ['you are a fuuuucking idiot', 'profanity'],
  ['f u c k this', 'profanity'],
  ['sh1t teacher', 'profanity'],
  ['MOTHERFUCKER', 'profanity'],
  ['תבדקו את www.cheap-deals.ru', 'link'],
  ['https://example.org/x', 'link'],
  ['כתבו לי ל-a@b.co.il', 'link'],
  ['דברו איתי בטלגרם t.me/xyz', 'link'],
  ['התקשרו 050-123-4567', 'phone'],
  ['+972 52 1234567', 'phone'],
  ['התקשרו 050-123-4567', null, true],
  ['!!!!!!!!!!!!!!!', 'flood'],
  ['ההההההההההההההה', 'flood'],
];

let bad = 0;
for (const [text, want, allowPhone] of cases) {
  const got = checkText(text, { phone: !allowPhone });
  if (got !== want) { bad++; console.log(`JS  ✗ ${JSON.stringify(text)}: got ${got}, want ${want}`); }
}

if (process.env.TEST_PG) {
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const sql = cases.map(([t, , p]) => `select coalesce(public.mod_check(${q(t)}, ${!!p}), 'null');`).join('\n');
  const out = execFileSync('psql', ['-X', '-tAq', ...(process.env.PGARGS || '').split(' ').filter(Boolean)], { input: sql }).toString().trim().split('\n');
  cases.forEach(([text, want], i) => {
    const got = out[i] === 'null' ? null : out[i];
    if (got !== want) { bad++; console.log(`SQL ✗ ${JSON.stringify(text)}: got ${got}, want ${want}`); }
  });
}

console.log(bad ? `${bad} failed` : `all ${cases.length} cases pass${process.env.TEST_PG ? ' (JS + SQL)' : ''}`);
process.exit(bad ? 1 : 0);
