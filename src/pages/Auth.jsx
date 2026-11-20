import { useEffect, useState } from 'react';
import { useApp, go } from '../state.jsx';
import { Coin, GOOGLE_ICON, SpamNote, rememberReturn, BirthDateInput, InAppNote } from '../components/ui.jsx';
import { CITIES } from '../data/constants.js';
import { isEmail, isPhone, emailTypo, passwordProblem } from '../lib/format.js';

function leave() {
  let to = '';
  try { to = sessionStorage.getItem('naflaasimon-return') || ''; sessionStorage.removeItem('naflaasimon-return'); } catch { /* private mode */ }
  go(to);
}

export default function Auth({ mode }) {
  const { user, api, notify } = useApp();
  const signup = mode === 'signup';
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', birthDate: '', area: '' });
  const [err, setErr] = useState('');
  const [errs, setErrs] = useState({}); // per field, all shown at once
  const [info, setInfo] = useState(''); // lasting notice in the form (e.g. after "שכחתי סיסמה")
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const typo = emailTypo(f.email);
  const FieldErr = ({ k }) => (errs[k] ? <span className="err">{errs[k]}</span> : null);
  const resend = async () => {
    setResent('');
    try { await api.auth.resendConfirm(f.email.trim()); setResent('שלחנו שוב. בדקו את המייל (גם בספאם).'); } catch (x) { setResent(x.message); }
  };

  useEffect(() => { if (user) leave(); }, [user]);
  useEffect(() => { window.scrollTo(0, 0); setErr(''); setErrs({}); setInfo(''); setUnconfirmed(false); setSent(false); }, [mode]);

  const google = async () => { rememberReturn(); try { await api.auth.signInWithGoogle(); } catch (e) { setErr(e.message); } };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setUnconfirmed(false);
    const x = {};
    if (signup) {
      const n = f.name.trim();
      if (!n) x.name = 'כתבו שם';
      else if (n.length < 2 || n.length > 60) x.name = 'השם צריך להיות בין 2 ל־60 תווים';
    }
    if (!isEmail(f.email.trim())) x.email = 'כתבו כתובת מייל תקינה, למשל \u2066name@gmail.com\u2069';
    if (signup && passwordProblem(f.password)) x.password = passwordProblem(f.password);
    if (!signup && !f.password) x.password = 'כתבו סיסמה';
    if (signup && f.phone.trim() && !isPhone(f.phone)) x.phone = 'בדקו את מספר הטלפון, למשל \u2066050-1234567\u2069';
    setErrs(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      if (signup) {
        const r = await api.auth.signUpEmail({ email: f.email.trim(), password: f.password, name: f.name.trim(), phone: f.phone.trim(), birthDate: f.birthDate, area: f.area.trim() });
        if (r.needsConfirm) setSent(true);
      } else {
        await api.auth.signInEmail({ email: f.email.trim(), password: f.password });
      }
    } catch (x) { setErr(x.message); if (x.code === 'not_confirmed') setUnconfirmed(true); }
    setBusy(false);
  };

  const forgot = async () => {
    setErr(''); setInfo('');
    if (!isEmail(f.email.trim())) { setErrs({ email: 'כתבו קודם את המייל שלכם כאן, ואז לחצו שוב על "שכחתי סיסמה"' }); return; }
    setErrs({});
    try { await api.auth.resetPassword(f.email.trim()); setInfo(`אם יש חשבון עם המייל ${'\u2066'}${f.email.trim()}${'\u2069'}, שלחנו אליו קישור לבחירת סיסמה חדשה. בדקו גם בספאם.`); } catch (x) { setErr(x.message); }
  };

  if (sent) {
    return (
      <main className="auth-page"><div className="auth-card">
        <Coin size={52} />
        <h1>בדקו את המייל</h1>
        <p className="muted-text">שלחנו קישור אישור אל <bdi>{f.email}</bdi>. לחצו עליו כדי להשלים את פתיחת החשבון. אם לא הגיע תוך דקה, בדקו בתיקיית הספאם.</p>
        <p className="hint">כבר יש לכם חשבון עם המייל הזה? אז לא יישלח מייל חדש. <button type="button" className="link-btn" onClick={() => go('login')}>היכנסו</button>, או לחצו שם על "שכחתי סיסמה".</p>
        <button type="button" className="btn btn-ghost" onClick={resend}>לא הגיע? שליחה חוזרת של מייל האימות</button>
        {resent ? <p className="hint" role="status">{resent}</p> : null}
        <SpamNote />
        <button type="button" className="btn btn-line" onClick={() => go('login')}>לדף הכניסה</button>
      </div></main>
    );
  }

  return (
    <main className="auth-page"><div className="auth-card">
      <Coin size={52} />
      <h1>{signup ? 'פתיחת חשבון' : 'כניסה לחשבון'}</h1>
      <p className="muted-text">{signup ? 'חשבון מאפשר צ׳אט עם מורים, הצטרפות לקבוצות וקבלת עדכונים במייל. בחינם.' : 'ברוכים השבים.'}</p>
      <InAppNote />
      <button type="button" className="btn btn-google" onClick={google}>{GOOGLE_ICON} המשך עם Google</button>
      <div className="login-or"><span>או עם מייל</span></div>
      <form className="auth-form" onSubmit={submit} noValidate>
        {signup ? (<>
          <label className="field-label" htmlFor="a-name">שם מלא</label>
          <input id="a-name" className="input" autoComplete="name" maxLength={60} value={f.name} onChange={set('name')} aria-invalid={!!errs.name} /><FieldErr k="name" />
        </>) : null}
        <label className="field-label" htmlFor="a-email">מייל</label>
        <input id="a-email" className="input" type="email" dir="ltr" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={!!errs.email} /><FieldErr k="email" />
        {typo ? <p className="hint">התכוונתם ל־<button type="button" className="link-btn" onClick={() => setF({ ...f, email: typo })}><bdi dir="ltr">{typo}</bdi></button>?</p> : null}
        <label className="field-label" htmlFor="a-pass">סיסמה{signup ? ' (לפחות 8 תווים, עם אות באנגלית ומספר)' : ''}</label>
        <input id="a-pass" className="input" type="password" dir="ltr" autoComplete={signup ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} aria-invalid={!!errs.password} /><FieldErr k="password" />
        {signup ? (<>
          <label className="field-label" htmlFor="a-phone">טלפון (לא חובה)</label>
          <input id="a-phone" className="input" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="050-1234567" value={f.phone} onChange={set('phone')} aria-invalid={!!errs.phone} /><FieldErr k="phone" />
          <label className="field-label" htmlFor="a-birth">תאריך לידה (לא חובה, אי אפשר לשנות אחר כך)</label>
          <BirthDateInput id="a-birth" value={f.birthDate} onChange={(v) => setF((x) => ({ ...x, birthDate: v }))} />
          <label className="field-label" htmlFor="a-area">אזור מגורים (לא חובה)</label>
          <input id="a-area" className="input" list="a-cities" autoComplete="off" placeholder="עיר או שכונה" value={f.area} onChange={set('area')} />
          <datalist id="a-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          <p className="fine">הפרטים נשמרים אצלנו ולא מוצגים באתר.</p>
        </>) : null}
        {err ? <p className="err" role="alert">{err}</p> : null}
        {unconfirmed ? <button type="button" className="btn btn-line" onClick={resend}>שליחה חוזרת של מייל האימות</button> : null}
        {resent && !sent ? <p className="hint" role="status">{resent}</p> : null}
        {info ? <p className="note" role="status">{info}</p> : null}
        <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'רגע…' : signup ? 'פתיחת חשבון' : 'כניסה'}</button>
        {!signup ? <button type="button" className="btn btn-ghost" onClick={forgot}>שכחתי סיסמה</button> : null}
      </form>
      <p className="auth-switch">
        {signup ? 'כבר יש חשבון? ' : 'אין עדיין חשבון? '}
        <button type="button" className="link-btn" onClick={() => go(signup ? 'login' : 'signup')}>{signup ? 'כניסה' : 'פתיחת חשבון'}</button>
      </p>
      <button type="button" className="link-btn" onClick={leave}>→ חזרה לאתר</button>
    </div></main>
  );
}
