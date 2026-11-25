# מיילים מהאתר: איך זה עובד ומה עושים כשקונים דומיין

## המצב היום (חינם, בלי דומיין)
- **מיילי התראות** (פנייה חדשה, הודעה בצ׳אט, הודעה בקבוצה, פנייה בלי חשבון) נשלחים מ־`nafalaasimon@gmail.com`
  דרך Gmail SMTP, מהקובץ `supabase/functions/_shared/mail.ts`. המגבלה של Gmail: כ־500 נמענים ביום.
- **מיילי התחברות** (אישור הרשמה, איפוס סיסמה) נשלחים מ־Supabase Auth דרך אותו Gmail (Custom SMTP).
  התבניות בעברית נמצאות ב־`supabase/email/`.
- כללי מסירה שכבר מיושמים בקוד: נמען אחד בכל מייל (בלי BCC), חלק טקסט לצד ה־HTML, כותרת `List-Unsubscribe`,
  ו־Reply-To לכתובת שמישהו קורא (או לכתובת של התלמיד כשביקש קשר במייל).
- מי שעונה "הסרה" למייל: להסיר אותו ידנית (אין עדיין כפתור הסרה באתר).

למה מיילים עדיין יכולים ליפול לספאם: חשבון Gmail חדש בלי היסטוריה, וקישורים לדומיין `github.io`.
מה עוזר כבר עכשיו: לבקש מהמורים הראשונים לסמן "לא ספאם" ולהוסיף את הכתובת לאנשי הקשר.

## השלב הבא: דומיין משלנו + Resend (בערך ₪92 לשנה, השאר חינם)
Resend בחינם: 3,000 מיילים בחודש, עד 100 ביום, דומיין אחד. מספיק להתחלה.

1. **לקנות את הדומיין** `naflaasimon.co.il` אצל רשם מוסמך של איגוד האינטרנט (למשל LiveDNS, Domain The Net, Box).
2. **להעביר את ה־DNS ל־Cloudflare (חינם):** נרשמים ב־cloudflare.com, Add site, ומעתיקים את שני ה־Nameservers
   שהם נותנים לאתר של הרשם.
3. **להירשם ל־Resend:** resend.com, Domains, Add Domain, ולכתוב `naflaasimon.co.il`, אזור `eu-west-1`.
4. **להעתיק את הרשומות ש־Resend מציג ל־Cloudflare** (DNS, Add record), כל אחת בדיוק כמו שמופיעה:
   - `MX` על `send` (ל־SPF של כתובת ההחזרה)
   - `TXT` על `send` עם `v=spf1 include:amazonses.com ~all`
   - `TXT` על `resend._domainkey` (מפתח DKIM ארוך)
   - ולהוסיף בעצמנו DMARC: `TXT` על `_dmarc` עם הערך
     `v=DMARC1; p=none; rua=mailto:nafalaasimon@gmail.com`
   ב־Cloudflare לכבות את הענן הכתום (DNS only) ברשומות האלה. אחרי כמה דקות לוחצים Verify ב־Resend.
5. **ליצור API Key** ב־Resend (Sending access בלבד).
6. **לשלוח לClaude** (או להוסיף בעצמך ב־Supabase, Edge Functions, Secrets):
   - `RESEND_API_KEY` = המפתח
   - `MAIL_FROM` = `נפל האסימון <hello@naflaasimon.co.il>`
   - `MAIL_REPLY_TO` = `nafalaasimon@gmail.com`
   מהרגע שהמפתח קיים, הקוד שולח דרך Resend אוטומטית.
7. **מיילי התחברות דרך Resend:** ב־Supabase, Authentication, SMTP Settings:
   Host `smtp.resend.com`, Port `465`, Username `resend`, Password = ה־API Key,
   Sender `hello@naflaasimon.co.il`.
8. אחרי שבועיים בלי בעיות אפשר להקשיח את DMARC ל־`p=quarantine`.
9. אופציונלי: לחבר את הדומיין גם לאתר עצמו (GitHub Pages, Custom domain) ולעדכן `SITE_URL` ואת כתובות ההפניה ב־Supabase Auth.
