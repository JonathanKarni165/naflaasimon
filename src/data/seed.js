// Demo data for the preview. Everything here is invented and marked as an example in the UI.
import { cityByName } from './constants.js';

const day = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const DEMO_USERS = [
  { id: 'u-admin', name: 'מנהל האתר', email: 'admin@example.com', isAdmin: true, note: 'יכול להוסיף ולערוך את כל המורים' },
  { id: 'u-dana', name: 'דנה לוי', email: 'dana@example.com', isAdmin: false, note: 'מורה עם פרופיל קיים' },
  { id: 'u-student', name: 'עידו מזרחי', email: 'ido@example.com', isAdmin: false, note: 'תלמיד, לחיפוש ולכתיבת ביקורות' },
];

const T = (o) => {
  const c = cityByName(o.city);
  return {
    teachesOnline: true, teachesFrontal: true, verified: true, contactCount: 0, ownerId: null,
    createdAt: '2026-10-01T10:00:00Z', ...o, lat: c?.lat ?? null, lng: c?.lng ?? null,
  };
};

export const SEED_TUTORS = [
  T({ id: 't1', name: 'דנה לוי', photo: 'img/face0.jpg', ownerId: 'u-dana', headline: 'סטודנטית לתואר שני במתמטיקה', city: 'רמת גן', area: 'ליד הבורסה',
    subjects: ['מתמטיקה', 'סטטיסטיקה'], levels: ['4 יח״ל', '5 יח״ל', 'אקדמיה'], priceFrontal: 150, priceOnline: 140, experienceYears: 6, phone: '050-0000101', contactCount: 212,
    about: 'מלמדת מתמטיקה כבר שש שנים, בעיקר 5 יח״ל ושנה א׳ באוניברסיטה. אני מתחילה כל שיעור מהשאלה שתקועה לכם, ובונה משם את ההבנה עד שזה יושב. בין התלמידים שלי יש כאלה שעלו מ־60 ל־95 בבגרות.' }),
  T({ id: 't2', name: 'מיכאל רוזן', photo: 'img/face2.jpg', headline: 'מורה למתמטיקה בתיכון, 22 שנות ניסיון', city: 'חיפה', area: 'כרמל',
    subjects: ['מתמטיקה', 'פיזיקה'], levels: ['3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 170, priceOnline: 160, experienceYears: 22, phone: '050-0000102', contactCount: 340,
    about: 'רכז מתמטיקה בתיכון בחיפה. מכיר את מבנה הבגרות לפרטי פרטים ויודע אילו שאלות חוזרות כל שנה. מתאים במיוחד לתלמידים שצריכים סדר ושיטה.' }),
  T({ id: 't3', name: 'נועה פרידמן', photo: 'img/face3.jpg', headline: 'סטודנטית להנדסת חשמל בטכניון', city: 'חיפה', teachesFrontal: false,
    subjects: ['מתמטיקה', 'פיזיקה', 'פסיכומטרי'], levels: ['חטיבת ביניים', '3 יח״ל', 'פסיכומטרי'], priceOnline: 110, experienceYears: 3, phone: '050-0000103', contactCount: 96,
    about: 'שיעורים אונליין עם לוח משותף והקלטה של כל שיעור. קיבלתי 780 בפסיכומטרי ואני מלמדת את החלק הכמותי עם הרבה טריקים לחיסכון בזמן.' }),
  T({ id: 't4', name: 'עומר בן דוד', photo: 'img/face1.jpg', headline: 'מפתח תוכנה ומרצה במכללה', city: 'תל אביב', area: 'פלורנטין',
    subjects: ['מדעי המחשב', 'מתמטיקה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 180, priceOnline: 160, experienceYears: 8, phone: '050-0000104', contactCount: 120,
    about: 'מלמד מבוא למדעי המחשב, מבני נתונים ופייתון, וגם בדידה וחדו״א לסטודנטים. אני מביא דוגמאות מהעבודה כדי שהחומר יהיה מוחשי.' }),
  T({ id: 't5', name: 'רחל אברהם', photo: 'img/face4.jpg', headline: 'מורה לאנגלית, לשעבר בודקת בגרויות', city: 'כפר סבא',
    subjects: ['אנגלית', 'לשון'], levels: ['יסודי', 'חטיבת ביניים', '4 יח״ל', '5 יח״ל'], priceFrontal: 140, priceOnline: 130, experienceYears: 18, phone: '050-0000105', contactCount: 150,
    about: 'הייתי בודקת בגרויות באנגלית שמונה שנים, אז אני יודעת בדיוק על מה מורידים נקודות. מלמדת בבית שלי בכפר סבא או בזום.' }),
  T({ id: 't6', name: 'יוסי מזרחי', photo: 'img/face5.jpg', headline: 'מהנדס כימיה, מורה פרטי בערבים', city: 'באר שבע',
    subjects: ['כימיה', 'מתמטיקה', 'פיזיקה'], levels: ['3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 10, phone: '050-0000106', contactCount: 70,
    about: 'כימיה ומתמטיקה בגובה העיניים. סבלני מאוד, מתאים גם לתלמידים עם לקויות למידה.' }),
  T({ id: 't7', name: 'גיל שמש', headline: 'סטודנט שנה ב׳ למתמטיקה', city: 'ירושלים', area: 'גבעת רם',
    subjects: ['מתמטיקה'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל'], priceFrontal: 90, priceOnline: 80, experienceYears: 1, phone: '050-0000107', contactCount: 8, verified: false,
    about: 'התחלתי ללמד השנה. מחיר נמוך לתלמידי חטיבה ותיכון.' }),
  T({ id: 't8', name: 'שירה כהן', headline: 'מורה למתמטיקה ביסודי ובחטיבה', city: 'ראשון לציון',
    subjects: ['מתמטיקה', 'אנגלית'], levels: ['יסודי', 'חטיבת ביניים'], priceFrontal: 100, priceOnline: 90, experienceYears: 7, phone: '050-0000108', contactCount: 88,
    about: 'מלמדת ילדים בכיתות ג׳ עד ט׳. משחקים, דפי עבודה ובעיקר הרבה ביטחון עצמי.' }),
  T({ id: 't9', name: 'אלון ברק', headline: 'דוקטורנט לפיזיקה', city: 'רחובות', area: 'ליד מכון ויצמן',
    subjects: ['פיזיקה', 'מתמטיקה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 200, priceOnline: 180, experienceYears: 9, phone: '050-0000109', contactCount: 64,
    about: 'פיזיקה 5 יח״ל, מכניקה וחשמל לסטודנטים. אני מסביר את האינטואיציה לפני הנוסחה.' }),
  T({ id: 't10', name: 'מאיה גולן', headline: 'מורה לפסיכומטרי כבר 10 שנים', city: 'תל אביב', area: 'הצפון הישן',
    subjects: ['פסיכומטרי', 'אנגלית', 'מתמטיקה'], levels: ['פסיכומטרי'], priceFrontal: 190, priceOnline: 170, experienceYears: 10, phone: '050-0000110', contactCount: 180,
    about: 'הכנה אישית לפסיכומטרי בשלושת הפרקים. הממוצע של התלמידים שלי בשנה האחרונה עלה ב־92 נקודות.' }),
  T({ id: 't11', name: 'חן אוחיון', headline: 'סטודנטית לביולוגיה', city: 'נתניה', teachesFrontal: true,
    subjects: ['ביולוגיה', 'כימיה'], levels: ['חטיבת ביניים', '5 יח״ל'], priceFrontal: 110, priceOnline: 100, experienceYears: 2, phone: '050-0000111', contactCount: 22,
    about: 'ביולוגיה לבגרות כולל עבודת מעבדה ותצפית.' }),
  T({ id: 't12', name: 'אריאל נחום', headline: 'מורה למתמטיקה ומדעי המחשב', city: 'מודיעין',
    subjects: ['מתמטיקה', 'מדעי המחשב'], levels: ['4 יח״ל', '5 יח״ל'], priceFrontal: 130, priceOnline: 120, experienceYears: 5, phone: '050-0000112', contactCount: 41,
    about: 'מלמד בתיכון במודיעין. שיעורים בבית התלמיד באזור מודיעין ושוהם.' }),
  T({ id: 't13', name: 'ליאת שגיא', headline: 'מורה ללשון ולספרות', city: 'פתח תקווה',
    subjects: ['לשון', 'ספרות', 'היסטוריה'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 12, phone: '050-0000113', contactCount: 35,
    about: 'לשון ספרות והיסטוריה לבגרות, עם סיכומים מסודרים לכל נושא.' }),
  T({ id: 't14', name: 'רון אלמוג', headline: 'סטודנט להנדסה, בוגר 5 יח״ל ב־100', city: 'הרצליה', teachesOnline: true, teachesFrontal: true,
    subjects: ['מתמטיקה', 'פיזיקה'], levels: ['4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 100, experienceYears: 2, phone: '050-0000114', contactCount: 30,
    about: 'מתמטיקה ופיזיקה 5 יח״ל. שיעור ראשון של חצי שעה בלי תשלום כדי לראות שיש התאמה.' }),
];
// Topics the example tutors ticked in their profile (they come first when a student searches that topic).
const SEED_TOPICS = {
  t1: ['שאלון 581', 'שאלון 582', 'חדו״א 1', 'מבוא לסטטיסטיקה'],
  t2: ['שאלון 471', 'שאלון 472'],
  t3: ['מבחן מימד', 'פיזיקה 1', 'מעגלים חשמליים'],
};
SEED_TUTORS.forEach((t) => { if (SEED_TOPICS[t.id]) t.topics = SEED_TOPICS[t.id]; });


// [tutorId, review count, rough average]
const REVIEW_PLAN = [
  ['t1', 38, 4.9], ['t2', 61, 4.85], ['t3', 22, 4.8], ['t4', 15, 4.7], ['t5', 27, 4.75], ['t6', 9, 4.6],
  ['t7', 1, 5], ['t8', 18, 4.6], ['t9', 6, 4.9], ['t10', 34, 4.7], ['t11', 3, 4.3], ['t12', 7, 4.5], ['t13', 11, 4.4], ['t14', 2, 5],
];

const NAMES = ['יעל', 'איתי', 'שחר', 'רוני', 'תמר', 'עידו', 'נוי', 'אורי', 'מיכל', 'דניאל', 'הילה', 'אביב', 'ליה', 'יונתן', 'עדי', 'אמה של נועם', 'אבא של רז', 'גלעד', 'שני', 'עמית'];
const TEXTS = {
  5: ['פשוט הצלה. סוף סוף הבנתי טריגונומטריה.', 'מסבירה בסבלנות אינסופית, הציון עלה ב־20 נקודות.', 'מורה מעולה, תמיד מגיע מוכן ועם דפי תרגול.', 'הבן שלי מחכה לשיעורים, וזה אומר הכול.', 'עזר לי לעבור את הבגרות בביטחון.', 'הסברים ברורים ותמיד זמין בוואטסאפ לשאלות.', 'שווה כל שקל.'],
  4: ['מורה טוב מאוד, לפעמים קצת מהר מדי.', 'עזר מאוד, היה קשה לתאם זמנים.', 'הסברים טובים, הייתי שמחה ליותר תרגול בבית.'],
  3: ['בסדר, אבל ציפיתי ליותר הכנה לבגרות.', 'נחמד, לא תמיד דייק בזמנים.'],
};

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function buildSeedReviews() {
  const r = rng(42); const out = []; let k = 0;
  for (const [tutorId, n, avg] of REVIEW_PLAN) {
    for (let i = 0; i < n; i++) {
      // Spread ratings so the mean lands near avg.
      const x = r(); let rating = 5;
      const p5 = Math.max(0, Math.min(1, (avg - 4) * 1.1));
      if (x > p5) rating = x > p5 + (1 - p5) * 0.8 ? 3 : 4;
      if (n <= 2) rating = Math.round(avg);
      const pool = TEXTS[rating];
      out.push({
        id: `r${++k}`, tutorId, userId: `seed-${k}`, userName: NAMES[Math.floor(r() * NAMES.length)],
        rating, text: pool[Math.floor(r() * pool.length)],
        createdAt: new Date(Date.now() - Math.floor(r() * 400) * 86400000).toISOString(),
      });
    }
  }
  return out;
}

export function buildSeedGroups() {
  const groups = [
    { id: 'g1', tutorId: 't2', title: 'מרתון לבגרות 472', subject: 'מתמטיקה', level: '4 יח״ל', startDate: day(9), time: '09:00–15:00', sessions: 1,
      mode: 'online', location: '', pricePerPerson: 90, maxSeats: 12,
      description: 'יום מרתון אחד לפני הבגרות: חוזרים על כל סוגי השאלות בשאלון 472, פותרים בחינה מלאה מהשנה שעברה ומסיימים עם דף טיפים. מקבלים הקלטה של המרתון.' },
    { id: 'g2', tutorId: 't1', title: 'הכנה לבגרות 582, שמונה מפגשים', subject: 'מתמטיקה', level: '5 יח״ל', startDate: day(6), time: 'ימי ג׳ 18:00', sessions: 8,
      mode: 'online', location: '', pricePerPerson: 70, maxSeats: 6, joinMode: 'approval',
      description: 'קבוצה קטנה של עד שישה תלמידים. כל מפגש נושא אחד: חדו״א, וקטורים, מרוכבים וגדילה ודעיכה, עם שיעורי בית ובדיקה.' },
    { id: 'g3', tutorId: 't3', title: 'פסיכומטרי כמותי, קבוצת ערב', subject: 'פסיכומטרי', level: 'פסיכומטרי', startDate: day(26), time: 'ימי ב׳ וד׳ 20:00', sessions: 12,
      mode: 'online', location: '', pricePerPerson: 60, maxSeats: 6,
      description: 'כל הנושאים בחשיבה כמותית, עם סימולציה מלאה כל שבועיים.' },
    { id: 'g4', tutorId: 't1', title: 'גאומטריה ווקטורים, כיתה י״א', subject: 'מתמטיקה', level: '4 יח״ל', startDate: day(3), time: 'ימי א׳ 17:30', sessions: 6,
      mode: 'frontal', location: 'רמת גן, ליד הבורסה', city: 'רמת גן', pricePerPerson: 80, maxSeats: 5,
      description: 'מפגשים פרונטליים בכיתה קטנה ברמת גן. מתאים לתלמידי י״א שרוצים לסגור פערים בגאומטריה לפני המגן.' },
    { id: 'g5', tutorId: 't5', title: 'מרתון אנגלית לבגרות 5 יח״ל', subject: 'אנגלית', level: '5 יח״ל', startDate: day(14), time: '10:00–14:00', sessions: 1,
      mode: 'frontal', location: 'כפר סבא, מתנ״ס בן גוריון', city: 'כפר סבא', pricePerPerson: 120, maxSeats: 10,
      description: 'Unseen, writing ו־literature בארבע שעות מרוכזות, עם בחינה לדוגמה ובדיקה אישית של החיבור.' },
    { id: 'g6', tutorId: 't4', title: 'חדו״א 1 לקראת מועד א׳', subject: 'מתמטיקה', level: 'אקדמיה', startDate: day(19), time: 'ימי ה׳ 19:00', sessions: 4,
      mode: 'online', location: '', pricePerPerson: 100, maxSeats: 15,
      description: 'גבולות, נגזרות, אינטגרלים וטורים. פותרים מבחנים קודמים של האוניברסיטאות.' },
  ];
  const seats = [];
  const fill = { g1: 5, g2: 4, g3: 5, g4: 3, g5: 2, g6: 7 };
  let k = 0;
  for (const [gid, n] of Object.entries(fill)) {
    for (let i = 0; i < n; i++) seats.push({ id: `s${++k}`, groupId: gid, userId: `seed-s${k}`, name: NAMES[(k * 7) % NAMES.length], phone: `050-00002${String(k).padStart(2, '0')}`, note: '', createdAt: new Date().toISOString() });
  }
  // Dana's 582 group is "by approval": two students are waiting for her answer.
  seats.push({ id: 'sp1', groupId: 'g2', userId: 'seed-p1', name: 'גיא אלון', phone: '050-0000301', note: 'כיתה י״ב, נבחן בקיץ', status: 'pending', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() });
  seats.push({ id: 'sp2', groupId: 'g2', userId: 'seed-p2', name: 'ליה כרמי', phone: '050-0000302', note: '', status: 'pending', createdAt: new Date(Date.now() - 26 * 3600000).toISOString() });
  const messages = [
    { id: 'm1', groupId: 'g1', userId: 'seed-m1', userName: 'תמר', isTutor: false, text: 'אם אני לא יכולה להגיע לכל היום, תהיה הקלטה?', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'm2', groupId: 'g1', userId: null, userName: 'מיכאל רוזן', isTutor: true, text: 'כן, כל מי שנרשם מקבל את ההקלטה המלאה ודף הטיפים במייל.', createdAt: new Date(Date.now() - 1.8 * 86400000).toISOString() },
    { id: 'm3', groupId: 'g2', userId: 'seed-m3', userName: 'איתי', isTutor: false, text: 'אפשר להצטרף מהמפגש השני?', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ];
  return { groups: groups.map((g) => ({ city: '', createdAt: '2026-10-20T10:00:00Z', ...g })), seats, messages };
}

export function buildSeedInquiries() {
  const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
  return [
    { id: 'q1', tutorId: 't1', userId: 'seed-q1', name: 'אורי שגב', phone: '050-0000401', email: '', contactVia: ['site', 'phone'], subject: 'מתמטיקה', level: '5 יח״ל', mode: 'frontal',
      message: 'היי דנה, אני בכיתה י״א ונבחן ב־581 בעוד חודשיים. קשה לי בעיקר עם חדו״א. יש לך זמן פנוי בימי שני?', status: 'new', reply: '', createdAt: ago(3), repliedAt: null },
    { id: 'q2', tutorId: 't1', userId: 'seed-q2', name: 'מירב (אמא של נועם)', phone: '', email: '', contactVia: ['site'], subject: 'מתמטיקה', level: '4 יח״ל', mode: 'online',
      message: 'שלום, הבן שלי צריך חיזוק בגאומטריה לפני המגן. אפשר שיעור ניסיון אונליין?', status: 'new', reply: '', createdAt: ago(20), repliedAt: null },
    { id: 'q3', tutorId: 't1', userId: 'seed-q3', name: 'יעל דוד', phone: '050-0000403', email: 'yael@example.com', contactVia: ['phone', 'email'], subject: 'סטטיסטיקה', level: 'אקדמיה', mode: 'online',
      message: 'סטודנטית שנה א׳ בפסיכולוגיה, צריכה עזרה בסטטיסטיקה לקראת המבחן.', status: 'replied',
      reply: 'היי יעל, בשמחה. אני פנויה ביום רביעי ב־19:00, אשלח לך הודעה בוואטסאפ לתיאום.', createdAt: ago(60), repliedAt: ago(50) },
  ];
}
