import { useEffect, useMemo, useState } from 'react';
import { useApp, useLoad, useMyTutor, go } from '../state.jsx';
import { SUBJECTS, LEVELS, CITIES, GOALS, LESSON_COUNTS, labelOf } from '../data/constants.js';
import { money, dateShort, dateLong, normalizePhone, isPhone } from '../lib/format.js';
import { Avatar, Chips, Seg, ConfirmButton, Verified, Stars, Loading, Empty, Coin, StatusTag, InquiryChat, VIA, viaOf, WeekGrid } from '../components/ui.jsx';
import { subtopicsOf } from '../data/topics.js';

// Tutor-only tabs are hidden from students; a student sees only their own inquiries and details.
const TUTOR_TABS = ['panel', 'panel-inbox', 'panel-groups'];
const TABS = [
  ['panel', 'הפרופיל שלי'],
  ['panel-inbox', 'פניות מתלמידים'],
  ['panel-groups', 'קבוצות למידה'],
  ['panel-seats', 'הפניות וההרשמות שלי'],
  ['panel-me', 'הפרטים שלי'],
  ['panel-admin', 'ניהול מורים'],
];

export default function Panel() {
  const { user, setLoginOpen } = useApp();
  if (!user) {
    return (
      <main className="wrap page-pad">
        <div className="panel-gate">
          <Coin size={56} />
          <h1>פאנל מורה</h1>
          <p className="muted-text">כאן פותחים פרופיל מורה, מעדכנים מחירים ומיקום, ומעלים קבוצות למידה ומרתונים. מתחילים בכניסה עם Google.</p>
          <ul className="check-list">
            <li>פרופיל עם מקצועות, רמות, מיקום ומחיר פרונטלי ואונליין</li>
            <li>פניות מתלמידים מגיעות לתיבה אישית בפאנל, בלי לחשוף את הטלפון שלכם ובלי עמלה</li>
            <li>קבוצות עם הרשמה, שמירת מקום ושאלות מתלמידים</li>
          </ul>
          <button type="button" className="btn btn-brand go" onClick={() => setLoginOpen(true)}>כניסה עם Google</button>
        </div>
      </main>
    );
  }
  return <PanelTabs />;
}

function FreshBadge() {
  const { user, api, version } = useApp();
  const [inbox] = useLoad(() => api.tutorInquiries().catch(() => []), [user.id, version]);
  const fresh = (inbox || []).filter((q) => q.status === 'new').length;
  return fresh ? <span className="badge"><bdi>{fresh}</bdi></span> : null;
}

