import { useEffect, useMemo, useState } from 'react';
import { useApp, useLoad, go } from '../state.jsx';
import { SUBJECTS, LEVELS, CITIES } from '../data/constants.js';
import { money, dateShort, dateLong } from '../lib/format.js';
import { Avatar, Chips, Seg, ConfirmButton, Verified, Stars, Loading, Empty, Coin } from '../components/ui.jsx';

const TABS = [
  ['panel', 'הפרופיל שלי'],
  ['panel-groups', 'קבוצות למידה'],
  ['panel-seats', 'ההרשמות שלי'],
  ['panel-admin', 'ניהול מורים'],
];

export default function Panel() {
  const { user, route, setLoginOpen } = useApp();
  if (!user) {
    return (
      <main className="wrap page-pad">
        <div className="panel-gate">
          <Coin size={56} />
          <h1>פאנל מורה</h1>
          <p className="muted-text">כאן פותחים פרופיל מורה, מעדכנים מחירים ומיקום, ומעלים קבוצות למידה ומרתונים. מתחילים בכניסה עם Google.</p>
          <ul className="check-list">
            <li>פרופיל עם מקצועות, רמות, מיקום ומחיר פרונטלי ואונליין</li>
            <li>פניות ישירות לטלפון ולוואטסאפ, בלי עמלה</li>
            <li>קבוצות עם הרשמה, שמירת מקום ושאלות מתלמידים</li>
          </ul>
          <button type="button" className="btn btn-brand go" onClick={() => setLoginOpen(true)}>כניסה עם Google</button>
        </div>
      </main>
    );
  }
  const tabs = TABS.filter(([k]) => k !== 'panel-admin' || user.isAdmin);
  const tab = tabs.some(([k]) => k === route.name) ? route.name : 'panel';
  return (
    <main className="wrap page-pad">
      <div className="page-head"><h1>פאנל מורה</h1><p className="muted-text">שלום {user.name}{user.isAdmin ? ' · מנהל/ת האתר' : ''}</p></div>
      <nav className="tabs" aria-label="פאנל">
        {tabs.map(([k, label]) => <a key={k} href={'#' + k} aria-current={tab === k ? 'page' : undefined}>{label}</a>)}
      </nav>
      {tab === 'panel' && <MyProfile />}
      {tab === 'panel-groups' && <MyGroups />}
      {tab === 'panel-seats' && <MySeats />}
      {tab === 'panel-admin' && <AdminTutors />}
    </main>
  );
}

function MyProfile() {
  const { api, user, version, reload, notify } = useApp();
  const [mine, loading, , refresh] = useLoad(() => api.getMyTutor(), [user.id, version]);
  const [editing, setEditing] = useState(false);
  if (loading && !mine) return <Loading />;
  if (!mine && !editing) {
    return (
      <div className="panel-empty">
        <h2>עוד אין לכם פרופיל מורה</h2>
        <p className="muted-text">זה לוקח בערך שלוש דקות. אחרי הפרסום תופיעו בחיפוש ותוכלו לפתוח קבוצות.</p>
        <button type="button" className="btn btn-brand" onClick={() => setEditing(true)}>פתיחת פרופיל מורה</button>
      </div>
    );
  }
  if (editing || !mine) {
    return (
      <TutorForm initial={mine} forSelf
        onCancel={() => setEditing(false)}
        onSaved={(t) => { setEditing(false); refresh(); reload(); notify(mine ? 'הפרופיל עודכן' : 'הפרופיל פורסם! עכשיו תלמידים יכולים למצוא אתכם'); if (!mine) go(`tutor-${t.id}`); }} />
    );
  }
  return (
    <div className="my-profile">
      <div className="mp-card">
        <Avatar tutor={mine} className="mp-photo" />
        <div>
          <h2>{mine.name} <Verified tutor={mine} /></h2>
          <p className="muted-text">{mine.headline}</p>
          <p>{(mine.subjects || []).join(', ')} · {(mine.levels || []).join(', ')}</p>
          <p>{mine.teachesFrontal && mine.priceFrontal ? `פרונטלי ${money(mine.priceFrontal)} ב${mine.city}` : ''}{mine.teachesFrontal && mine.teachesOnline ? ' · ' : ''}{mine.teachesOnline && mine.priceOnline ? `אונליין ${money(mine.priceOnline)}` : ''}</p>
          <p>טלפון: <bdi>{mine.phone}</bdi></p>
          <div className="form-actions">
            <button type="button" className="btn btn-brand" onClick={() => setEditing(true)}>עריכה</button>
            <a className="btn btn-line" href={`#tutor-${mine.id}`}>איך תלמידים רואים אותי</a>
            <a className="btn btn-line" href="#panel-groups">פתיחת קבוצה</a>
          </div>
        </div>
      </div>
      <Stats tutorId={mine.id} contactCount={mine.contactCount} />
      {!mine.verified ? <p className="note">רוצים סימן ✓ מאומת? שלחו לנו צילום תעודת זהות ותעודה או תואר, ונאמת תוך יום עסקים.</p> : null}
    </div>
  );
}

