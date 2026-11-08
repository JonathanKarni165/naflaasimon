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
  T({ id: 't15', name: 'אביטל כהן', headline: 'דוקטורנטית למתמטיקה בטכניון', city: 'חיפה', area: 'נווה שאנן',
    subjects: ['מתמטיקה'], levels: ['אקדמיה'], priceFrontal: 190, priceOnline: 170, experienceYears: 7, phone: '050-0000115', contactCount: 140,
    about: 'מלמדת קורסי מתמטיקה של שנה א׳ ו־ב׳ בטכניון ובאוניברסיטת חיפה. פותרת איתכם מבחנים קודמים של הקורס שלכם, עם דגש על הוכחות.' }),
  T({ id: 't16', name: 'יוסי בן דוד', headline: 'מורה ותיק למתמטיקה, מתמחה ב־3 ו־4 יח״ל', city: 'באר שבע', area: 'רמות',
    subjects: ['מתמטיקה'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל'], priceFrontal: 110, priceOnline: 100, experienceYears: 25, phone: '050-0000116', contactCount: 260,
    about: 'עשרים וחמש שנים בכיתה. מתמחה בתלמידים שחוששים ממתמטיקה ובונה איתם ביטחון צעד אחר צעד עד הבגרות.' }),
  T({ id: 't17', name: 'שירה מלכה', headline: 'מתכנתת ומורה למדעי המחשב', city: 'תל אביב', area: 'פלורנטין', teachesFrontal: false,
    subjects: ['מדעי המחשב'], levels: ['5 יח״ל', 'אקדמיה'], priceOnline: 170, experienceYears: 5, phone: '050-0000117', contactCount: 95,
    about: 'מפתחת תוכנה בהייטק ומלמדת בערבים. Java ו־Python לבגרות, ומבוא ומבני נתונים לסטודנטים. כל שיעור כולל קוד אמיתי שכותבים יחד.' }),
  T({ id: 't18', name: 'אחמד חורי', headline: 'מורה לערבית ולאנגלית', city: 'נצרת',
    subjects: ['ערבית', 'אנגלית'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 100, priceOnline: 90, experienceYears: 11, phone: '050-0000118', contactCount: 77,
    about: 'מלמד ערבית לבגרות ושיחה בערבית מדוברת למבוגרים, וגם אנגלית לחטיבה ולתיכון. סבלני, מסודר ועם הרבה חומרי תרגול.' }),
  T({ id: 't19', name: 'מאיה גולן', headline: 'סטודנטית לרפואה, מלמדת ביולוגיה וכימיה', city: 'ירושלים', area: 'קריית יובל',
    subjects: ['ביולוגיה', 'כימיה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 140, priceOnline: 130, experienceYears: 4, phone: '050-0000119', contactCount: 66,
    about: 'ביולוגיה וכימיה 5 יח״ל, כולל הכנה לעבודת המעבדה. לסטודנטים: ביוכימיה וביולוגיה של התא.' }),
  T({ id: 't20', name: 'דוד אשכנזי', headline: 'מהנדס חשמל, מלמד קורסי הנדסה', city: 'פתח תקווה', area: 'כפר גנים',
    subjects: ['הנדסת חשמל', 'פיזיקה', 'מתמטיקה'], levels: ['אקדמיה'], priceFrontal: 220, priceOnline: 200, experienceYears: 12, phone: '050-0000120', contactCount: 58,
    about: 'מהנדס חשמל עם תואר שני. מלמד מעגלים, אותות ומערכות ופיזיקה 2, עם פתרון מבחנים מהטכניון, תל אביב ובר אילן.' }),
  T({ id: 't21', name: 'ענבל שטרן', headline: 'מורה לאנגלית, הכנה לבגרות ולאמיר״ם', city: 'רעננה',
    subjects: ['אנגלית'], levels: ['4 יח״ל', '5 יח״ל', 'אקדמיה'], priceFrontal: 160, priceOnline: 150, experienceYears: 14, phone: '050-0000121', contactCount: 190,
    about: 'דוברת אנגלית כשפת אם. בגרות 5 יח״ל, אמיר״ם ופטור באנגלית, וגם שיחה למבוגרים שרוצים להרגיש בטוחים.' }),
  T({ id: 't22', name: 'אלון ברק', headline: 'מורה לפסיכומטרי, 760 בבחינה', city: 'רחובות', area: 'מרכז העיר',
    subjects: ['פסיכומטרי', 'מתמטיקה'], levels: ['פסיכומטרי'], priceFrontal: 170, priceOnline: 150, experienceYears: 6, phone: '050-0000122', contactCount: 110,
    about: 'הוצאתי 760 ומאז מלמד פסיכומטרי באופן פרטי ובקבוצות קטנות. בונה תוכנית אישית לפי סימולציה ראשונה.' }),
  T({ id: 't23', name: 'רינת אברהם', headline: 'מורה לסטטיסטיקה לסטודנטים', city: 'רמת השרון', teachesFrontal: false,
    subjects: ['סטטיסטיקה', 'פסיכולוגיה'], levels: ['אקדמיה'], priceOnline: 150, experienceYears: 9, phone: '050-0000123', contactCount: 130,
    about: 'סטטיסטיקה ושיטות מחקר לסטודנטים למדעי החברה ולפסיכולוגיה. עוזרת גם בניתוח נתונים לעבודות סמינריוניות ב־SPSS.' }),
  T({ id: 't24', name: 'עומר דהן', headline: 'סטודנט לכלכלה, בוגר 5 יח״ל מתמטיקה', city: 'ראשון לציון', area: 'נחלת יהודה',
    subjects: ['כלכלה', 'מתמטיקה'], levels: ['4 יח״ל', '5 יח״ל', 'אקדמיה'], priceFrontal: 120, priceOnline: 110, experienceYears: 3, phone: '050-0000124', contactCount: 45,
    about: 'כלכלה לבגרות ומבוא למיקרו ולמאקרו לסטודנטים, וגם מתמטיקה 4 ו־5 יח״ל.' }),
  T({ id: 't25', name: 'הדס פרץ', headline: 'מורה בבית ספר יסודי, מלמדת חשבון ואנגלית', city: 'מודיעין',
    subjects: ['מתמטיקה', 'אנגלית'], levels: ['יסודי', 'חטיבת ביניים'], priceFrontal: 100, priceOnline: 90, experienceYears: 15, phone: '050-0000125', contactCount: 120,
    about: 'מלמדת ילדים בכיתות א׳ עד ח׳. חשבון, שברים ואחוזים, ואנגלית מההתחלה, בדרך משחקית ורגועה.' }),
  T({ id: 't26', name: 'ניר וולף', headline: 'פיזיקאי, מלמד פיזיקה לבגרות ולאוניברסיטה', city: 'רחובות', area: 'ליד מכון ויצמן',
    subjects: ['פיזיקה', 'מתמטיקה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 180, priceOnline: 160, experienceYears: 16, phone: '050-0000126', contactCount: 88,
    about: 'חוקר במכון ויצמן. פיזיקה 5 יח״ל, פיזיקה 1 ו־2 ומכניקה קלאסית. מסביר מהאינטואיציה אל הנוסחה.' }),
  T({ id: 't27', name: 'תהילה יוסף', headline: 'מורה ללשון ולתנ״ך', city: 'בית שמש',
    subjects: ['לשון', 'תנ״ך'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 100, priceOnline: 90, experienceYears: 8, phone: '050-0000127', contactCount: 40,
    about: 'לשון ותנ״ך לבגרות, עם סיכומים ממוקדים ומבחנים לדוגמה. מתאימה גם לתלמידים עם לקויות למידה.' }),
  T({ id: 't28', name: 'גיל רפאלי', headline: 'מתכנת, מלמד אלגוריתמים ומבני נתונים', city: 'הרצליה', area: 'הרצליה פיתוח',
    subjects: ['מדעי המחשב', 'מתמטיקה'], levels: ['אקדמיה'], priceFrontal: 200, priceOnline: 180, experienceYears: 10, phone: '050-0000128', contactCount: 72,
    about: 'מהנדס תוכנה בכיר. מבני נתונים, אלגוריתמים ומתמטיקה בדידה לסטודנטים, וגם הכנה לראיונות עבודה.' }),
  T({ id: 't29', name: 'סיגל נחום', headline: 'רואת חשבון, מלמדת חשבונאות', city: 'גבעתיים', teachesFrontal: false,
    subjects: ['חשבונאות', 'כלכלה'], levels: ['אקדמיה'], priceOnline: 160, experienceYears: 13, phone: '050-0000129', contactCount: 50,
    about: 'רואת חשבון שמלמדת חשבונאות פיננסית, הנהלת חשבונות ומיסים, כולל הכנה לבחינות מועצת רואי החשבון.' }),
  T({ id: 't30', name: 'בן שמעוני', headline: 'סטודנט להנדסת מכונות', city: 'באר שבע', area: 'ליד האוניברסיטה',
    subjects: ['הנדסת מכונות', 'פיזיקה', 'מתמטיקה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 130, priceOnline: 120, experienceYears: 3, phone: '050-0000130', contactCount: 25,
    about: 'סטטיקה, דינמיקה וחוזק חומרים לסטודנטים בבן גוריון, וגם פיזיקה ומתמטיקה לתיכון.' }),
  T({ id: 't31', name: 'קרן אוחיון', headline: 'מורה למתמטיקה בחטיבת ביניים', city: 'אשדוד', area: 'רובע ג׳',
    subjects: ['מתמטיקה'], levels: ['יסודי', 'חטיבת ביניים', '3 יח״ל'], priceFrontal: 90, priceOnline: 80, experienceYears: 9, phone: '050-0000131', contactCount: 85,
    about: 'מתמטיקה לכיתות ו׳ עד ט׳ ו־3 יח״ל. סוגרת פערים מהר ומלמדת שיטות עבודה שנשארות.' }),
  T({ id: 't32', name: 'יאיר לנדאו', headline: 'מורה להיסטוריה ולאזרחות', city: 'ירושלים', area: 'רחביה',
    subjects: ['היסטוריה', 'אזרחות'], levels: ['3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 20, phone: '050-0000132', contactCount: 60,
    about: 'היסטוריה ואזרחות לבגרות, כולל עבודות חקר. מלמד לכתוב תשובה מלאה שמקבלת את כל הנקודות.' }),
  T({ id: 't33', name: 'נטע ספיר', headline: 'מורה לכימיה, 5 יח״ל ואקדמיה', city: 'כפר סבא',
    subjects: ['כימיה'], levels: ['5 יח״ל', 'אקדמיה'], priceFrontal: 150, priceOnline: 140, experienceYears: 7, phone: '050-0000133', contactCount: 70,
    about: 'כימיה לבגרות וכימיה כללית ואורגנית לסטודנטים. הכל עם מודלים, ציורים ותרגול רב.' }),
  T({ id: 't34', name: 'אריאל מזרחי', headline: 'מורה למתמטיקה לבגרות', city: 'נתניה', area: 'עיר ימים',
    subjects: ['מתמטיקה', 'פיזיקה'], levels: ['4 יח״ל', '5 יח״ל'], priceFrontal: 140, priceOnline: 130, experienceYears: 8, phone: '050-0000134', contactCount: 115,
    about: 'מתמטיקה 4 ו־5 יח״ל ופיזיקה מכניקה. שיעורים ממוקדים בשאלות בגרות, עם תוכנית חזרה לפני כל מועד.' }),
  T({ id: 't35', name: 'לינוי עזרא', headline: 'מורה לספרות ולשון', city: 'אשקלון',
    subjects: ['ספרות', 'לשון'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 100, priceOnline: 90, experienceYears: 6, phone: '050-0000135', contactCount: 33,
    about: 'ספרות ולשון לבגרות, עם דגש על כתיבה ועל ניתוח שירים. מתאימה גם להכנה לבחינה בעל פה.' }),
  T({ id: 't36', name: 'עידן קורן', headline: 'סטודנט לתואר שני במדעי המחשב', city: 'רמת גן', area: 'ליד אוניברסיטת בר אילן', teachesFrontal: false,
    subjects: ['מדעי המחשב', 'מתמטיקה'], levels: ['אקדמיה'], priceOnline: 140, experienceYears: 4, phone: '050-0000136', contactCount: 48,
    about: 'מבוא למדעי המחשב, תכנות בשפת C, אוטומטים וחישוביות ולמידת מכונה. עוזר גם בפרויקטים.' }),
  T({ id: 't37', name: 'אורית חדד', headline: 'מורה לביולוגיה, בודקת בגרויות', city: 'קריית ביאליק',
    subjects: ['ביולוגיה'], levels: ['חטיבת ביניים', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 18, phone: '050-0000137', contactCount: 90,
    about: 'בודקת בגרויות בביולוגיה, ולכן יודעת בדיוק מה הבודקים מחפשים. כולל ליווי בעבודת החקר.' }),
  T({ id: 't38', name: 'משה טל', headline: 'מורה למתמטיקה ופיזיקה, יקנעם והעמקים', city: 'יקנעם',
    subjects: ['מתמטיקה', 'פיזיקה'], levels: ['חטיבת ביניים', '3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 14, phone: '050-0000138', contactCount: 55,
    about: 'מגיע לבית התלמיד ביקנעם, עפולה והסביבה. מתמטיקה מחטיבה ועד 5 יח״ל, ופיזיקה לבגרות.' }),
  T({ id: 't39', name: 'אילנה גרוס', headline: 'מורה לצרפתית ולספרדית', city: 'תל אביב', area: 'הצפון הישן',
    subjects: ['צרפתית', 'ספרדית'], levels: ['חטיבת ביניים', '3 יח״ל', '5 יח״ל'], priceFrontal: 150, priceOnline: 130, experienceYears: 19, phone: '050-0000139', contactCount: 42,
    about: 'צרפתית וספרדית לבגרות ולמבוגרים. שיחה מהשיעור הראשון, ודקדוק שנבנה בהדרגה.' }),
  T({ id: 't40', name: 'עמית שלום', headline: 'סטודנט למשפטים, מלמד דיני חוזים ונזיקין', city: 'ירושלים', area: 'הר הצופים', teachesFrontal: false,
    subjects: ['משפטים'], levels: ['אקדמיה'], priceOnline: 150, experienceYears: 2, phone: '050-0000140', contactCount: 20,
    about: 'סטודנט שנה ד׳ במשפטים. עוזר בקורסי שנה א׳: דיני חוזים, דיני נזיקין ומשפט חוקתי, כולל כתיבת תשובות למבחן.' }),
  T({ id: 't41', name: 'שני ביטון', headline: 'מורה לגאוגרפיה ולמחשבת ישראל', city: 'טבריה',
    subjects: ['גאוגרפיה', 'מחשבת ישראל'], levels: ['3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 100, priceOnline: 90, experienceYears: 10, phone: '050-0000141', contactCount: 18,
    about: 'גאוגרפיה ומחשבת ישראל לבגרות, עם סיכומים קצרים ומפות שקל לזכור.' }),
  T({ id: 't42', name: 'רועי פישר', headline: 'מורה למתמטיקה, אילת והערבה', city: 'אילת',
    subjects: ['מתמטיקה', 'מדעי המחשב'], levels: ['3 יח״ל', '4 יח״ל', '5 יח״ל'], priceFrontal: 120, priceOnline: 110, experienceYears: 6, phone: '050-0000142', contactCount: 30,
    about: 'מתמטיקה לבגרות ומדעי המחשב בשפת Java. שיעורים בבית התלמיד באילת או אונליין.' }),
];
// Topics the example tutors ticked in their profile (they come first when a student searches that topic).
const SEED_TOPICS = {
  t1: ['חדו״א', 'הסתברות', 'שאלון 581', 'שאלון 582', 'חדו״א 1', 'מבוא לסטטיסטיקה', 'סטטיסטיקה תיאורית'],
  t2: ['גאומטריה', 'טריגונומטריה', 'חדו״א', 'שאלון 471', 'שאלון 472', 'מכניקה'],
  t3: ['אלגברה', 'שאלון 371', 'חשמל ומגנטיות', 'חשיבה כמותית', 'מבחן מימד'],
  t4: ['Python', 'מבני נתונים', 'מבוא למדעי המחשב', 'אלגוריתמים', 'אלגברה לינארית 1', 'מתמטיקה בדידה'],
  t5: ['הבנת הנקרא (Unseen)', 'כתיבה', 'אוצר מילים ודקדוק', 'תחביר'],
  t6: ['כימיה אורגנית', 'חומצות ובסיסים', 'אלגברה', 'מכניקה'],
  t7: ['אלגברה', 'גאומטריה', 'שאלון 371'],
  t8: ['חשבון', 'שברים ואחוזים', 'אוצר מילים ודקדוק'],
  t9: ['מכניקה', 'חשמל ומגנטיות', 'פיזיקה 1', 'פיזיקה 2', 'חדו״א 2', 'משוואות דיפרנציאליות'],
  t10: ['חשיבה כמותית', 'חשיבה מילולית', 'אנגלית', 'כתיבת חיבור'],
  t11: ['התא', 'גנטיקה', 'מבנה וקישור'],
  t12: ['וקטורים', 'מספרים מרוכבים', 'שאלון 581', 'Java', 'יסודות התכנות'],
  t13: ['תחביר', 'שירה', 'סיפור קצר', 'לאומיות וציונות'],
  t14: ['חדו״א', 'וקטורים', 'שאלון 581', 'מכניקה'],
  t15: ['חדו״א 1', 'חדו״א 2', 'אינפי 1', 'אלגברה לינארית 1', 'אלגברה לינארית 2', 'אלגברה מופשטת', 'פונקציות מרוכבות'],
  t16: ['אלגברה', 'גאומטריה', 'הסתברות', 'שאלון 371', 'שאלון 372', 'שאלון 471'],
  t17: ['Java', 'Python', 'מבוא למדעי המחשב', 'מבני נתונים', 'תכנות מונחה עצמים'],
  t18: ['דקדוק', 'שיחה (ערבית מדוברת)', 'הבנת הנקרא', 'אוצר מילים ודקדוק', 'הבנת הנקרא (Unseen)'],
  t19: ['התא', 'גוף האדם', 'גנטיקה', 'ביולוגיה של התא', 'סטויכיומטריה', 'ביוכימיה'],
  t20: ['מעגלים חשמליים', 'אותות ומערכות', 'מערכות ספרתיות', 'פיזיקה 2', 'אלקטרומגנטיות', 'משוואות דיפרנציאליות'],
  t21: ['הבנת הנקרא (Unseen)', 'כתיבה', 'שיחה (Oral)', 'אמיר״ם', 'פטור באנגלית', 'TOEFL'],
  t22: ['חשיבה כמותית', 'חשיבה מילולית', 'כתיבת חיבור', 'מבחן מימד'],
  t23: ['סטטיסטיקה תיאורית', 'בדיקת השערות', 'רגרסיה', 'SPSS', 'סטטיסטיקה 1', 'שיטות מחקר', 'שיטות מחקר בפסיכולוגיה'],
  t24: ['מיקרו כלכלה', 'מאקרו כלכלה', 'מתמטיקה לכלכלנים', 'חדו״א'],
  t25: ['חשבון', 'שברים ואחוזים', 'אלגברה', 'אוצר מילים ודקדוק'],
  t26: ['מכניקה', 'חשמל ומגנטיות', 'קרינה וחומר', 'פיזיקה 1', 'פיזיקה 2', 'מכניקה קלאסית', 'חדו״א 1'],
  t27: ['תחביר', 'מורפולוגיה', 'הבנת הנקרא', 'תורה', 'נביאים'],
  t28: ['מבני נתונים', 'אלגוריתמים', 'מתמטיקה בדידה', 'תורת הגרפים', 'קומבינטוריקה'],
  t29: ['חשבונאות פיננסית', 'הנהלת חשבונות', 'מיסים', 'בחינות רואי חשבון', 'דוחות כספיים'],
  t30: ['סטטיקה', 'דינמיקה', 'חוזק חומרים', 'מכניקה', 'חדו״א'],
  t31: ['חשבון', 'שברים ואחוזים', 'אלגברה', 'גאומטריה', 'שאלון 371'],
  t32: ['לאומיות וציונות', 'השואה', 'הקמת המדינה', 'עקרונות הדמוקרטיה', 'מוסדות השלטון'],
  t33: ['מבנה וקישור', 'סטויכיומטריה', 'חמצון חיזור', 'כימיה כללית', 'כימיה אורגנית'],
  t34: ['טריגונומטריה', 'חדו״א', 'וקטורים', 'שאלון 471', 'שאלון 581', 'מכניקה'],
  t35: ['שירה', 'סיפור קצר', 'רומן', 'כתיבה', 'תחביר'],
  t36: ['מבוא למדעי המחשב', 'תכנות בשפת C', 'אוטומטים וחישוביות', 'למידת מכונה', 'לוגיקה'],
  t37: ['התא', 'גוף האדם', 'אקולוגיה', 'גנטיקה', 'מעבדה'],
  t38: ['אלגברה', 'גאומטריה', 'חדו״א', 'שאלון 471', 'מכניקה', 'חשמל ומגנטיות'],
  t39: ['דקדוק', 'שיחה', 'הבנת הנקרא'],
  t40: ['דיני חוזים', 'דיני נזיקין', 'משפט חוקתי'],
  t41: ['גאוגרפיה פיזית', 'ארץ ישראל', 'פילוסופיה יהודית'],
  t42: ['אלגברה', 'חדו״א', 'שאלון 371', 'שאלון 471', 'Java', 'יסודות התכנות'],
};
SEED_TUTORS.forEach((t) => { if (SEED_TOPICS[t.id]) t.topics = SEED_TOPICS[t.id]; });
// Weekly free hours ("day-hour", day 0 = Sunday, hour = start of a 2-hour slot), varied per tutor.
SEED_TUTORS.forEach((t, i) => {
  const days = [[0, 1, 3], [1, 2, 4], [0, 2, 3], [0, 3, 4], [1, 3, 5]][i % 5];
  const hours = [[16, 18], [14, 16, 18], [18, 20], [10, 12, 16], [16, 18, 20]][(i * 3) % 5];
  t.availability = days.flatMap((d) => hours.filter((h) => !(d === 5 && h > 12)).map((h) => `${d}-${h}`)).concat(i % 2 ? ['5-10'] : []);
});


// [tutorId, review count, rough average]
const REVIEW_PLAN = [
  ['t1', 38, 4.9], ['t2', 61, 4.85], ['t3', 22, 4.8], ['t4', 15, 4.7], ['t5', 27, 4.75], ['t6', 9, 4.6],
  ['t7', 1, 5], ['t8', 18, 4.6], ['t9', 6, 4.9], ['t10', 34, 4.7], ['t11', 3, 4.3], ['t12', 7, 4.5], ['t13', 11, 4.4], ['t14', 2, 5],
  ['t15', 19, 4.85], ['t16', 44, 4.7], ['t17', 12, 4.8], ['t18', 9, 4.6], ['t19', 8, 4.75], ['t20', 6, 4.7], ['t21', 25, 4.8],
  ['t22', 14, 4.65], ['t23', 17, 4.8], ['t24', 4, 4.5], ['t25', 21, 4.9], ['t26', 10, 4.85], ['t27', 5, 4.6], ['t28', 8, 4.7],
  ['t29', 7, 4.75], ['t30', 3, 4.6], ['t31', 13, 4.7], ['t32', 9, 4.55], ['t33', 8, 4.7], ['t34', 16, 4.75], ['t35', 4, 4.5],
  ['t36', 5, 4.8], ['t37', 12, 4.85], ['t38', 6, 4.6], ['t39', 5, 4.7], ['t40', 1, 5], ['t41', 2, 4.5], ['t42', 3, 4.7],
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
