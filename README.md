# נפל האסימון

אתר למציאת מורים פרטיים (בעיקר מתמטיקה). React + Vite, מסד נתונים וכניסה עם Google דרך Supabase, אחסון ב־Vercel. הכול בתוכניות החינמיות.

## הרצה מקומית
```
npm install
npm run dev
```
בלי קובץ `.env` האתר רץ במצב הדגמה: נתונים לדוגמה שנשמרים בדפדפן, וכניסה מדומה.

## חיבור לשרת אמיתי (פעם אחת)
1. **Supabase** (supabase.com, חינם): New project, אזור Frankfurt.
   SQL Editor → מדביקים את `supabase/schema.sql` → Run.
   אחר כך, באותו מקום, מדביקים גם את `supabase/moderation.sql` → Run (חסימת ספאם וקללות). את רשימת המילים עורכים ב-`src/lib/moderation.js` ומריצים `npm run moderation-sql`.
2. **Google sign-in**: ב־Google Cloud Console יוצרים OAuth Client (Web).
   Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
   ב־Supabase: Authentication → Providers → Google → מדביקים Client ID ו־Secret.
   Authentication → URL Configuration → Site URL = כתובת האתר ב־Vercel.
3. **Vercel** (vercel.com, חינם): Import את הריפו מ־GitHub. Environment Variables:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (מ־Supabase → Project Settings → API). Deploy.
4. נכנסים לאתר עם Google, ואז ב־SQL Editor:
   `update public.profiles set is_admin = true where email = 'your@gmail.com';`
   עכשיו בפאנל המורה יש לשונית "ניהול מורים" להוספת מורים.

## מה יש
- חיפוש לפי מקצוע, רמה, פרונטלי/אונליין, מחיר ומרחק. מיון: מומלצים (ממוצע בייסיאני, `src/lib/ranking.js`), הכי קרוב, הכי זול, הכי מבוקש.
- עמוד מורה עם ביקורות (אחת לכל חשבון), התפלגות כוכבים וציון משוקלל.
- טלפון של מורה נשלף מהשרת רק למשתמש מחובר (`reveal_phone`), וכל חשיפה נספרת כפנייה.
- פאנל מורה: פרופיל, קבוצות למידה ונרשמים, ההרשמות שלי, ולמנהל: ניהול כל המורים.
- קבוצות למידה: מטרה, תאריך, מחיר לתלמיד, מקומות. שמירת מקום בלי חריגה מהמכסה (`join_group`), ושאלות ותשובות עם המורה.

`npm run build` ואז `node scripts/artifact.mjs` בונה גרסת תצוגה בקובץ אחד.
