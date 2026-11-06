// Spam and profanity filter for user content (Hebrew + English).
// The same rules run in the database (supabase/moderation.sql, generated from this file by
// `npm run moderation-sql`), so the browser check is only for a fast, friendly message:
// the server blocks the same content even if someone bypasses the site.

// Matched as whole words. Hebrew words also match with prefixes: ו ה ש ב ל מ כ (e.g. "והזונה").
export const BLOCKED_WORDS = [
  // Hebrew profanity, insults and slurs
  'זונה', 'זונות', 'זונת', 'שרמוטה', 'שרמוטות', 'שרמוט', 'שרמוטים', 'זין', 'זיין', 'לזיין', 'זיונים', 'זיון',
  'מזדיין', 'מזדיינת', 'מזדיינים', 'תזדיין', 'תזדייני', 'תזדיינו', 'יזדיין', 'הזדיין', 'מזיין', 'מזיינת',
  'כוסית', 'כוסיות', 'כוסאומו', 'כוסמק',
  'מניאק', 'מניאקית', 'מניאקים', 'שמוק', 'שמוקה', 'שמוקים', 'חרא', 'חארה', 'מפגר', 'מפגרת', 'מפגרים',
  'קוקסינל', 'מתרומם', 'כושי', 'כושית', 'כושים', 'ערבוש', 'ערבושים', 'בנזונה', 'בתזונה',
  'פורנו', 'סקס', 'קזינו', 'הימורים', 'ויאגרה',
  // English profanity, insults and slurs
  'shit', 'shitty', 'bullshit', 'bitch', 'bitches', 'bastard', 'asshole', 'dick', 'dickhead', 'cock',
  'pussy', 'whore', 'slut', 'cunt', 'retard', 'retarded', 'wtf', 'stfu', 'fag', 'fuk', 'twat', 'wanker',
  'porn', 'sex', 'nude', 'nudes', 'viagra', 'cialis', 'casino', 'onlyfans', 'escort',
];

// Matched anywhere inside a word, or across two words written apart ("motherfucker", "כוס אמא").
export const BLOCKED_PARTS = [
  'fuck', 'nigger', 'nigga', 'faggot', 'motherf',
  'כוסאמא', 'כוסעמק', 'כוסאמק', 'כוסאמשך', 'שרמוט', 'תזדיינ',
];

// Real words that would otherwise match after removing a prefix ("להזין" = to enter data, "מזין" = nutritious).
export const ALLOWED_WORDS = ['הזין', 'להזין', 'מזין', 'תזין', 'יזין', 'נזין', 'אזין', 'שהזין', 'כשהזין'];

const HEB_PREFIX = 'ושהבלמכ';
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
const HIDDEN = /[֑-ׇ​-‏‪-‮⁦-⁩﻿­]/g;

// Lower case, drop niqqud and invisible characters, map final letters and l33t, collapse repeats.
export function normalize(text) {
  return String(text || '').toLowerCase().replace(HIDDEN, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/(.)\1+/g, '$1');
}

// Words of the text, with runs of single letters joined ("f u c k" -> "fuck").
export function tokens(text) {
  const raw = normalize(text).split(/[^a-zא-ת]+/).filter(Boolean);
  const out = [];
  let run = '';
  for (const t of raw) {
    if (t.length === 1) { run += t; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(t);
  }
  if (run) out.push(run);
  return out;
}

function candidates(tok) {
  const list = [tok];
  for (let i = 1; i <= 3 && i < tok.length - 1 && HEB_PREFIX.includes(tok[i - 1]); i++) list.push(tok.slice(i));
  return list;
}

const WORDS = new Set(BLOCKED_WORDS.map(normalize));
const PARTS = BLOCKED_PARTS.map(normalize);
const ALLOWED = new Set(ALLOWED_WORDS.map(normalize));

export function hasProfanity(text) {
  const toks = tokens(text);
  if (toks.some((t) => !ALLOWED.has(t) && candidates(t).some((c) => WORDS.has(c)))) return true;
  return toks.some((t, i) => {
    const pair = t + (toks[i + 1] || '');
    return PARTS.some((p) => pair.includes(p));
  });
}

const LINK = /(https?:\/\/|www\.|\bt\.me\/|\bwa\.me\/|\bbit\.ly\b|[a-z0-9-]+\.(com|net|org|info|biz|io|co|il|ru|xyz|me|ly|link|site|online|app|shop|top|click)\b|[^\s@]+@[^\s@]+\.[a-z]{2,})/i;
export const hasLink = (text) => LINK.test(String(text || '').replace(HIDDEN, ''));

// Israeli phone numbers, also written with spaces, dashes or dots between the digits.
const PHONE = /(\+?972|0)5\d{8}|(\+?972|0)[2-9]\d{7}/;
export const hasPhone = (text) => PHONE.test(String(text || '').replace(/[\s\-.()]/g, ''));

// The same character 10 times in a row ("!!!!!!!!!!", "ההההההההההה").
export const hasFlood = (text) => /(.)\1{9,}/s.test(String(text || ''));

export const MESSAGES = {
  profanity: 'הטקסט כולל מילים פוגעניות. נסחו אותו מחדש בבקשה',
  link: 'אי אפשר לשלוח קישורים או כתובות מייל',
  phone: 'אי אפשר לפרסם מספר טלפון כאן. הפרטים נשלחים דרך האתר',
  flood: 'נראה כמו ספאם. נסו לכתוב בלי תווים חוזרים',
  duplicate: 'כבר שלחתם את ההודעה הזאת',
};

// Returns the reason the text is blocked, or null. phone=false allows phone numbers.
export function checkText(text, { phone = true, link = true } = {}) {
  if (!text) return null;
  if (hasProfanity(text)) return 'profanity';
  if (link && hasLink(text)) return 'link';
  if (phone && hasPhone(text)) return 'phone';
  if (hasFlood(text)) return 'flood';
  return null;
}

// Throws a Hebrew error for the first blocked field. fields: [[text, options], ...]
export function assertClean(fields) {
  for (const [text, opts] of fields) {
    const why = checkText(text, opts);
    if (why) throw new Error(MESSAGES[why]);
  }
}

// What each write checks. Short fields like names and private notes to a tutor may contain a
// phone number, public text (reviews, profiles, group posts) may not: the site keeps phones hidden.
// Keep in sync with the trigger arguments at the bottom of scripts/build-moderation-sql.mjs.
const NAME = { phone: false };
const PRIVATE = { phone: false };
export const RULES = {
  addReview: (a) => [[a.text]],
  sendInquiry: (a) => [[a.name, NAME], [a.message, PRIVATE]],
  answerInquiry: (_id, a) => [[a?.reply, PRIVATE]],
  saveTutor: (a) => [[a.name, NAME], [a.headline], [a.about], [a.city, NAME], [a.area, NAME]],
  saveGroup: (a) => [[a.title], [a.description], [a.location, NAME], [a.time, NAME]],
  joinGroup: (_id, a) => [[a?.name, NAME], [a?.note, PRIVATE]],
  addGroupMessage: (_id, text) => [[text]],
};
