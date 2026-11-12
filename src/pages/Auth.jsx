import { useEffect, useState } from 'react';
import { useApp, go } from '../state.jsx';
import { Coin, GOOGLE_ICON, rememberReturn } from '../components/ui.jsx';
import { CITIES } from '../data/constants.js';
import { isEmail, isPhone } from '../lib/format.js';

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
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { if (user) leave(); }, [user]);
  useEffect(() => { window.scrollTo(0, 0); setErr(''); setSent(false); }, [mode]);

  const google = async () => { rememberReturn(); try { await api.auth.signInWithGoogle(); } catch (e) { setErr(e.message); } };

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (signup && !f.name.trim()) return setErr('כתבו שם');
    if (!isEmail(f.email.trim())) return setErr('כתבו כתובת מייל תקינה');
    if (signup && f.password.length < 8) return setErr('הסיסמה צריכה להכיל לפחות 8 תווים');
    if (!signup && !f.password) return setErr('כתבו סיסמה');
    if (signup && f.phone.trim() && !isPhone(f.phone)) return setErr('בדקו את מספר הטלפון, למשל 050-1234567');
    setBusy(true);
    try {
      if (signup) {
        const r = await api.auth.signUpEmail({ email: f.email.trim(), password: f.password, name: f.name.trim(), phone: f.phone.trim(), birthDate: f.birthDate, area: f.area.trim() });
        if (r.needsConfirm) setSent(true);
      } else {
        await api.auth.signInEmail({ email: f.email.trim(), password: f.password });
      }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  const forgot = async () => {
    if (!isEmail(f.email.trim())) return setErr('כתבו קודם את המייל שלכם בשדה למעלה');
    try { await api.auth.resetPassword(f.email.trim()); notify('שלחנו קישור לאיפוס סיסמה למייל'); } catch (x) { setErr(x.message); }
  };

  if (sent) {
    return (
      <main className="auth-page"><div className="auth-card">
        <Coin size={52} />
        <h1>בדקו את המייל</h1>
        <p className="muted-text">שלחנו קישור אישור אל <bdi>{f.email}</bdi>. לחצו עליו כדי להשלים את פתיחת החשבון. אם לא הגיע, בדקו גם בספאם.</p>
        <button type="button" className="btn btn-line" onClick={() => go('login')}>לדף הכניסה</button>
      </div></main>
    );
  }

  return (
    <main className="auth-page"><div className="auth-card">
      <Coin size={52} />
      <h1>{signup ? 'פתיחת חשבון' : 'כניסה לחשבון'}</h1>
      <p className="muted-text">{signup ? 'חשבון מאפשר צ׳אט עם מורים, הצטרפות לקבוצות וקבלת עדכונים במייל. בחינם.' : 'ברוכים השבים.'}</p>
      <button type="button" className="btn btn-google" onClick={google}>{GOOGLE_ICON} המשך עם Google</button>
      <div className="login-or"><span>או עם מייל</span></div>
      <form className="auth-form" onSubmit={submit} noValidate>
        {signup ? (<>
          <label className="field-label" htmlFor="a-name">שם מלא</label>
          <input id="a-name" className="input" autoComplete="name" value={f.name} onChange={set('name')} />
        </>) : null}
        <label className="field-label" htmlFor="a-email">מייל</label>
        <input id="a-email" className="input" type="email" dir="ltr" autoComplete="email" value={f.email} onChange={set('email')} />
        <label className="field-label" htmlFor="a-pass">סיסמה{signup ? ' (לפחות 8 תווים)' : ''}</label>
        <input id="a-pass" className="input" type="password" dir="ltr" autoComplete={signup ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
        {signup ? (<>
          <label className="field-label" htmlFor="a-phone">טלפון (לא חובה)</label>
          <input id="a-phone" className="input" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="050-1234567" value={f.phone} onChange={set('phone')} />
          <label className="field-label" htmlFor="a-birth">תאריך לידה (לא חובה, אי אפשר לשנות אחר כך)</label>
          <input id="a-birth" className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={f.birthDate} onChange={set('birthDate')} />
          <label className="field-label" htmlFor="a-area">אזור מגורים (לא חובה)</label>
          <input id="a-area" className="input" list="a-cities" autoComplete="off" placeholder="עיר או שכונה" value={f.area} onChange={set('area')} />
          <datalist id="a-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          <p className="fine">הפרטים נשמרים אצלנו ולא מוצגים באתר.</p>
        </>) : null}
        {err ? <p className="err" role="alert">{err}</p> : null}
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
