import { useEffect, useRef, useState } from 'react';
import { useApp, go } from '../state.jsx';
import { money, rating1, reviewsLabel, initials, avatarColor, km, relDays, dateLong, normalizePhone } from '../lib/format.js';

export function Coin({ size = 30 }) {
  return (
    <svg className="coin" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#DFC166" stroke="#3A3130" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#1A1406" strokeOpacity=".25" strokeWidth="1.2" />
      <rect x="7" y="14.6" width="18" height="2.8" rx="1.4" fill="#1A1406" fillOpacity=".55" />
    </svg>
  );
}

export function Avatar({ tutor, className = 'avatar', size }) {
  if (tutor?.photo) {
    return <img className={className} src={tutor.photo} alt={tutor.name} width={size || 520} height={size || 520} loading="lazy" decoding="async" />;
  }
  return (
    <span className={className + ' avatar-initials'} aria-hidden="true">
      {initials(tutor?.name)}
    </span>
  );
}

export function Stars({ avg, count, compact }) {
  if (!count) return <span className="stars muted-text">{compact ? 'חדש באתר' : 'אין עדיין ביקורות'}</span>;
  return (
    <span className="stars">
      <span className="s" aria-hidden="true">★</span> <bdi>{rating1(avg)}</bdi> <span>({reviewsLabel(count)})</span>
    </span>
  );
}

export function StarRow({ value, size = 18 }) {
  return (
    <span className="star-row" aria-label={`${value} מתוך 5 כוכבים`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? 'on' : ''} aria-hidden="true">★</span>)}
    </span>
  );
}

export function Verified({ tutor }) {
  if (!tutor?.verified) return null;
  return <span className="verified" title="המורה נבדק על ידי צוות האתר">✓ מאומת</span>;
}

export function PriceLines({ tutor }) {
  return (
    <div className="price-lines">
      {tutor.teachesFrontal && tutor.priceFrontal ? <span><small>פרונטלי</small> <bdi className="price">{money(tutor.priceFrontal)}</bdi></span> : null}
      {tutor.teachesOnline && tutor.priceOnline ? <span><small>אונליין</small> <bdi className="price">{money(tutor.priceOnline)}</bdi></span> : null}
    </div>
  );
}

export function placeLabel(t) {
  const parts = [];
  if (t.teachesFrontal && t.city) parts.push(t.city + (t.area ? `, ${t.area}` : ''));
  if (t.teachesOnline) parts.push(t.teachesFrontal ? 'וגם אונליין' : 'אונליין בלבד');
  return parts.join(' ');
}

/** Tutor row: medium photo, caption, what they teach, rating. Used on home + search. */
export function TutorRow({ tutor, sort }) {
  const href = `#tutor-${tutor.id}`;
  const levels = (tutor.levels || []).slice(0, 4);
  return (
    <article className="t-row">
      <a href={href} className="t-row-photo" tabIndex={-1} aria-hidden="true"><Avatar tutor={tutor} className="avatar-sq" /></a>
      <div className="t-row-main">
        <div className="t-row-title">
          <a className="t-name" href={href}>{tutor.name}</a> <Verified tutor={tutor} />
        </div>
        <p className="t-caption">{tutor.headline}</p>
        <p className="t-teaches">
          <span className="t-label">מלמד/ת:</span> {(tutor.subjects || []).join(', ')}
          {levels.length ? <span className="t-levels"> · {levels.join(', ')}</span> : null}
        </p>
        <p className="t-meta">
          {placeLabel(tutor)}
          {tutor.distance != null && tutor.teachesFrontal ? <b className={'dist' + (sort === 'near' ? ' hot' : '')}> · {km(tutor.distance)}</b> : null}
          {tutor.contactCount && sort ? <span className={'demand' + (sort === 'popular' ? ' hot' : '')}> · <bdi>{tutor.contactCount}</bdi> פניות</span> : null}
        </p>
      </div>
      <div className="t-row-side">
        <div className="t-rating"><Stars avg={tutor.ratingAvg} count={tutor.ratingCount} /></div>
        <PriceLines tutor={tutor} />
        <a className="btn btn-brand t-cta" href={href}>לפרופיל</a>
      </div>
    </article>
  );
}

export function SeatDots({ taken, max }) {
  const n = Math.min(max, 10);
  const on = Math.round((taken / max) * n);
  const left = Math.max(0, max - taken);
  return (
    <div className="seats">
      <span className="dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</span>
      {left === 0 ? 'הקבוצה מלאה' : left === 1 ? 'מקום אחרון' : `נשארו ${left} מתוך ${max}`}
    </div>
  );
}