function Stats({ tutorId, contactCount }) {
  const { tutors, groups } = useApp();
  const t = (tutors || []).find((x) => x.id === tutorId);
  const g = (groups || []).filter((x) => x.tutorId === tutorId);
  return (
    <div className="stat-row">
      <div><b><bdi>{contactCount || 0}</bdi></b><span>תלמידים ראו את הטלפון</span></div>
      <div><b><bdi>{t?.ratingCount || 0}</bdi></b><span>ביקורות{t?.ratingCount ? ` · ממוצע ${t.ratingAvg.toFixed(1)}` : ''}</span></div>
      <div><b><bdi>{g.reduce((a, x) => a + x.seatsTaken, 0)}</bdi></b><span>נרשמים בקבוצות שלי</span></div>
    </div>
  );
}

const EMPTY_TUTOR = {
  name: '', photo: '', headline: '', about: '', subjects: ['מתמטיקה'], levels: [], city: '', area: '',
  teachesFrontal: true, priceFrontal: '', teachesOnline: true, priceOnline: '', experienceYears: '', phone: '', verified: false,
};

export function TutorForm({ initial, onSaved, onCancel, forSelf }) {
  const { api, user, notify } = useApp();
  const [t, setT] = useState(() => ({ ...EMPTY_TUTOR, ...(initial || {}), ...(initial ? {} : forSelf ? { name: user.name } : {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch) => setT((x) => ({ ...x, ...patch }));

  const validate = () => {
    const e = {};
    if (!t.name.trim()) e.name = 'כתבו שם';
    if (!t.subjects.length) e.subjects = 'בחרו לפחות מקצוע אחד';
    if (!t.levels.length) e.levels = 'בחרו לפחות רמה אחת';
    if (!t.teachesFrontal && !t.teachesOnline) e.mode = 'בחרו פרונטלי, אונליין או את שניהם';
    if (t.teachesFrontal && !t.city) e.city = 'בחרו עיר לשיעורים פרונטליים';
    if (t.teachesFrontal && !(Number(t.priceFrontal) > 0)) e.priceFrontal = 'כתבו מחיר לשעה';
    if (t.teachesOnline && !(Number(t.priceOnline) > 0)) e.priceOnline = 'כתבו מחיר לשעה';
    if (!/^0\d{1,2}-?\d{7}$/.test((t.phone || '').replace(/\s/g, ''))) e.phone = 'מספר טלפון ישראלי, למשל 050-1234567';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { notify('יש כמה שדות לתקן', true); return; }
    setBusy(true);
    try {
      const saved = await api.saveTutor({
        ...t, forSelf,
        priceFrontal: t.teachesFrontal ? Number(t.priceFrontal) : null,
        priceOnline: t.teachesOnline ? Number(t.priceOnline) : null,
        experienceYears: t.experienceYears === '' ? null : Number(t.experienceYears),
      });
      onSaved(saved);
    } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { notify('התמונה גדולה מדי (עד 8MB)', true); return; }
    setUploading(true);
    try { set({ photo: await api.uploadPhoto(f) }); } catch (err) { notify('ההעלאה נכשלה: ' + err.message, true); }
    setUploading(false);
  };
  const Err = ({ k }) => (errors[k] ? <span className="err">{errors[k]}</span> : null);

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset>
        <legend>פרטים בסיסיים</legend>
        <div className="photo-field">
          <Avatar tutor={{ ...t, id: t.id || 'new' }} className="mp-photo" />
          <div>
            <label className="btn btn-line btn-sm" htmlFor="tf-photo">{uploading ? 'מעלים…' : t.photo ? 'החלפת תמונה' : 'העלאת תמונה'}</label>
            <input id="tf-photo" type="file" accept="image/*" className="sr-only" onChange={upload} />
            {t.photo ? <button type="button" className="linkish" onClick={() => set({ photo: '' })}>הסרה</button> : null}
            <p className="hint">תמונה ברורה של הפנים מגדילה פניות בערך פי שניים.</p>
          </div>
        </div>
        <div className="f2">
          <div><label className="field-label" htmlFor="tf-name">שם מלא</label><input id="tf-name" className="input" value={t.name} onChange={(e) => set({ name: e.target.value })} /><Err k="name" /></div>
          <div><label className="field-label" htmlFor="tf-phone">טלפון (יוצג רק למשתמשים מחוברים)</label><input id="tf-phone" className="input" dir="ltr" inputMode="tel" placeholder="050-1234567" value={t.phone} onChange={(e) => set({ phone: e.target.value })} /><Err k="phone" /></div>
        </div>
        <label className="field-label" htmlFor="tf-headline">שורה אחת עליכם</label>
        <input id="tf-headline" className="input" maxLength={80} placeholder="למשל: סטודנטית לתואר שני במתמטיקה" value={t.headline} onChange={(e) => set({ headline: e.target.value })} />
        <label className="field-label" htmlFor="tf-about">על השיעורים שלכם</label>
        <textarea id="tf-about" className="input" rows={5} maxLength={1500} placeholder="איך אתם מלמדים, למי זה מתאים, הישגים של תלמידים…" value={t.about} onChange={(e) => set({ about: e.target.value })} />
        <div className="f2">
          <div><label className="field-label" htmlFor="tf-exp">שנות ניסיון</label><input id="tf-exp" className="input" type="number" min="0" max="60" value={t.experienceYears ?? ''} onChange={(e) => set({ experienceYears: e.target.value })} /></div>
          {user.isAdmin ? <label className="check big-check"><input type="checkbox" checked={!!t.verified} onChange={(e) => set({ verified: e.target.checked })} /> מורה מאומת (✓)</label> : <div />}
        </div>
      </fieldset>

      <fieldset>
        <legend>מה מלמדים</legend>
        <span className="field-label" id="tf-subj">מקצועות</span>
        <Chips multi label="tf-subj" options={[...SUBJECTS, 'פסיכומטרי']} value={t.subjects} onChange={(subjects) => set({ subjects })} />
        <Err k="subjects" />
        <span className="field-label" id="tf-lvl">רמות</span>
        <Chips multi label="tf-lvl" options={LEVELS} value={t.levels} onChange={(levels) => set({ levels })} />
        <Err k="levels" />
      </fieldset>

      <fieldset>
        <legend>איפה ובכמה</legend>
        <div className="mode-rows">
          <div className={'mode-row' + (t.teachesFrontal ? ' on' : '')}>
            <label className="check"><input type="checkbox" checked={t.teachesFrontal} onChange={(e) => set({ teachesFrontal: e.target.checked })} /> שיעורים פרונטליים</label>
            {t.teachesFrontal ? (
              <div className="f3">
                <div><label className="field-label" htmlFor="tf-city">עיר</label>
                  <select id="tf-city" className="select" value={t.city} onChange={(e) => set({ city: e.target.value })}><option value="">בחרו עיר</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select><Err k="city" /></div>
                <div><label className="field-label" htmlFor="tf-area">שכונה או אזור (לא חובה)</label><input id="tf-area" className="input" placeholder="למשל: ליד הבורסה" value={t.area} onChange={(e) => set({ area: e.target.value })} /></div>
                <div><label className="field-label" htmlFor="tf-pf">מחיר לשעה, פרונטלי (₪)</label><input id="tf-pf" className="input" type="number" min="0" max="2000" inputMode="numeric" value={t.priceFrontal ?? ''} onChange={(e) => set({ priceFrontal: e.target.value })} /><Err k="priceFrontal" /></div>
              </div>
            ) : null}
          </div>
          <div className={'mode-row' + (t.teachesOnline ? ' on' : '')}>
            <label className="check"><input type="checkbox" checked={t.teachesOnline} onChange={(e) => set({ teachesOnline: e.target.checked })} /> שיעורים אונליין</label>
            {t.teachesOnline ? (
              <div className="f3"><div><label className="field-label" htmlFor="tf-po">מחיר לשעה, אונליין (₪)</label><input id="tf-po" className="input" type="number" min="0" max="2000" inputMode="numeric" value={t.priceOnline ?? ''} onChange={(e) => set({ priceOnline: e.target.value })} /><Err k="priceOnline" /></div></div>
            ) : null}
          </div>
          <Err k="mode" />
        </div>
      </fieldset>

      <div className="form-actions sticky-actions">
        <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : initial ? 'שמירת השינויים' : 'פרסום הפרופיל'}</button>
        {onCancel ? <button type="button" className="btn btn-ghost" onClick={onCancel}>ביטול</button> : null}
      </div>
    </form>
  );
}

function MyGroups() {
  const { api, user, tutors, groups, reload, notify, version } = useApp();
  const [mine, loading] = useLoad(() => api.getMyTutor(), [user.id, version]);
  const [editing, setEditing] = useState(null); // null | {} | group
  const [openSeats, setOpenSeats] = useState(null);
  const manageable = useMemo(() => (user.isAdmin ? tutors || [] : mine ? [mine] : []), [user.isAdmin, tutors, mine]);
  const list = useMemo(() => (groups || []).filter((g) => manageable.some((t) => t.id === g.tutorId)).sort((a, b) => a.startDate.localeCompare(b.startDate)), [groups, manageable]);

  if (loading && !mine && !user.isAdmin) return <Loading />;
  if (!manageable.length) {
    return (
      <div className="panel-empty">
        <h2>קודם פותחים פרופיל מורה</h2>
        <p className="muted-text">קבוצה תמיד מופיעה עם המורה שמעביר אותה, כדי שתלמידים יוכלו לראות ביקורות ולפנות.</p>
        <a className="btn btn-brand" href="#panel">פתיחת פרופיל מורה</a>
      </div>
    );
  }
  if (editing) {
    return <GroupForm initial={editing.id ? editing : null} tutors={manageable} onCancel={() => setEditing(null)}
      onSaved={(g) => { setEditing(null); reload(); notify(editing.id ? 'הקבוצה עודכנה' : 'הקבוצה פורסמה! תלמידים יכולים להירשם'); void g; }} />;
  }
  return (
    <div className="my-groups">
      <div className="mg-head">
        <p className="muted-text">{user.isAdmin ? 'כמנהל/ת אתם רואים את הקבוצות של כל המורים.' : 'כאן מעלים מרתונים וקבוצות קבועות ורואים מי נרשם.'}</p>
        <button type="button" className="btn btn-brand" onClick={() => setEditing({})}>+ קבוצה חדשה</button>
      </div>
      {!list.length ? (
        <Empty title="עוד לא פתחתם קבוצה"><p>למשל ״מרתון לבגרות 472״, יום שישי 9:00, 90 ₪ לתלמיד, 12 מקומות.</p></Empty>
      ) : (
        <div className="admin-list">
          {list.map((g) => (
            <article key={g.id} className="admin-item">
              <div className="ai-main">
                <a className="t-name" href={`#group-${g.id}`}>{g.title}</a>
                <p className="t-meta">{dateLong(g.startDate)} · {g.time} · {g.mode === 'online' ? 'אונליין' : g.location || g.city} · {money(g.pricePerPerson)} לתלמיד{user.isAdmin && g.tutor ? ` · ${g.tutor.name}` : ''}</p>
                <p className="ai-seats"><b><bdi>{g.seatsTaken}</bdi></b> מתוך <bdi>{g.maxSeats}</bdi> מקומות תפוסים</p>
              </div>
              <div className="ai-actions">
                <button type="button" className="btn btn-line btn-sm" onClick={() => setOpenSeats(openSeats === g.id ? null : g.id)} aria-expanded={openSeats === g.id}>נרשמים</button>
                <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(g)}>עריכה</button>
                <ConfirmButton confirmText="למחוק את הקבוצה?" onConfirm={async () => { try { await api.deleteGroup(g.id); reload(); notify('הקבוצה נמחקה'); } catch (e) { notify(e.message, true); } }}>מחיקה</ConfirmButton>
              </div>
              {openSeats === g.id ? <SeatList groupId={g.id} /> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SeatList({ groupId }) {
  const { api, version } = useApp();
  const [seats, loading, error] = useLoad(() => api.listGroupSeats(groupId), [groupId, version]);
  if (loading) return <Loading />;
  if (error) return <p className="err">{error.message}</p>;
  if (!seats.length) return <p className="muted-text seat-list">עוד אין נרשמים.</p>;
  return (
    <div className="seat-list">
      <table>
        <thead><tr><th>שם</th><th>טלפון</th><th>הערה</th><th>נרשם/ה</th></tr></thead>
        <tbody>{seats.map((s) => <tr key={s.id}><td>{s.name}</td><td><bdi>{s.phone}</bdi></td><td>{s.note || '—'}</td><td>{dateShort(s.createdAt)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

const EMPTY_GROUP = { tutorId: '', title: '', subject: 'מתמטיקה', level: '', description: '', startDate: '', time: '', sessions: 1, mode: 'online', city: '', location: '', pricePerPerson: '', maxSeats: 8 };

function GroupForm({ initial, tutors, onSaved, onCancel }) {
  const { api, notify } = useApp();
  const [g, setG] = useState(() => ({ ...EMPTY_GROUP, tutorId: tutors.length === 1 ? tutors[0].id : '', ...(initial || {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (patch) => setG((x) => ({ ...x, ...patch }));
  useEffect(() => { if (!g.startDate) { const d = new Date(); d.setDate(d.getDate() + 7); set({ startDate: d.toISOString().slice(0, 10) }); } }, []); // eslint-disable-line

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!g.tutorId) e.tutorId = 'בחרו מורה';
    if (!g.title.trim()) e.title = 'כתבו את מטרת הקבוצה';
    if (!g.startDate) e.startDate = 'בחרו תאריך';
    if (!(Number(g.pricePerPerson) >= 0) || g.pricePerPerson === '') e.pricePerPerson = 'כתבו מחיר לתלמיד';
    if (!(Number(g.maxSeats) >= 1)) e.maxSeats = 'לפחות מקום אחד';
    if (g.mode === 'frontal' && !g.city) e.city = 'בחרו עיר';
    setErrors(e);
    if (Object.keys(e).length) { notify('יש כמה שדות לתקן', true); return; }
    setBusy(true);
    try {
      const { tutor, seatsTaken, ...clean } = g; void tutor; void seatsTaken;
      onSaved(await api.saveGroup({ ...clean, pricePerPerson: Number(g.pricePerPerson), maxSeats: Number(g.maxSeats), sessions: Number(g.sessions) || 1 }));
    } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  const Err = ({ k }) => (errors[k] ? <span className="err">{errors[k]}</span> : null);

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset>
        <legend>{initial ? 'עריכת קבוצה' : 'קבוצה חדשה'}</legend>
        {tutors.length > 1 ? (
          <><label className="field-label" htmlFor="gf-tutor">מורה</label>
            <select id="gf-tutor" className="select" value={g.tutorId} onChange={(e) => set({ tutorId: e.target.value })}><option value="">בחרו מורה</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><Err k="tutorId" /></>
        ) : null}
        <label className="field-label" htmlFor="gf-title">מטרת הקבוצה</label>
        <input id="gf-title" className="input" placeholder="למשל: מרתון לבגרות 472" value={g.title} onChange={(e) => set({ title: e.target.value })} />
        <Err k="title" />
        <div className="f2">
          <div><label className="field-label" htmlFor="gf-subject">מקצוע</label><select id="gf-subject" className="select" value={g.subject} onChange={(e) => set({ subject: e.target.value })}>{[...SUBJECTS, 'פסיכומטרי'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="field-label" htmlFor="gf-level">רמה</label><select id="gf-level" className="select" value={g.level} onChange={(e) => set({ level: e.target.value })}><option value="">לא משנה</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        </div>
        <label className="field-label" htmlFor="gf-desc">מה עושים בקבוצה</label>
        <textarea id="gf-desc" className="input" rows={4} maxLength={1500} placeholder="נושאים, למי זה מתאים, מה מקבלים (הקלטה, דפי תרגול)…" value={g.description} onChange={(e) => set({ description: e.target.value })} />
      </fieldset>
      <fieldset>
        <legend>מתי ואיפה</legend>
        <div className="f3">
          <div><label className="field-label" htmlFor="gf-date">תאריך (מפגש ראשון)</label><input id="gf-date" className="input" type="date" value={g.startDate} onChange={(e) => set({ startDate: e.target.value })} /><Err k="startDate" /></div>
          <div><label className="field-label" htmlFor="gf-time">שעות או ימים</label><input id="gf-time" className="input" placeholder="למשל: 09:00–15:00 או ימי ג׳ 18:00" value={g.time} onChange={(e) => set({ time: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="gf-sess">מספר מפגשים</label><input id="gf-sess" className="input" type="number" min="1" max="100" value={g.sessions} onChange={(e) => set({ sessions: e.target.value })} /></div>
        </div>
        <span className="field-label" id="gf-mode">איך מתקיימת</span>
        <Seg label="gf-mode" value={g.mode} onChange={(mode) => set({ mode })} options={[['online', 'אונליין'], ['frontal', 'פרונטלית']]} />
        {g.mode === 'frontal' ? (
          <div className="f2">
            <div><label className="field-label" htmlFor="gf-city">עיר</label><select id="gf-city" className="select" value={g.city} onChange={(e) => set({ city: e.target.value })}><option value="">בחרו עיר</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select><Err k="city" /></div>
            <div><label className="field-label" htmlFor="gf-loc">כתובת או מקום</label><input id="gf-loc" className="input" placeholder="למשל: מתנ״ס בן גוריון" value={g.location} onChange={(e) => set({ location: e.target.value })} /></div>
          </div>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>מחיר ומקומות</legend>
        <div className="f2">
          <div><label className="field-label" htmlFor="gf-price">מחיר לתלמיד{Number(g.sessions) > 1 ? ' לכל מפגש' : ''} (₪)</label><input id="gf-price" className="input" type="number" min="0" inputMode="numeric" value={g.pricePerPerson} onChange={(e) => set({ pricePerPerson: e.target.value })} /><Err k="pricePerPerson" /></div>
          <div><label className="field-label" htmlFor="gf-seats">מספר מקומות</label><input id="gf-seats" className="input" type="number" min="1" max="200" value={g.maxSeats} onChange={(e) => set({ maxSeats: e.target.value })} /><Err k="maxSeats" /></div>
        </div>
      </fieldset>
      <div className="form-actions sticky-actions">
        <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : initial ? 'שמירת השינויים' : 'פרסום הקבוצה'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  );
}

function MySeats() {
  const { api, user, groups, version } = useApp();
  const [seats, loading] = useLoad(() => api.mySeats(), [user.id, version]);
  if (loading && !seats) return <Loading />;
  const list = (seats || []).map((s) => ({ s, g: (groups || []).find((g) => g.id === s.groupId) })).filter((x) => x.g);
  if (!list.length) return <Empty title="עוד לא נרשמתם לקבוצה"><a className="btn btn-brand" href="#groups">לקבוצות הלמידה</a></Empty>;
  return (
    <div className="admin-list">
      {list.map(({ s, g }) => (
        <article key={s.id} className="admin-item">
          <div className="ai-main">
            <a className="t-name" href={`#group-${g.id}`}>{g.title}</a>
            <p className="t-meta">{dateLong(g.startDate)} · {g.time} · {g.mode === 'online' ? 'אונליין' : g.location || g.city} · עם {g.tutor?.name}</p>
          </div>
          <div className="ai-actions"><a className="btn btn-line btn-sm" href={`#group-${g.id}`}>לעמוד הקבוצה</a></div>
        </article>
      ))}
    </div>
  );
}

function AdminTutors() {
  const { api, tutors, reload, notify } = useApp();
  const [editing, setEditing] = useState(null); // null | 'new' | tutor (with phone)
  const [q, setQ] = useState('');
  const list = useMemo(() => (tutors || []).filter((t) => !q || t.name.includes(q) || (t.city || '').includes(q)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [tutors, q]);

  if (editing) {
    return <TutorForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)}
      onSaved={() => { setEditing(null); reload(); notify(editing === 'new' ? 'המורה נוסף לאתר' : 'הפרטים נשמרו'); }} />;
  }
  return (
    <div className="my-groups">
      <div className="mg-head">
        <input className="input" type="search" aria-label="חיפוש מורה" placeholder="חיפוש לפי שם או עיר…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn btn-brand" onClick={() => setEditing('new')}>+ הוספת מורה</button>
      </div>
      <p className="muted-text">{tutors ? `${tutors.length} מורים באתר` : ''}</p>
      {!tutors ? <Loading /> : (
        <div className="admin-list">
          {list.map((t) => (
            <article key={t.id} className="admin-item">
              <Avatar tutor={t} className="ai-photo" size={56} />
              <div className="ai-main">
                <a className="t-name" href={`#tutor-${t.id}`}>{t.name}</a> <Verified tutor={t} />
                <p className="t-meta">{(t.subjects || []).join(', ')} · {t.city || 'אונליין'} · {[t.teachesFrontal && t.priceFrontal ? `פרונטלי ${money(t.priceFrontal)}` : '', t.teachesOnline && t.priceOnline ? `אונליין ${money(t.priceOnline)}` : ''].filter(Boolean).join(' · ')}</p>
                <Stars avg={t.ratingAvg} count={t.ratingCount} compact />
              </div>
              <div className="ai-actions">
                <button type="button" className="btn btn-line btn-sm" onClick={async () => { try { setEditing(await api.getTutorForEdit(t.id)); } catch (e) { notify(e.message, true); } }}>עריכה</button>
                <ConfirmButton confirmText="למחוק את המורה?" onConfirm={async () => { try { await api.deleteTutor(t.id); reload(); notify('המורה נמחק'); } catch (e) { notify(e.message, true); } }}>מחיקה</ConfirmButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