function PanelTabs() {
  const { user, route } = useApp();
  const [mine, loading] = useMyTutor();
  const isTutor = !!mine;
  const tabs = TABS.filter(([k]) => (k !== 'panel-admin' || user.isAdmin) && (isTutor || !TUTOR_TABS.includes(k)));
  // A student who opened "פתיחת פרופיל מורה" (#panel) gets the sign-up form, without the tutor tabs.
  const becoming = !isTutor && route.name === 'panel';
  const tab = tabs.some(([k]) => k === route.name) ? route.name : becoming ? 'panel' : isTutor ? 'panel' : 'panel-seats';
  // On phones the tab row scrolls sideways: keep the open tab in view.
  useEffect(() => { document.querySelector('.tabs [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [tab]);
  if (loading && mine == null) return <main className="wrap page-pad"><Loading /></main>;
  return (
    <main className="wrap page-pad">
      <div className="page-head"><h1>האזור האישי</h1><p className="muted-text">שלום {user.name}{user.isAdmin ? ' · מנהל/ת האתר' : ''}</p></div>
      <nav className="tabs" aria-label="פאנל">
        {tabs.map(([k, label]) => <a key={k} href={'#' + k} aria-current={tab === k ? 'page' : undefined}>{label}{k === 'panel-inbox' ? <FreshBadge /> : null}</a>)}
      </nav>
      {tab === 'panel' && <MyProfile />}
      {tab === 'panel-inbox' && <Inbox />}
      {tab === 'panel-groups' && <MyGroups />}
      {tab === 'panel-seats' && <MySeats />}
      {tab === 'panel-seats' && !isTutor ? <p className="become-tutor muted-text">מלמדים בעצמכם? <a href="#panel">פתיחת פרופיל מורה</a></p> : null}
      {tab === 'panel-me' && <MyDetails />}
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
          <p>טלפון (לא מוצג לתלמידים): <bdi>{mine.phone}</bdi></p>
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
      <div><b><bdi>{contactCount || 0}</bdi></b><span>פניות מתלמידים</span></div>
      <div><b><bdi>{t?.ratingCount || 0}</bdi></b><span>ביקורות{t?.ratingCount ? ` · ממוצע ${t.ratingAvg.toFixed(1)}` : ''}</span></div>
      <div><b><bdi>{g.reduce((a, x) => a + x.seatsTaken, 0)}</bdi></b><span>נרשמים בקבוצות שלי</span></div>
    </div>
  );
}

const MODE_LABEL = { online: 'אונליין', frontal: 'פרונטלי', '': 'לא משנה' };

function Inbox() {
  const { api, user, version, reload, notify } = useApp();
  const [list, loading, error] = useLoad(() => api.tutorInquiries(), [user.id, version]);
  const [filter, setFilter] = useState('open');
  if (loading && !list) return <Loading />;
  if (error) return <p className="err">{error.message}</p>;
  const all = list || [];
  const shown = all.filter((q) => (filter === 'open' ? q.status === 'new' || q.status === 'replied' : filter === 'all' ? true : q.status === filter));
  const n = (st) => all.filter((q) => q.status === st).length;
  return (
    <div className="inbox">
      <p className="muted-text">תלמידים שולחים לכם פנייה מהפרופיל. הטלפון שלכם לא מוצג באתר. עונים בצ׳אט כאן, או בטלפון ובמייל אם התלמיד בחר לשתף אותם.</p>
      <div className="chips wrap-chips" role="group" aria-label="סינון פניות">
        {[['open', `פתוחות (${n('new') + n('replied')})`], ['new', `חדשות (${n('new')})`], ['booked', `נקבע שיעור (${n('booked')})`], ['declined', `לא מתאים (${n('declined')})`], ['all', `הכול (${all.length})`]].map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {!all.length ? (
        <Empty title="עוד אין פניות"><p>כשתלמיד ישלח פנייה מהפרופיל שלכם, היא תופיע כאן.</p></Empty>
      ) : !shown.length ? <p className="muted-text">אין פניות בסינון הזה.</p> : (
        <div className="inq-list">
          {shown.map((q) => <InquiryItem key={q.id} q={q} showTutor={user.isAdmin} onChange={async (patch, msg) => {
            try { await api.answerInquiry(q.id, patch); notify(msg); reload(); } catch (e) { notify(e.message, true); }
          }} />)}
        </div>
      )}
    </div>
  );
}

function InquiryItem({ q, onChange, showTutor }) {
  const via = viaOf(q);
  const first = q.name.split(' ')[0];
  const wa = q.phone ? `https://wa.me/${normalizePhone(q.phone)}?text=${encodeURIComponent(`היי ${first}, כאן ${q.tutor?.name || ''} מנפל האסימון. קיבלתי את הפנייה שלך.`)}` : '';
  const mail = q.email ? `mailto:${q.email}?subject=${encodeURIComponent('הפנייה שלך בנפל האסימון')}` : '';
  return (
    <article className={'inq' + (q.status === 'new' ? ' is-new' : '')}>
      <div className="inq-top">
        <b className="inq-name">{q.name}</b>
        <StatusTag status={q.status} />
        <span className="muted-text inq-date">{dateShort(q.createdAt)}</span>
      </div>
      <p className="t-meta">{[q.subject, q.level, q.mode != null ? MODE_LABEL[q.mode] : ''].filter(Boolean).join(' · ')}{showTutor && q.tutor ? ` · אל ${q.tutor.name}` : ''}</p>
      {q.goal || q.lessons ? <p className="inq-tags">{q.goal ? <span className="tag">{labelOf(GOALS, q.goal)}</span> : null}{q.lessons ? <span className="tag">{labelOf(LESSON_COUNTS, q.lessons)}</span> : null}</p> : null}
      <p className="via-line">מעדיף/ה: {VIA.filter(([v]) => via.includes(v)).map(([, l]) => l).join(' · ')}</p>
      <InquiryChat q={q} asTutor />
      <div className="inq-actions">
        {wa ? <a className="btn btn-wa btn-sm" href={wa} target="_blank" rel="noreferrer">וואטסאפ</a> : null}
        {q.phone ? <a className="btn btn-line btn-sm" href={`tel:${q.phone.replace(/[^\d+]/g, '')}`}><bdi>{q.phone}</bdi></a> : null}
        {mail ? <a className="btn btn-line btn-sm" href={mail}><bdi>{q.email}</bdi></a> : null}
        {q.status !== 'booked' ? <button type="button" className="btn btn-line btn-sm" onClick={() => onChange({ status: 'booked' }, 'סומן: נקבע שיעור')}>נקבע שיעור ✓</button> : null}
        {q.status !== 'declined' ? <button type="button" className="linkish small" onClick={() => onChange({ status: 'declined' }, 'הפנייה סומנה כלא מתאימה')}>לא מתאים</button>
          : <button type="button" className="linkish small" onClick={() => onChange({ status: q.messageCount || q.reply ? 'replied' : 'new' }, 'הפנייה הוחזרה לפתוחות')}>החזרה לפתוחות</button>}
      </div>
    </article>
  );
}

/** Saved contact details: filled in automatically when contacting a tutor or joining a group. */
function MyDetails() {
  const { api, user, notify } = useApp();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { notify('כתבו שם', true); return; }
    if (f.phone.trim() && !isPhone(f.phone)) { notify('בדקו את מספר הטלפון, למשל 050-1234567', true); return; }
    setBusy(true);
    try { await api.saveMyContact({ name: f.name.trim(), phone: f.phone.trim() }); notify('הפרטים נשמרו'); } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  return (
    <form className="details-form" onSubmit={save}>
      <p className="muted-text">הפרטים האלה ימולאו לבד כשתפנו למורה או תירשמו לקבוצה. הם לא מוצגים באתר. מורה רואה את הטלפון שלכם רק אם בחרתם לשתף אותו בפנייה.</p>
      <label className="field-label" htmlFor="me-name">שם</label>
      <input id="me-name" className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label className="field-label" htmlFor="me-phone">טלפון</label>
      <input id="me-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" placeholder="050-1234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <span className="field-label">מייל</span>
      <p className="me-email"><bdi>{user.email || 'לא ידוע'}</bdi> <small className="muted-text">מחשבון Google</small></p>
      <div className="form-actions"><button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : 'שמירת הפרטים'}</button></div>
    </form>
  );
}

const EMPTY_TUTOR = {
  name: '', photo: '', headline: '', about: '', subjects: ['מתמטיקה'], levels: [], topics: [], city: '', area: '',
  teachesFrontal: true, priceFrontal: '', teachesOnline: true, priceOnline: '', experienceYears: '', phone: '', verified: false, availability: [],
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
          <div><label className="field-label" htmlFor="tf-phone">טלפון (לא מוצג באתר, רק לצוות)</label><input id="tf-phone" className="input" dir="ltr" inputMode="tel" placeholder="050-1234567" value={t.phone} onChange={(e) => set({ phone: e.target.value })} /><Err k="phone" /></div>
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
        <Chips multi label="tf-subj" options={[...SUBJECTS, 'פסיכומטרי']} value={t.subjects}
          onChange={(subjects) => {
            // Removing a subject also removes the sub-topics that belong only to it.
            const keep = new Set(subjects.flatMap(subtopicsOf));
            set({ subjects, topics: (t.topics || []).filter((x) => keep.has(x) || !(t.subjects || []).some((s) => subtopicsOf(s).includes(x))) });
          }} />
        <Err k="subjects" />
        <span className="field-label" id="tf-lvl">רמות</span>
        <Chips multi label="tf-lvl" options={LEVELS} value={t.levels} onChange={(levels) => set({ levels })} />
        <Err k="levels" />
        {(t.subjects || []).length ? (
          <>
            <span className="field-label">תתי נושאים <small className="muted-text">(לא חובה: סמנו מה אתם מלמדים בכל מקצוע, כך תלמידים ימצאו אתכם)</small></span>
            {t.subjects.map((s) => {
              const opts = subtopicsOf(s);
              if (!opts.length) return null;
              const idL = `tf-sub-${SUBJECTS.indexOf(s)}`;
              return (
                <div key={s} className="subtopic-group">
                  <span className="subtopic-title" id={idL}>{s}</span>
                  <Chips multi label={idL} options={opts} value={(t.topics || []).filter((x) => opts.includes(x))}
                    onChange={(mine) => set({ topics: [...(t.topics || []).filter((x) => !opts.includes(x)), ...mine] })} />
                </div>
              );
            })}
          </>
        ) : null}
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

      <fieldset>
        <legend>שעות פנויות</legend>
        <p className="muted-text small">סמנו את השעות שבהן אתם פנויים בדרך כלל. התלמידים יראו את הטבלה בפרופיל ויבחרו מתוכה כשהם פונים אליכם.</p>
        <WeekGrid mode="edit" value={t.availability || []} onChange={(availability) => set({ availability })} label="שעות פנויות במהלך השבוע" />
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
                <p className="ai-seats"><b><bdi>{g.seatsTaken}</bdi></b> מתוך <bdi>{g.maxSeats}</bdi> מקומות תפוסים · {g.joinMode === 'approval' ? 'באישור המורה' : 'פתוחה'}{g.pendingCount ? <b className="pending-note"> · {g.pendingCount} ממתינים לאישור</b> : null}</p>
              </div>
              <div className="ai-actions">
                <button type="button" className="btn btn-line btn-sm" onClick={() => setOpenSeats(openSeats === g.id ? null : g.id)} aria-expanded={openSeats === g.id}>{g.pendingCount ? 'אישור נרשמים' : 'נרשמים'}</button>
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

const SEAT_STATUS = { approved: ['מאושר/ת', 'st-booked'], pending: ['ממתין/ה לאישור', 'st-new'], declined: ['נדחה', 'st-declined'] };

function SeatList({ groupId }) {
  const { api, version, reload, notify } = useApp();
  const [seats, loading, error] = useLoad(() => api.listGroupSeats(groupId), [groupId, version]);
  if (loading && !seats) return <Loading />;
  if (error) return <p className="err">{error.message}</p>;
  if (!seats.length) return <p className="muted-text seat-list">עוד אין נרשמים.</p>;
  const set = async (s, status, msg) => { try { await api.setSeatStatus(s.id, status); notify(msg); reload(); } catch (e) { notify(e.message, true); } };
  const order = { pending: 0, approved: 1, declined: 2 };
  return (
    <div className="seat-list">
      <table>
        <thead><tr><th>שם</th><th>טלפון</th><th>הערה</th><th>סטטוס</th><th><span className="sr-only">פעולות</span></th></tr></thead>
        <tbody>{[...seats].sort((a, b) => order[a.status] - order[b.status]).map((s) => (
          <tr key={s.id} className={s.status === 'pending' ? 'is-new' : ''}>
            <td>{s.name}<br /><small className="muted-text">{dateShort(s.createdAt)}</small></td>
            <td><bdi>{s.phone}</bdi></td>
            <td>{s.note || '—'}</td>
            <td><StatusTag status={s.status} map={SEAT_STATUS} /></td>
            <td className="seat-acts">
              {s.status !== 'approved' ? <button type="button" className="btn btn-brand btn-sm" onClick={() => set(s, 'approved', `${s.name} אושר/ה לקבוצה`)}>אישור</button> : null}
              {s.status === 'pending' ? <button type="button" className="btn btn-line btn-sm" onClick={() => set(s, 'declined', 'הבקשה נדחתה')}>דחייה</button> : null}
              {s.status === 'approved' ? <button type="button" className="linkish small" onClick={() => set(s, 'declined', `${s.name} הוצא/ה מהקבוצה`)}>הוצאה</button> : null}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const EMPTY_GROUP = { tutorId: '', title: '', subject: 'מתמטיקה', level: '', description: '', startDate: '', time: '', sessions: 1, mode: 'online', city: '', location: '', pricePerPerson: '', maxSeats: 8, joinMode: 'open' };

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
      const { tutor, seatsTaken, pendingCount, ...clean } = g; void tutor; void seatsTaken; void pendingCount;
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
      <fieldset>
        <legend>מי יכול להצטרף</legend>
        <span className="sr-only" id="gf-join">אופן ההצטרפות</span>
        <Seg label="gf-join" value={g.joinMode || 'open'} onChange={(joinMode) => set({ joinMode })} options={[['open', 'פתוחה לכולם'], ['approval', 'באישור שלי']]} />
        <p className="hint">{(g.joinMode || 'open') === 'open' ? 'כל מי שנרשם נכנס מיד לקבוצה, עד שהמקומות נגמרים.' : 'תלמידים שולחים בקשה, ואתם מאשרים או דוחים כל אחד בפאנל. רק מאושרים תופסים מקום.'}</p>
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
  const [inqs, loadingQ] = useLoad(() => api.myInquiries(), [user.id, version]);
  if ((loading && !seats) || (loadingQ && !inqs)) return <Loading />;
  const list = (seats || []).map((s) => ({ s, g: (groups || []).find((g) => g.id === s.groupId) })).filter((x) => x.g);
  return (
    <div className="my-requests">
      <section>
        <h2 className="sub-h">פניות ששלחתי למורים</h2>
        {!(inqs || []).length ? <p className="muted-text">עוד לא שלחתם פנייה. <a href="#search">חיפוש מורה</a></p> : (
          <div className="inq-list">
            {inqs.map((q) => (
              <article key={q.id} className="inq">
                <div className="inq-top">
                  {q.tutor ? <a className="inq-name t-name" href={`#tutor-${q.tutorId}`}>{q.tutor.name}</a> : <b className="inq-name">מורה שהוסר/ה</b>}
                  <StatusTag status={q.status} />
                  <span className="muted-text inq-date">{dateShort(q.createdAt)}</span>
                </div>
                {q.status === 'new' && !q.messageCount ? <p className="hint">המורה עוד לא ענה. בינתיים אפשר להוסיף הודעה.</p> : null}
                <InquiryChat q={q} />
              </article>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="sub-h">קבוצות שנרשמתי אליהן</h2>
        {!list.length ? <p className="muted-text">עוד לא נרשמתם לקבוצה. <a href="#groups">לקבוצות הלמידה</a></p> : (
          <div className="admin-list">
            {list.map(({ s, g }) => (
              <article key={s.id} className="admin-item">
                <div className="ai-main">
                  <a className="t-name" href={`#group-${g.id}`}>{g.title}</a> <StatusTag status={s.status} map={SEAT_STATUS} />
                  <p className="t-meta">{dateLong(g.startDate)} · {g.time} · {g.mode === 'online' ? 'אונליין' : g.location || g.city} · עם {g.tutor?.name}</p>
                </div>
                <div className="ai-actions"><a className="btn btn-line btn-sm" href={`#group-${g.id}`}>לעמוד הקבוצה</a></div>
              </article>
            ))}
          </div>
        )}
      </section>
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