export function GroupCard({ group }) {
  const t = group.tutor;
  return (
    <article className="group">
      <div className="g-top"><span className="units">{group.level || group.subject}</span><span className="g-when">{relDays(group.startDate) === 'כבר התחילה' ? 'פעילה' : `מתחילה ${relDays(group.startDate)}`}</span></div>
      <a className="g-title" href={`#group-${group.id}`}>{group.title}</a>
      <p className="t-meta">{dateLong(group.startDate)} · {group.time} · {group.sessions > 1 ? `${group.sessions} מפגשים` : 'מפגש אחד'} · {group.mode === 'online' ? 'אונליין' : group.city || 'פרונטלי'}</p>
      {t ? <p className="t-meta host"><Avatar tutor={t} className="host-img" size={40} />עם {t.name} <Verified tutor={t} /></p> : null}
      <SeatDots taken={group.seatsTaken} max={group.maxSeats} />
      <div className="t-foot"><span className="price"><bdi>{money(group.pricePerPerson)}</bdi> <small>{group.sessions > 1 ? 'לתלמיד למפגש' : 'לתלמיד'}</small></span><a className="btn btn-brand t-cta" href={`#group-${group.id}`}>{group.seatsTaken >= group.maxSeats ? 'פרטים' : 'הצטרפות'}</a></div>
    </article>
  );
}

export function Chips({ options, value, onChange, multi, label, id }) {
  const isOn = (o) => (multi ? (value || []).includes(o) : value === o);
  const toggle = (o) => {
    if (multi) onChange(isOn(o) ? value.filter((x) => x !== o) : [...(value || []), o]);
    else onChange(isOn(o) ? '' : o);
  };
  return (
    <div className={'chips' + (multi ? ' wrap-chips' : '')} role="group" aria-labelledby={label} id={id}>
      {options.map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={isOn(o)} onClick={() => toggle(o)}>{o}</button>
      ))}
    </div>
  );
}

export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-labelledby={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, text]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}

export function ConfirmButton({ children, confirmText = 'בטוח? לחצו שוב', onConfirm, className = 'btn btn-line btn-sm' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return undefined; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" className={className + (armed ? ' danger' : '')} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}

export function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-line btn-sm" onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }, () => {});
    }}>{done ? 'הועתק ✓' : 'העתקה'}</button>
  );
}

/** Phone number: visible only to signed-in users, fetched from the server on demand. */
export function PhoneReveal({ tutor, message }) {
  const { user, api, requireLogin, notify } = useApp();
  const [phone, setPhone] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPhone(null); }, [user?.id, tutor.id]);
  const reveal = async () => {
    if (!requireLogin('כדי לראות את מספר הטלפון של המורה צריך להתחבר. ככה אנחנו שומרים על המורים מספאם.')) return;
    setBusy(true);
    try { setPhone(await api.revealPhone(tutor.id)); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  if (!phone) {
    return (
      <div className="phone-box">
        <div className="phone-masked" aria-hidden="true"><bdi>05X-XXX-XXXX</bdi></div>
        <button type="button" className="btn btn-brand go" onClick={reveal} disabled={busy}>
          {busy ? 'רגע…' : user ? 'הצגת מספר הטלפון' : 'התחברו כדי לראות טלפון'}
        </button>
        {!user ? <p className="hint">כניסה מהירה עם חשבון Google. בלי סיסמה.</p> : null}
      </div>
    );
  }
  const wa = `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message || `היי ${tutor.name}, ראיתי את הפרופיל שלך בנפל האסימון ואשמח לשמוע על שיעורים.`)}`;
  return (
    <div className="phone-box">
      <div className="phone-num"><bdi>{phone}</bdi><CopyButton text={phone} /></div>
      <div className="phone-actions">
        <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">וואטסאפ</a>
        <a className="btn btn-line" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>חיוג</a>
      </div>
    </div>
  );
}

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginReason, api } = useApp();
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (loginOpen && !d.open) { d.showModal(); setPicking(false); setErr(''); }
    if (!loginOpen && d.open) d.close();
  }, [loginOpen]);
  const google = async () => {
    if (api.mode === 'demo') { setPicking(true); return; }
    try { await api.auth.signInWithGoogle(); } catch (e) { setErr(e.message); }
  };
  return (
    <dialog ref={ref} className="modal" onClose={() => setLoginOpen(false)} onClick={(e) => { if (e.target === ref.current) setLoginOpen(false); }}>
      <div className="modal-body">
        <button type="button" className="modal-x" onClick={() => setLoginOpen(false)} aria-label="סגירה">×</button>
        <Coin size={44} />
        <h2>כניסה לנפל האסימון</h2>
        <p className="muted-text">{loginReason || 'מתחברים כדי לראות מספרי טלפון, לכתוב ביקורות ולשמור מקום בקבוצות.'}</p>
        {!picking ? (
          <button type="button" className="btn btn-google" onClick={google}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
            המשך עם Google
          </button>
        ) : (
          <div className="demo-accounts">
            <p className="demo-note">גרסת תצוגה: בחרו חשבון לדוגמה. באתר האמיתי כאן נפתח חלון ההתחברות של Google.</p>
            {api.demoUsers.map((u) => (
              <button key={u.id} type="button" className="acct" onClick={() => api.auth.signInWithGoogle(u)}>
                <span className="acct-av" style={{ background: avatarColor(u.id) }}>{initials(u.name)}</span>
                <span><b>{u.name}</b><small>{u.note}</small></span>
              </button>
            ))}
          </div>
        )}
        {err ? <p className="err">{err}</p> : null}
        <p className="fine">בכניסה אתם מסכימים לתנאי השימוש. לא נפרסם דבר בשמכם.</p>
      </div>
    </dialog>
  );
}

function Icon({ d }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}
const ICONS = {
  home: <Icon d={<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>} />,
  search: <Icon d={<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>} />,
  groups: <Icon d={<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15 14.5c3 0 6 1.8 6 5.5" /></>} />,
  panel: <Icon d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>} />,
};

export function UserMenu() {
  const { user, api } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close); return () => document.removeEventListener('click', close);
  }, []);
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        {user.avatar ? <img src={user.avatar} alt="" /> : <span className="acct-av" style={{ background: avatarColor(user.id) }}>{initials(user.name)}</span>}
        <span className="user-name">{user.name.split(' ')[0]}</span>
      </button>
      {open ? (
        <div className="user-pop">
          <b>{user.name}</b>{user.isAdmin ? <span className="tag brass">מנהל</span> : null}
          <a href="#panel" onClick={() => setOpen(false)}>פאנל מורה</a>
          <a href="#panel-groups" onClick={() => setOpen(false)}>קבוצות הלמידה שלי</a>
          <a href="#panel-seats" onClick={() => setOpen(false)}>ההרשמות שלי</a>
          {user.isAdmin ? <a href="#panel-admin" onClick={() => setOpen(false)}>ניהול מורים</a> : null}
          <button type="button" onClick={() => { setOpen(false); api.auth.signOut(); }}>התנתקות</button>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const { user, setLoginOpen, route, api } = useApp();
  const cur = (n) => (route.name === n || route.name.startsWith(n + '-') ? 'page' : undefined);
  return (
    <>
      <header className="top">
        <div className="wrap">
          <a className="logo" href="#" onClick={(e) => { e.preventDefault(); go(''); }} aria-label="נפל האסימון, דף הבית">
            <Coin />
            <span className="logo-text"><b>נפל האסימון</b><small>מורים פרטיים למתמטיקה ועוד</small></span>
          </a>
          <nav className="links" aria-label="ראשי">
            <a href="#search" aria-current={cur('search')}>חיפוש מורים</a>
            <a href="#groups" aria-current={cur('groups')}>קבוצות למידה</a>
            <a href="#panel" aria-current={cur('panel')}>פאנל מורה</a>
          </nav>
          <div className="top-actions">
            {user ? <UserMenu /> : <button type="button" className="btn btn-ghost" onClick={() => setLoginOpen(true)}>כניסה</button>}
            <a className="btn btn-brass hide-sm" href="#panel">פתיחת פרופיל מורה</a>
          </div>
        </div>
      </header>
      {api.mode === 'demo' ? <div className="demo-strip"><div className="wrap">גרסת תצוגה: כל הנתונים לדוגמה, והכניסה עם Google מדומה.</div></div> : null}
    </>
  );
}

export function BottomNav() {
  const { route } = useApp();
  const items = [['', 'home', 'בית'], ['search', 'search', 'חיפוש'], ['groups', 'groups', 'קבוצות'], ['panel', 'panel', 'פאנל מורה']];
  const active = (n) => (n === '' ? route.name === 'home' : route.name === n || route.name.startsWith(n + '-') || (n === 'search' && route.name === 'tutor') || (n === 'groups' && route.name === 'group'));
  return (
    <nav className="bottom-nav" aria-label="ניווט מהיר">
      {items.map(([h, icon, label]) => (
        <a key={icon} href={'#' + h} onClick={(e) => { if (!h) { e.preventDefault(); go(''); } }} aria-current={active(h) ? 'page' : undefined}>
          {ICONS[icon]}<span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function Footer() {
  const { api, reload, notify } = useApp();
  return (
    <footer>
      <div className="wrap">
        <nav aria-label="קישורים">
          <a href="#search">חיפוש מורים</a><a href="#groups">קבוצות למידה</a><a href="#panel">למורים</a><a href="#about">אודות ותנאי שימוש</a>
        </nav>
        <p>© 2026 נפל האסימון · מורים פרטיים למתמטיקה ועוד
          {api.mode === 'demo' ? <> · <button type="button" className="linkish" onClick={() => { api.resetDemo(); reload(); notify('נתוני ההדגמה אופסו'); }}>איפוס נתוני ההדגמה</button></> : null}
        </p>
      </div>
    </footer>
  );
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className={'toast' + (toast.bad ? ' bad' : '')} role="status">{toast.text}</div>;
}

export function Empty({ title, children }) {
  return <div className="empty"><Coin size={40} /><h3>{title}</h3>{children}</div>;
}

export function Loading() { return <div className="loading" aria-live="polite">טוען…</div>; }
