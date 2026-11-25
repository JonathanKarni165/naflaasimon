import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useLoad, useMyTutor, go, to } from '../state.jsx';
import { SUBJECTS, CITIES, GOALS, LESSON_COUNTS, labelOf, WEEK_DAYS, WEEK_DAY_NAMES } from '../data/constants.js';
import { money, dateShort, dateLong, isPhone, weekdayMismatch } from '../lib/format.js';
import { Avatar, Chips, Seg, ConfirmButton, Verified, Stars, Loading, Empty, Coin, SpamNote, StatusTag, InquiryChat, ChatOverlay, WaButton, VIA, viaOf, WeekGrid, ReportTutor, REPORT_REASONS, BirthDateInput, TermsCheck, TERMS_ERROR, declinedSeen, markDeclinedSeen, isDeclineSeen } from '../components/ui.jsx';
import { checkText, MESSAGES } from '../lib/moderation.js';
import AdminStats from './Stats.jsx';
import { subtopicsOf, schoolCoursesOf, TOPICS } from '../data/topics.js';

// Two separate areas: "תלמיד" (my conversations and sign-ups) and "מורה" (my profile, inquiries, groups).
// Personal details belong to both; admins get a third area.
const PRICE_MIN = 40, PRICE_MAX = 500;
const TUTOR_TABS = ['panel', 'panel-inbox', 'panel-groups'];
const TABS = [
  ['panel', 'פרופיל המורה שלי'],
  ['panel-inbox', 'פניות מתלמידים'],
  ['panel-groups', 'הקבוצות שלי'],
  ['panel-seats', 'השיחות וההרשמות שלי'],
  ['panel-me', 'הפרטים האישיים שלי'],
  ['panel-admin', 'אישור וניהול מורים'],
  ['panel-reports', 'דיווחים'],
  ['panel-stats', 'סטטיסטיקות'],
];
const ADMIN_TABS = ['panel-admin', 'panel-reports', 'panel-stats'];
const AREAS = {
  student: { label: 'פאנל תלמיד', home: 'panel-seats', tabs: ['panel-seats', 'panel-me'] },
  tutor: { label: 'פאנל מורה', home: 'panel', tabs: ['panel', 'panel-inbox', 'panel-groups', 'panel-me'] },
  admin: { label: 'ניהול האתר', home: 'panel-admin', tabs: ['panel-admin', 'panel-reports', 'panel-stats'] },
};

export default function Panel() {
  const { user, setLoginOpen } = useApp();
  if (!user) {
    return (
      <main className="wrap page-pad">
        <div className="panel-gate">
          <Coin size={56} />
          <h1>פאנל מורה</h1>
          <p className="muted-text">כאן פותחים פרופיל מורה, מעדכנים מחירים ומיקום, ומעלים קבוצות למידה ומרתונים. מתחילים בכניסה לחשבון, עם Google או עם מייל וסיסמה.</p>
          <ul className="check-list">
            <li>פרופיל עם מקצועות, רמות, מיקום ומחיר פרונטלי ואונליין</li>
            <li>פניות מתלמידים מגיעות לתיבה אישית בפאנל, בלי לחשוף את הטלפון שלכם ובלי עמלה</li>
            <li>קבוצות עם הרשמה, שמירת מקום ושאלות מתלמידים</li>
          </ul>
          <button type="button" className="btn btn-brand go" onClick={() => setLoginOpen(true)}>כניסה / הרשמה</button>
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
  const [mine, loading, , , loaded] = useMyTutor();
  const isTutor = !!mine;
  // A student who opened "פתיחת פרופיל מורה" (#panel) gets the sign-up form, without the tutor tabs.
  const becoming = !isTutor && route.name === 'panel';
  // #chat-<inquiry id> opens that one conversation inside "השיחות וההרשמות שלי".
  const allowed = (k) => (!ADMIN_TABS.includes(k) || user.isAdmin) && (isTutor || !TUTOR_TABS.includes(k) || (becoming && k === 'panel'));
  const wanted = route.name === 'chat' ? 'panel-seats' : TABS.some(([k]) => k === route.name) && allowed(route.name) ? route.name : becoming ? 'panel' : isTutor ? 'panel' : 'panel-seats';
  const tab = wanted;
  // Personal details are shared, so remember which area the person came from.
  const readLast = () => { try { return sessionStorage.getItem('naflaasimon-area') || ''; } catch { return ''; } };
  let area = ADMIN_TABS.includes(tab) ? 'admin' : TUTOR_TABS.includes(tab) ? 'tutor' : tab === 'panel-seats' ? 'student' : (readLast() || (isTutor ? 'tutor' : 'student'));
  if (area === 'tutor' && !isTutor && !becoming) area = 'student';
  useEffect(() => { try { if (tab !== 'panel-me') sessionStorage.setItem('naflaasimon-area', area); } catch { /* private mode */ } }, [area, tab]);
  const areaKeys = ['student', ...(isTutor || becoming ? ['tutor'] : []), ...(user.isAdmin ? ['admin'] : [])];
  const tabs = TABS.filter(([k]) => AREAS[area].tabs.includes(k) && allowed(k));
  // On phones the tab row scrolls sideways: keep the open tab in view.
  useEffect(() => { document.querySelector('.tabs [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [tab]);
  if (loading && mine == null && !loaded) return <main className="wrap page-pad"><Loading /></main>;
  return (
    <main className="wrap page-pad">
      <div className="page-head"><h1>האזור האישי</h1><p className="muted-text">שלום {user.name}{user.isAdmin ? ' · ניהול האתר' : ''}</p></div>
      {areaKeys.length > 1 ? (
        <nav className="area-switch" aria-label="אזורים">
          {areaKeys.map((k) => <a key={k} href={to(AREAS[k].home)} aria-current={area === k ? 'page' : undefined}>{AREAS[k].label}</a>)}
        </nav>
      ) : null}
      <nav className="tabs" aria-label={AREAS[area].label}>
        {tabs.map(([k, label]) => <a key={k} href={to(k)} aria-current={tab === k ? 'page' : undefined}>{label}{k === 'panel-inbox' ? <FreshBadge /> : null}</a>)}
      </nav>
      {tab === 'panel' && <MyProfile />}
      {tab === 'panel-inbox' && <Inbox />}
      {tab === 'panel-groups' && <MyGroups />}
      {tab === 'panel-seats' && <MySeats openId={route.name === 'chat' ? route.id : null} />}
      {tab === 'panel-me' && <MyDetails />}
      {tab === 'panel-admin' && <AdminTutors />}
      {tab === 'panel-reports' && <AdminReports />}
      {tab === 'panel-stats' && <AdminStats />}
    </main>
  );
}

function MyProfile() {
  const { api, user, version, reload, notify } = useApp();
  const [mine, loading, , refresh, loaded] = useLoad(() => api.getMyTutor(), [user.id, version]);
  const [editing, setEditing] = useState(false);
  if (loading && !mine && !loaded) return <Loading />;
  if (!mine && !editing) {
    return (
      <div className="panel-empty">
        <h2>עוד אין לכם פרופיל מורה</h2>
        <p className="muted-text">זה לוקח בערך חמש דקות. כל הפרטים חובה (שם מלא, תאריך לידה, טלפון, כתובת ותמונה), והצוות שלנו מאשר כל פרופיל חדש לפני שהוא מופיע בחיפוש.</p>
        <button type="button" className="btn btn-brand" onClick={() => setEditing(true)}>פתיחת פרופיל מורה</button>
      </div>
    );
  }
  if (editing || !mine) {
    return (
      <TutorForm initial={mine} forSelf
        onCancel={() => setEditing(false)}
        onSaved={(t) => { setEditing(false); refresh(); reload(); notify(!mine ? 'הפרופיל נשלח לאישור. נעדכן במייל ברגע שיאושר' : t?.pending ? 'הפרופיל עודכן. השינויים בתמונה או בתיאור יופיעו באתר אחרי בדיקה של הצוות' : 'הפרופיל עודכן'); }} />
    );
  }
  return (
    <div className="my-profile">
      {mine.approval === 'pending' ? <p className="note approval-note" role="status"><b>הפרופיל ממתין לאישור.</b> הצוות בודק אותו, בדרך כלל תוך יום עסקים. עד אז הוא לא מופיע בחיפוש ואי אפשר לפתוח קבוצות.</p> : null}
      {mine.approval === 'approved' && mine.pending ? <p className="note approval-note" role="status"><b>השינויים שלכם ממתינים לבדיקה.</b> שיניתם {pendingLabel(mine.pending)}. הצוות יבדוק בקרוב, ועד אז תלמידים רואים את הגרסה הקודמת.</p> : null}
      {mine.approval === 'rejected' ? <p className="note approval-note bad" role="status"><b>הפרופיל לא אושר.</b> {mine.rejectReason ? `סיבה: ${mine.rejectReason}. ` : ''}תקנו את הפרטים ושמרו, והוא יחזור לבדיקה.</p> : null}
      <div className="mp-card">
        <Avatar tutor={mine} className="mp-photo" />
        <div>
          <h2>{mine.name} <Verified tutor={mine} /></h2>
          <p className="muted-text">{mine.headline}</p>
          <p>{(mine.subjects || []).join(', ')}{(mine.topics || []).length ? ` · ${mine.topics.slice(0, 6).join(', ')}` : ''}</p>
          <p>{mine.teachesFrontal && mine.priceFrontal ? `פרונטלי ${money(mine.priceFrontal)} ב${mine.city}` : ''}{mine.teachesFrontal && mine.teachesOnline ? ' · ' : ''}{mine.teachesOnline && mine.priceOnline ? `אונליין ${money(mine.priceOnline)}` : ''}</p>
          <p>טלפון (לא מוצג לתלמידים): <bdi>{mine.phone}</bdi></p>
          {mine.address ? <p>כתובת (לא מוצגת לתלמידים): {mine.address}</p> : null}
          <div className="form-actions">
            <button type="button" className="btn btn-brand" onClick={() => setEditing(true)}>עריכה</button>
            <a className="btn btn-line" href={to(`tutor-${mine.id}`)}>איך תלמידים רואים אותי</a>
            <a className="btn btn-line" href={to('panel-groups')}>פתיחת קבוצה</a>
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

function GuestInbox() {
  const { api, user, version, notify, tutors } = useApp();
  const tutorName = (id) => (tutors || []).find((t) => t.id === id)?.name || 'המורה';
  const [list, , , refresh] = useLoad(() => (api.tutorGuestRequests ? api.tutorGuestRequests() : []), [user.id, version]);
  const open = (list || []).filter((g) => g.status === 'new');
  if (!open.length) return null;
  const done = async (g) => { try { await api.setGuestStatus(g.id, 'done'); notify('סומן כטופל'); refresh(); } catch (e) { notify(e.message, true); } };
  return (
    <section className="pending-box" aria-label="פניות מאנשים בלי חשבון">
      <h2>פניות בלי חשבון ({open.length})</h2>
      <p className="muted-text">אנשים שהשאירו טלפון בלי להירשם. חזרו אליהם בטלפון או בוואטסאפ, ובפעם הבאה אפשר להמליץ להם על חשבון.</p>
      <div className="admin-list">
        {open.map((g) => (
          <article key={g.id} className="admin-item">
            <div className="ai-main">
              <b>{g.name}</b> <a href={`tel:${g.phone}`} dir="ltr"><bdi>{g.phone}</bdi></a>{g.email ? <> · <bdi>{g.email}</bdi></> : null}
              <p className="t-meta">{g.groupTitle ? `לקבוצה "${g.groupTitle}" · ` : ''}{dateShort(g.createdAt)}</p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{g.message}</p>
            </div>
            <div className="ai-actions">
              <WaButton phone={g.phone} text={`היי ${g.name.split(' ')[0]}, כאן ${tutorName(g.tutorId)} מנפל האסימון. קיבלתי את הפנייה שלך${g.groupTitle ? ` לקבוצה "${g.groupTitle}"` : ''}.`} />
              <button type="button" className="btn btn-line btn-sm" onClick={() => done(g)}>סימון כטופל</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Inbox() {
  const { api, user, version, reload, notify } = useApp();
  const [list, loading, error] = useLoad(() => api.tutorInquiries(), [user.id, version]);
  const [filter, setFilter] = useState('open');
  const [openId, setOpenId] = useState(null);
  if (loading && !list) return <Loading />;
  if (error) return <p className="err">{error.message}</p>;
  const all = list || [];
  const byRecent = (a, b) => (b.lastAt || b.createdAt || '').localeCompare(a.lastAt || a.createdAt || ''); // newest message first
  const shown = all.filter((q) => (filter === 'open' ? q.status === 'new' || q.status === 'replied' : filter === 'all' ? true : q.status === filter)).sort(byRecent);
  const n = (st) => all.filter((q) => q.status === st).length;
  return (
    <div className="inbox">
      <SpamNote who="tutor" />
      <GuestInbox />
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
          {shown.map((q) => <InquiryItem key={q.id} q={q} showTutor={user.isAdmin} open={openId === q.id} onToggle={() => setOpenId(openId === q.id ? null : q.id)} onChange={async (patch, msg) => {
            try { await api.answerInquiry(q.id, patch); notify(msg); reload(); } catch (e) { notify(e.message, true); }
          }} />)}
        </div>
      )}
    </div>
  );
}

/** One inquiry in the inbox: a short row; tapping it opens the conversation (one at a time, so the page stays short). */
const DECLINE_REASONS = ['אין לי זמנים פנויים כרגע', 'הנושא או הרמה לא בתחום שלי', 'המיקום רחוק ממני'];
function InquiryItem({ q, onChange, showTutor, open, onToggle }) {
  const { api, notify } = useApp();
  const ref = useRef(null);
  // "לא מתאים" closes the student's chat, so it asks first and lets the tutor add a short, optional explanation.
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busyDecline, setBusyDecline] = useState(false);
  const decline = async (e) => {
    e.preventDefault();
    setBusyDecline(true);
    try {
      if (reason.trim()) await api.sendInquiryMessage(q.id, reason.trim(), true);
      await onChange({ status: 'declined' }, 'הפנייה סומנה כלא מתאימה. אפשר להחזיר אותה לפתוחות בכל רגע.');
      setDeclining(false); setReason('');
    } catch (err) { notify(err.message, true); }
    setBusyDecline(false);
  };
  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.top < 80 || r.top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: 'smooth' });
  }, [open]);
  const via = viaOf(q);
  const first = q.name.split(' ')[0];
  const waText = `היי ${first}, כאן ${q.tutor?.name || 'המורה'} מנפל האסימון. קיבלתי את הפנייה שלך${q.subject ? ` ב${q.subject}` : ''} ואשמח לתאם שיעור.`;
  const mail = q.email ? `mailto:${q.email}?subject=${encodeURIComponent('הפנייה שלך בנפל האסימון')}` : '';
  return (
    <article ref={ref} className={'inq' + (q.status === 'new' ? ' is-new' : '') + (open ? ' is-open' : '')}>
      <button type="button" className="inq-head" aria-expanded={open} onClick={onToggle}>
        <span className="inq-top">
          <Avatar tutor={{ name: q.name }} className="inq-av" size={64} />
          <b className="inq-name">{q.name}</b>
          <StatusTag status={q.status} />
          <span className="muted-text inq-date">{dateShort(q.createdAt)}</span>
        </span>
        <span className="t-meta">{[q.subject, q.level, q.mode != null ? MODE_LABEL[q.mode] : ''].filter(Boolean).join(' · ')}{showTutor && q.tutor ? ` · אל ${q.tutor.name}` : ''}</span>
        {q.goal || q.lessons ? <span className="inq-tags">{q.goal ? <span className="tag">{labelOf(GOALS, q.goal)}</span> : null}{q.lessons ? <span className="tag">{labelOf(LESSON_COUNTS, q.lessons)}</span> : null}</span> : null}
        {!open ? <span className="inq-preview-line">{(q.message || '').split('\n').slice(1).map((l) => l.trim()).filter(Boolean).join(' · ') || q.message}</span> : null}
        <span className="inq-toggle">{open ? 'פתיחת השיחה' : 'פתיחת השיחה'}</span>
      </button>
      {open ? (<ChatOverlay who={q.name} avatar={{ name: q.name }} status={q.status} onClose={onToggle}>
      <p className="via-line chat-win-info">דרכי קשר מועדפות: {VIA.filter(([v]) => via.includes(v)).map(([, l]) => l).join(' · ')}</p>
      {/* While confirming "לא מתאים" the confirm panel takes the chat's place, so the two never overlap on a phone. */}
      {declining && q.status !== 'declined' ? null : <InquiryChat q={q} asTutor />}
      <div className="inq-actions chat-win-foot">
        <WaButton phone={q.phone} text={waText} />
        {q.phone ? <a className="btn btn-line btn-sm" href={`tel:${q.phone.replace(/[^\d+]/g, '')}`}><bdi>{q.phone}</bdi></a> : null}
        {mail ? <a className="btn btn-line btn-sm" href={mail}><bdi>{q.email}</bdi></a> : null}
        {q.status !== 'booked' ? <button type="button" className="btn btn-line btn-sm" onClick={() => onChange({ status: 'booked' }, 'סומן: נקבע שיעור')}>נקבע שיעור ✓</button> : null}
        {q.status !== 'declined' ? <button type="button" className="linkish small" aria-expanded={declining} onClick={() => { setDeclining(!declining); setTimeout(() => document.querySelector('.decline-box')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50); }}>לא מתאים</button>
          : <button type="button" className="linkish small" onClick={() => onChange({ status: q.messageCount || q.reply ? 'replied' : 'new' }, 'הפנייה הוחזרה לפתוחות')}>החזרה לפתוחות</button>}
      </div>
      {declining && q.status !== 'declined' ? (
        <form className="decline-box" onSubmit={decline}>
          <b>לסמן את הפנייה של {first} כלא מתאימה?</b>
          <p className="hint">תישלח הודעה ל{first}, והשיחה תיסגר. אם תתחרטו, אפשר להחזיר את הפנייה לפתוחות.</p>
          <label className="field-label" htmlFor={`dr-${q.id}`}>הסבר קצר ל{first} (לא חובה)</label>
          <div className="chips decline-chips">{DECLINE_REASONS.map((r) => <button key={r} type="button" className={'chip' + (reason === r ? ' on' : '')} aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)}>{r}</button>)}</div>
          <textarea id={`dr-${q.id}`} className="input" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="למשל: אין לי זמנים פנויים החודש, נסו שוב בינואר" />
          <div className="decline-actions">
            <button type="submit" className="btn btn-brand btn-sm" disabled={busyDecline}>{busyDecline ? 'שולחים…' : 'כן, לא מתאים'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDeclining(false); setReason(''); }}>ביטול</button>
          </div>
        </form>
      ) : null}
      </ChatOverlay>) : null}
    </article>
  );
}

/** Saved contact details: filled in automatically when contacting a tutor or joining a group. */
function MyDetails() {
  const { api, user, notify } = useApp();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', birthDate: user.birthDate || '', area: user.area || '', whatsappOptin: !!user.whatsappOptin });
  const [busy, setBusy] = useState(false);
  const lockName = user.profileDone !== false;
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { notify('כתבו שם', true); return; }
    if (f.phone.trim() && !isPhone(f.phone)) { notify('בדקו את מספר הטלפון, למשל \u2066050-1234567\u2069', true); return; }
    setBusy(true);
    try { await api.saveMyContact({ name: f.name.trim(), phone: f.phone.trim(), birthDate: f.birthDate, area: f.area, whatsappOptin: f.whatsappOptin }); notify('הפרטים נשמרו'); } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  return (
    <>
    <form className="details-form" onSubmit={save}>
      <p className="muted-text">הפרטים האלה ימולאו לבד כשתפנו למורה או תירשמו לקבוצה. הם לא מוצגים באתר. מורה רואה את הטלפון שלכם רק אם בחרתם לשתף אותו בפנייה.</p>
      <label className="field-label" htmlFor="me-name">שם</label>
      <input id="me-name" className="input" autoComplete="name" disabled={lockName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      {lockName ? <p className="hint">שם אי אפשר לשנות אחרי פתיחת החשבון. לתיקון פנו אלינו.</p> : null}
      <label className="field-label" htmlFor="me-phone">טלפון</label>
      <input id="me-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" placeholder="050-1234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <label className="field-label" htmlFor="me-birth">תאריך לידה</label>
      <BirthDateInput id="me-birth" disabled={!!user.birthDate} value={f.birthDate} onChange={(v) => setF((x) => ({ ...x, birthDate: v }))} />
      <p className="hint">{user.birthDate ? 'תאריך לידה אי אפשר לשנות אחרי שנקבע. לתיקון פנו אלינו.' : 'לא חובה. אחרי השמירה אי אפשר לשנות אותו.'}</p>
      <label className="field-label" htmlFor="me-area">אזור מגורים</label>
      <input id="me-area" className="input" list="me-cities" autoComplete="off" placeholder="עיר או שכונה (לא חובה)" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
      <datalist id="me-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
      <label className="check-row"><input type="checkbox" checked={f.whatsappOptin} disabled={!user.phone && !f.phone.trim()} onChange={(e) => setF({ ...f, whatsappOptin: e.target.checked })} /> לקבל עדכונים גם בוואטסאפ למספר שלי (הודעות חדשות ופניות)</label>
      <span className="field-label">מייל</span>
      <p className="me-email"><bdi>{user.email || 'לא ידוע'}</bdi> <small className="muted-text">המייל הוא ההתחברות שלכם ולא ניתן לשינוי כאן</small></p>
      <div className="form-actions"><button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : 'שמירת הפרטים'}</button></div>
    </form>
    <DeleteAccount />
    </>
  );
}

/** Self-service account deletion, with a typed confirmation because it cannot be undone. */
function DeleteAccount() {
  const { api, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true);
    try { await api.deleteMyAccount(); notify('החשבון נמחק. תודה שהייתם איתנו'); go(''); } catch (e) { notify(e.message, true); setBusy(false); }
  };
  return (
    <section className="delete-account" aria-labelledby="del-h">
      <h2 id="del-h" className="sub-h">מחיקת החשבון</h2>
      {!open ? (
        <button type="button" className="linkish small" onClick={() => setOpen(true)}>אני רוצה למחוק את החשבון</button>
      ) : (
        <div className="decline-box">
          <b>המחיקה סופית ואי אפשר לבטל אותה.</b>
          <p className="hint">יימחקו הפרטים שלכם, הפניות והשיחות עם מורים, ההרשמות לקבוצות והביקורות שכתבתם. אם יש לכם פרופיל מורה, גם הוא והקבוצות שלו יימחקו.</p>
          <label className="field-label" htmlFor="del-confirm">כדי לאשר, כתבו: מחיקה</label>
          <input id="del-confirm" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <div className="decline-actions">
            <button type="button" className="btn btn-brand btn-sm danger" disabled={typed.trim() !== 'מחיקה' || busy} onClick={del}>{busy ? 'מוחקים…' : 'מחיקת החשבון לצמיתות'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setTyped(''); }}>ביטול</button>
          </div>
        </div>
      )}
    </section>
  );
}

const EMPTY_TUTOR = {
  name: '', photo: '', headline: '', about: '', education: '', subjects: ['מתמטיקה'], topics: [], city: '', area: '',
  teachesFrontal: true, priceFrontal: '', teachesOnline: true, priceOnline: '', experienceYears: '', phone: '', birthDate: '', address: '', verified: false, availability: [],
};

const PENDING_NAMES = { photo: 'את התמונה', headline: 'את השורה עליכם', about: 'את התיאור' };
const pendingLabel = (p) => Object.keys(p || {}).map((k) => PENDING_NAMES[k]).filter(Boolean).join(', ');

export function TutorForm({ initial, onSaved, onCancel, forSelf }) {
  const { api, user, notify } = useApp();
  const [t, setT] = useState(() => ({ ...EMPTY_TUTOR, ...(initial || {}), ...(initial ? {} : forSelf ? { name: user.name } : {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch) => setT((x) => ({ ...x, ...patch }));
  const askTerms = !!forSelf && !initial; // a new tutor sign-up agrees to the terms
  const [agree, setAgree] = useState(false);
  const locked = !!forSelf && initial?.approval === 'approved' && !user.isAdmin; // name, phone and birth date are fixed once a tutor is approved

  const validate = () => {
    const e = {};
    const strict = !user.isAdmin || forSelf; // admins adding example profiles are exempt from the mandatory private details
    if (!t.name.trim()) e.name = 'כתבו שם';
    else if (strict && t.name.trim().split(/\s+/).length < 2) e.name = 'כתבו שם מלא (שם ושם משפחה)';
    if (strict && !t.photo) e.photo = 'צריך תמונה ברורה של הפנים';
    if (strict) {
      if (!t.birthDate) e.birthDate = 'כתבו תאריך לידה';
      else if (new Date(t.birthDate) > new Date(new Date().setFullYear(new Date().getFullYear() - 16))) e.birthDate = 'מורה צריך להיות בן 16 לפחות';
      if (!(t.address || '').trim()) e.address = 'כתבו כתובת מגורים (רחוב, מספר ועיר)';
    }
    if (!t.subjects.length) e.subjects = 'בחרו לפחות מקצוע אחד';
    if (!t.teachesFrontal && !t.teachesOnline) e.mode = 'בחרו פרונטלי, אונליין או את שניהם';
    if (t.teachesFrontal && !t.city) e.city = 'בחרו עיר לשיעורים פרונטליים';
    // Hourly price must be realistic (QA: a tutor entered 4 ₪).
    const priceErr = (v) => (!(Number(v) > 0) ? 'כתבו מחיר לשעה' : Number(v) < PRICE_MIN || Number(v) > PRICE_MAX ? `מחיר לשעה בין ${PRICE_MIN} ל-${PRICE_MAX} ₪` : '');
    if (t.teachesFrontal && priceErr(t.priceFrontal)) e.priceFrontal = priceErr(t.priceFrontal);
    if (t.teachesOnline && priceErr(t.priceOnline)) e.priceOnline = priceErr(t.priceOnline);
    const exp = t.experienceYears;
    if (exp !== '' && exp != null && !(Number.isInteger(Number(exp)) && Number(exp) >= 0 && Number(exp) <= 60)) e.experienceYears = 'שנות ניסיון: מספר שלם בין 0 ל־60';
    // The spam/profanity check runs here too, so the message points at the field to fix.
    for (const [k, opts] of [['headline', {}], ['about', {}], ['education', {}]]) {
      const why = checkText(t[k], opts);
      if (why) e[k] = MESSAGES[why];
    }
    if (askTerms && !agree) e.agree = TERMS_ERROR;
    if (strict || t.phone) { if (!/^0\d{1,2}-?\d{7}$/.test((t.phone || '').replace(/\s/g, ''))) e.phone = 'מספר טלפון ישראלי, למשל \u2066050-1234567\u2069'; }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { notify('יש כמה שדות לתקן, הם מסומנים באדום', true); return; }
    setBusy(true);
    try {
      const saved = await api.saveTutor({
        ...t, forSelf,
        priceFrontal: t.teachesFrontal ? Number(t.priceFrontal) : null,
        priceOnline: t.teachesOnline ? Number(t.priceOnline) : null,
        experienceYears: t.experienceYears === '' ? null : Number(t.experienceYears),
      });
      onSaved(saved);
    } catch (e) {
      // A moderation error from the server names the column; mark that field.
      if (e.field && ['headline', 'about', 'education', 'name', 'city', 'area'].includes(e.field)) setErrors((x) => ({ ...x, [e.field]: e.message }));
      notify(e.message, true);
    }
    setBusy(false);
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { notify('התמונה גדולה מדי (עד 8MB)', true); return; }
    setUploading(true);
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type || '')) { notify('אפשר להעלות רק תמונה (JPG, PNG או WebP)', true); e.target.value = ''; return; }
    try { set({ photo: await api.uploadPhoto(f) }); } catch (err) { notify(/[א-ת]/.test(err.message) ? err.message : 'ההעלאה נכשלה, נסו שוב או תמונה אחרת', true); }
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
            <input id="tf-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} />
            {t.photo ? <button type="button" className="linkish" onClick={() => set({ photo: '' })}>הסרה</button> : null}
            <p className="hint">חובה: תמונה ברורה של הפנים, בלי משקפי שמש. היא מגדילה פניות בערך פי שניים.</p>
            <Err k="photo" />
          </div>
        </div>
        <div className="f2">
          <div><label className="field-label" htmlFor="tf-name">שם מלא</label><input id="tf-name" className="input" disabled={locked} value={t.name} onChange={(e) => set({ name: e.target.value })} /><Err k="name" />{locked ? <p className="hint">שם ותאריך לידה לא ניתנים לשינוי אחרי אישור. לתיקון פנו אלינו.</p> : null}</div>
          <div><label className="field-label" htmlFor="tf-phone">טלפון (לא מוצג באתר, רק לצוות)</label><input id="tf-phone" className="input" dir="ltr" inputMode="tel" placeholder="050-1234567" value={t.phone} onChange={(e) => set({ phone: e.target.value })} /><Err k="phone" /></div>
        </div>
        <div className="f2">
          <div><label className="field-label" htmlFor="tf-birth">תאריך לידה (לא מוצג באתר)</label><BirthDateInput id="tf-birth" disabled={locked} value={t.birthDate || ''} onChange={(v) => set({ birthDate: v })} /><Err k="birthDate" /></div>
          <div><label className="field-label" htmlFor="tf-address">כתובת מגורים (לא מוצגת באתר)</label><input id="tf-address" className="input" autoComplete="street-address" placeholder="רחוב, מספר, עיר" value={t.address || ''} onChange={(e) => set({ address: e.target.value })} /><Err k="address" /></div>
        </div>
        <p className="hint">המייל שלכם הוא המייל של החשבון: <bdi>{user.email}</bdi>. כל הפרטים האלה נחוצים לאימות, ורק הצוות רואה אותם.</p>
        {locked ? <p className="hint">שינוי בתמונה, בשורה עליכם או בתיאור עובר בדיקה קצרה של הצוות לפני שהוא מופיע באתר. עד אז תלמידים רואים את הגרסה הקודמת.</p> : null}
        <label className="field-label" htmlFor="tf-headline">שורה אחת עליכם</label>
        <input id="tf-headline" className="input" maxLength={80} placeholder="למשל: סטודנטית לתואר שני במתמטיקה" value={t.headline} onChange={(e) => set({ headline: e.target.value })} aria-invalid={!!errors.headline} /><Err k="headline" />
        <label className="field-label" htmlFor="tf-edu">מוסד לימודים (לא חובה)</label>
        <input id="tf-edu" className="input" maxLength={100} placeholder="למשל: האוניברסיטה העברית, תואר במתמטיקה" value={t.education || ''} onChange={(e) => set({ education: e.target.value })} aria-invalid={!!errors.education} /><Err k="education" />
        <label className="field-label" htmlFor="tf-about">על השיעורים שלכם</label>
        <textarea id="tf-about" className="input" rows={5} maxLength={1500} placeholder="איך אתם מלמדים, למי זה מתאים, הישגים של תלמידים…" value={t.about} onChange={(e) => set({ about: e.target.value })} aria-invalid={!!errors.about} /><Err k="about" />
        <div className="f2">
          <div><label className="field-label" htmlFor="tf-exp">שנות ניסיון</label><input id="tf-exp" className="input" type="number" min="0" max="60" step="1" inputMode="numeric" value={t.experienceYears ?? ''} onChange={(e) => set({ experienceYears: e.target.value })} aria-invalid={!!errors.experienceYears} /><Err k="experienceYears" /></div>
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
        {(t.subjects || []).length ? (
          <>
            <span className="field-label">קורסים ונושאים <small className="muted-text">(סמנו מה אתם מלמדים בכל מקצוע, למשל 4 יח״ל, 5 יח״ל או חדו״א 1. כך תלמידים ימצאו אתכם)</small></span>
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
                  <input id="tf-city" className="input" list="tf-cities" autoComplete="off" placeholder="התחילו להקליד, למשל קריית טבעון" value={t.city || ''} onChange={(e) => set({ city: e.target.value })} /><datalist id="tf-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist><Err k="city" />
                  <p className="hint">היישוב לא ברשימה? כתבו את השם שלו.</p></div>
                <div><label className="field-label" htmlFor="tf-area">שכונה או אזור (לא חובה)</label><input id="tf-area" className="input" placeholder="למשל: ליד הבורסה" value={t.area} onChange={(e) => set({ area: e.target.value })} /></div>
                <div><label className="field-label" htmlFor="tf-pf">מחיר לשעה, פרונטלי (₪)</label><input id="tf-pf" className="input" type="number" min={PRICE_MIN} max={PRICE_MAX} inputMode="numeric" value={t.priceFrontal ?? ''} onChange={(e) => set({ priceFrontal: e.target.value })} /><Err k="priceFrontal" /></div>
              </div>
            ) : null}
          </div>
          <div className={'mode-row' + (t.teachesOnline ? ' on' : '')}>
            <label className="check"><input type="checkbox" checked={t.teachesOnline} onChange={(e) => set({ teachesOnline: e.target.checked })} /> שיעורים אונליין</label>
            {t.teachesOnline ? (
              <div className="f3"><div><label className="field-label" htmlFor="tf-po">מחיר לשעה, אונליין (₪)</label><input id="tf-po" className="input" type="number" min={PRICE_MIN} max={PRICE_MAX} inputMode="numeric" value={t.priceOnline ?? ''} onChange={(e) => set({ priceOnline: e.target.value })} /><Err k="priceOnline" /></div></div>
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

      {askTerms ? <TermsCheck id="tf-terms" checked={agree} onChange={(v) => { setAgree(v); if (v) setErrors((x) => ({ ...x, agree: '' })); }} error={errors.agree} /> : null}
      <div className="form-actions sticky-actions">
        <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : initial ? 'שמירת השינויים' : forSelf ? 'שליחה לאישור' : 'פרסום הפרופיל'}</button>
        {onCancel ? <button type="button" className="btn btn-ghost" onClick={onCancel}>ביטול</button> : null}
      </div>
    </form>
  );
}

function MyGroups() {
  const { api, user, tutors, groups, reload, notify, version } = useApp();
  const [mine, loading, , , loaded] = useLoad(() => api.getMyTutor(), [user.id, version]);
  const [editing, setEditing] = useState(null); // null | {} | group
  const [openSeats, setOpenSeats] = useState(null);
  const manageable = useMemo(() => (user.isAdmin ? tutors || [] : mine ? [mine] : []), [user.isAdmin, tutors, mine]);
  const list = useMemo(() => (groups || []).filter((g) => manageable.some((t) => t.id === g.tutorId)).sort((a, b) => a.startDate.localeCompare(b.startDate)), [groups, manageable]);

  if (loading && !mine && !loaded && !user.isAdmin) return <Loading />;
  if (mine && mine.approval !== 'approved' && !user.isAdmin) {
    return <div className="panel-empty"><h2>הפרופיל עדיין לא אושר</h2><p className="muted-text">אפשר יהיה לפתוח קבוצות ברגע שהצוות יאשר את הפרופיל שלכם.</p><a className="btn btn-brand" href={to('panel')}>לפרופיל</a></div>;
  }
  if (!manageable.length) {
    return (
      <div className="panel-empty">
        <h2>קודם פותחים פרופיל מורה</h2>
        <p className="muted-text">קבוצה תמיד מופיעה עם המורה שמעביר אותה, כדי שתלמידים יוכלו לראות ביקורות ולפנות.</p>
        <a className="btn btn-brand" href={to('panel')}>פתיחת פרופיל מורה</a>
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
        <p className="muted-text">{user.isAdmin ? 'בניהול האתר רואים את הקבוצות של כל המורים.' : 'כאן מעלים מרתונים וקבוצות קבועות ורואים מי נרשם.'}</p>
        <button type="button" className="btn btn-brand" onClick={() => setEditing({})}>+ קבוצה חדשה</button>
      </div>
      {!list.length ? (
        <Empty title="עוד לא פתחתם קבוצה"><p>למשל ״מרתון לבגרות 472״, יום שישי 9:00, 90 ₪ לתלמיד, 12 מקומות.</p></Empty>
      ) : (
        <div className="admin-list">
          {list.map((g) => (
            <article key={g.id} className="admin-item">
              <div className="ai-main">
                <a className="t-name" href={to(`group-${g.id}`)}>{g.title}</a>
                <p className="t-meta">{dateLong(g.startDate)} · {g.time} · {g.mode === 'online' ? 'אונליין' : g.location || g.city} · {money(g.pricePerPerson)} לתלמיד{user.isAdmin && g.tutor ? ` · ${g.tutor.name}` : ''}</p>
                <p className="ai-seats"><b><bdi>{g.seatsTaken}</bdi></b> מתוך <bdi>{g.maxSeats}</bdi> מקומות תפוסים · {g.joinMode === 'approval' ? 'באישור המורה' : 'פתוחה'}{g.pendingCount ? <b className="pending-note"> · {g.pendingCount} ממתינים לאישור</b> : null}</p>
              </div>
              <div className="ai-actions">
                <button type="button" className="btn btn-line btn-sm" onClick={() => setOpenSeats(openSeats === g.id ? null : g.id)} aria-expanded={openSeats === g.id}>{g.pendingCount ? 'אישור נרשמים' : 'נרשמים'}</button>
                <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(g)}>עריכה</button>
                <ConfirmButton confirmText="למחוק את הקבוצה?" onConfirm={async () => { try { await api.deleteGroup(g.id); reload(); notify('הקבוצה נמחקה'); } catch (e) { notify(e.message, true); } }}>מחיקה</ConfirmButton>
              </div>
              {openSeats === g.id ? <SeatList groupId={g.id} groupTitle={g.title} tutorName={g.tutor?.name || (tutors || []).find((t) => t.id === g.tutorId)?.name} /> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const SEAT_STATUS = { approved: ['אושר', 'st-booked'], pending: ['ממתין לאישור', 'st-new'], declined: ['נדחה', 'st-declined'] };

function SeatList({ groupId, groupTitle, tutorName }) {
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
            <td><a href={`tel:${(s.phone || '').replace(/[^\d+]/g, '')}`} dir="ltr"><bdi>{s.phone}</bdi></a>
              <WaButton phone={s.phone} label="וואטסאפ" className="btn btn-wa btn-xs" text={`היי ${(s.name || '').split(' ')[0]}, כאן ${tutorName || 'המורה'} מנפל האסימון, לגבי הקבוצה "${groupTitle || ''}".`} /></td>
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

// A group is for one course of its subject (5 יח״ל, חדו״א 1…); an older group may still hold a value outside the list.
const groupCourses = (subject, current) => [...new Set([...schoolCoursesOf(subject), ...TOPICS.filter((x) => x.subject === subject && !/^שאלון/.test(x.name)).map((x) => x.name), ...(current ? [current] : [])])];
const EMPTY_GROUP = { tutorId: '', title: '', subject: 'מתמטיקה', level: '', description: '', startDate: '', time: '', sessions: 1, mode: 'online', city: '', location: '', pricePerPerson: '', maxSeats: 8, joinMode: 'open', joinMessage: '' };

function GroupForm({ initial, tutors, onSaved, onCancel }) {
  const { api, notify } = useApp();
  const [g, setG] = useState(() => ({ ...EMPTY_GROUP, tutorId: tutors.length === 1 ? tutors[0].id : '', ...(initial || {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (patch) => setG((x) => ({ ...x, ...patch }));
  useEffect(() => { if (!g.startDate) { const d = new Date(); d.setDate(d.getDate() + 7); set({ startDate: d.toISOString().slice(0, 10) }); } }, []); // eslint-disable-line
  useEffect(() => { if (initial?.id) api.getGroupJoinMessage?.(initial.id).then((m) => set({ joinMessage: m })).catch(() => {}); }, [initial?.id]); // eslint-disable-line

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!g.tutorId) e.tutorId = 'בחרו מורה';
    if (!g.title.trim()) e.title = 'כתבו את מטרת הקבוצה';
    if (!g.startDate) e.startDate = 'בחרו תאריך';
    const wrongDay = weekdayMismatch(g.startDate, g.time);
    if (wrongDay) e.time = `המפגש הראשון (${dateLong(g.startDate)}) לא נופל באחד מימי המפגש שכתבתם. שנו את התאריך או את הימים.`;
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
          <div><label className="field-label" htmlFor="gf-subject">מקצוע</label><select id="gf-subject" className="select" value={g.subject} onChange={(e) => set({ subject: e.target.value, level: '' })}>{[...SUBJECTS, 'פסיכומטרי'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="field-label" htmlFor="gf-level">קורס</label><select id="gf-level" className="select" value={g.level} onChange={(e) => set({ level: e.target.value })}><option value="">כללי</option>{groupCourses(g.subject, g.level).map((l) => <option key={l}>{l}</option>)}</select></div>
        </div>
        <label className="field-label" htmlFor="gf-desc">מה עושים בקבוצה</label>
        <textarea id="gf-desc" className="input" rows={4} maxLength={1500} placeholder="נושאים, למי זה מתאים, מה מקבלים (הקלטה, דפי תרגול)…" value={g.description} onChange={(e) => set({ description: e.target.value })} />
        <label className="field-label" htmlFor="gf-join">הודעת הצטרפות (לא חובה)</label>
        <textarea id="gf-join" className="input" rows={3} maxLength={1500} placeholder="מה שתרצו שנרשם יראה מיד אחרי ההצטרפות: למשל קישור לקבוצת וואטסאפ או לשיעור בזום, ומה להביא." value={g.joinMessage || ''} onChange={(e) => set({ joinMessage: e.target.value })} />
        <p className="hint">רק מי שהצטרף לקבוצה (ואתם) רואה את ההודעה הזאת. היא לא גלויה לציבור.</p>
      </fieldset>
      <fieldset>
        <legend>מתי ואיפה</legend>
        <div className="f3">
          <div><label className="field-label" htmlFor="gf-date">תאריך (מפגש ראשון)</label><input id="gf-date" className="input" type="date" value={g.startDate} onChange={(e) => set({ startDate: e.target.value })} /><Err k="startDate" /></div>
          <div><label className="field-label" htmlFor="gf-time">שעות או ימים</label><input id="gf-time" className="input" placeholder="למשל: 09:00–15:00 או ימי ג׳ 18:00" value={g.time} onChange={(e) => set({ time: e.target.value })} /><Err k="time" />{Number(g.sessions) > 1 && g.startDate ? <p className="hint">המפגש הראשון ביום {WEEK_DAY_NAMES[new Date(g.startDate + 'T12:00:00').getDay()]}, אז כתבו למשל ״ימי {WEEK_DAYS[new Date(g.startDate + 'T12:00:00').getDay()]} 18:00״.</p> : null}</div>
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

function MySeats({ openId }) {
  const { api, user, groups, version } = useApp();
  const [seats, loading] = useLoad(() => api.mySeats(), [user.id, version]);
  const [inqs, loadingQ] = useLoad(() => api.myInquiries(), [user.id, version]);
  // One conversation open at a time; a link from a tutor's page opens that tutor's conversation.
  const [open, setOpen] = useState(openId);
  useEffect(() => { if (openId) setOpen(openId); }, [openId]);
  // A declined inquiry shows a notice until the student opens it once; after that it moves to "שיחות שנסגרו".
  const [seen, setSeen] = useState(declinedSeen);
  const toggle = (q) => {
    if (open === q.id) { setOpen(null); if (q.status === 'declined') setSeen(declinedSeen()); return; }
    if (q.status === 'declined') markDeclinedSeen(q.id, api);
    setOpen(q.id);
  };
  if ((loading && !seats) || (loadingQ && !inqs)) return <Loading />;
  const sorted = [...(inqs || [])].sort((a, b) => (b.lastAt || b.createdAt || '').localeCompare(a.lastAt || a.createdAt || ''));
  const closed = sorted.filter((q) => q.status === 'declined' && isDeclineSeen(q, seen) && open !== q.id);
  const active = sorted.filter((q) => !closed.includes(q))
    .sort((a, b) => Number(b.status === 'declined' && !isDeclineSeen(b, seen)) - Number(a.status === 'declined' && !isDeclineSeen(a, seen)));
  const list = (seats || []).map((s) => ({ s, g: (groups || []).find((g) => g.id === s.groupId) })).filter((x) => x.g);
  return (
    <div className="my-requests">
      <section>
        <h2 className="sub-h">פניות ששלחתי למורים</h2>
        {!(inqs || []).length ? <p className="muted-text">עוד לא שלחתם פנייה. <a href={to('search')}>חיפוש מורה</a></p> : (
          <>
            {active.length ? (
              <div className="inq-list">
                {active.map((q) => <MyInquiry key={q.id} q={q} fresh={q.status === 'declined' && !isDeclineSeen(q, seen)} open={open === q.id} onToggle={() => toggle(q)} />)}
              </div>
            ) : <p className="muted-text">אין שיחות פתוחות. <a href={to('search')}>חיפוש מורה</a></p>}
            {closed.length ? (
              <details className="closed-inqs">
                <summary>שיחות שנסגרו ({closed.length})</summary>
                <div className="inq-list">{closed.map((q) => <MyInquiry key={q.id} q={q} open={open === q.id} onToggle={() => toggle(q)} />)}</div>
              </details>
            ) : null}
          </>
        )}
      </section>
      <section>
        <h2 className="sub-h">קבוצות שנרשמתי אליהן</h2>
        {!list.length ? <p className="muted-text">עוד לא נרשמתם לקבוצה. <a href={to('groups')}>לקבוצות הלמידה</a></p> : (
          <div className="admin-list">
            {list.map(({ s, g }) => (
              <article key={s.id} className="admin-item">
                <div className="ai-main">
                  <a className="t-name" href={to(`group-${g.id}`)}>{g.title}</a> <StatusTag status={s.status} map={SEAT_STATUS} />
                  <p className="t-meta">{dateLong(g.startDate)} · {g.time} · {g.mode === 'online' ? 'אונליין' : g.location || g.city} · עם {g.tutor?.name}</p>
                </div>
                <div className="ai-actions"><a className="btn btn-brand btn-sm" href={to(`group-${g.id}`)}>{s.status === 'approved' ? 'לצ׳אט הקבוצה' : 'לעמוד הקבוצה'}</a></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MyInquiry({ q, open, onToggle, fresh }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.top < 80 || r.top > window.innerHeight * 0.5) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: 'smooth' });
  }, [open]);
  const name = q.tutor ? q.tutor.name : 'מורה שהוסר/ה';
  return (
    <article ref={ref} className={'inq my-inq' + (open ? ' is-open' : '') + (fresh ? ' is-declined' : '')}>
      <button type="button" className="inq-head" aria-expanded={open} onClick={onToggle}>
        <span className="inq-top">
          <Avatar tutor={q.tutor || { name }} className="inq-av" size={88} />
          <span className="my-inq-who">
            <b className="inq-name">{name}</b>
            <span className="my-inq-sub"><StatusTag status={q.status} /> <span className="muted-text">{dateShort(q.createdAt)}</span></span>
          </span>
        </span>
        {!open ? <span className="inq-preview-line">{fresh ? `התשובה של ${name.split(' ')[0]}: הפנייה לא מתאימה כרגע. לחצו כדי לראות, אחר כך השיחה תיסגר.` : q.status === 'new' && !q.messageCount ? 'המורה עוד לא ענה' : (q.message || '').split('\n')[0]}</span> : null}
        <span className="inq-toggle">{open ? 'פתיחת השיחה' : 'פתיחת השיחה'}</span>
      </button>
      {open ? (
        <ChatOverlay who={name} avatar={q.tutor || { name }} status={q.status} onClose={onToggle} label={`שיחה עם ${name}`}>
          {q.status === 'new' && !q.messageCount ? <p className="hint chat-win-hint">המורה עוד לא ענה. בינתיים אפשר להוסיף הודעה.</p> : null}
          <InquiryChat q={q} />
          <div className="my-inq-links chat-win-foot">
            {q.tutor ? <a className="linkish small" href={to(`tutor-${q.tutorId}`)}>לפרופיל של {q.tutor.name.split(' ')[0]}</a> : null}
            {q.tutor ? <ReportTutor tutor={q.tutor} /> : null}
          </div>
        </ChatOverlay>
      ) : null}
    </article>
  );
}

function PendingTutors({ onChange }) {
  const { api, notify, reload, version } = useApp();
  const [all, loading, , refresh] = useLoad(() => api.listAllTutors(), [version]);
  const [open, setOpen] = useState(null); // tutor with private details
  const [reason, setReason] = useState('');
  const queue = (all || []).filter((t) => t.approval === 'pending').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const show = async (t) => {
    if (open?.id === t.id) { setOpen(null); return; }
    try { setOpen(await api.getTutorForEdit(t.id)); setReason(''); } catch (e) { notify(e.message, true); }
  };
  const decide = async (t, approve) => {
    if (!approve && !reason.trim()) { notify('כתבו סיבה לדחייה, המורה יראה אותה', true); return; }
    try { await api.reviewTutor(t.id, approve, reason); notify(approve ? 'המורה אושר ומופיע באתר' : 'המורה נדחה'); setOpen(null); refresh(); reload(); onChange?.(); } catch (e) { notify(e.message, true); }
  };
  if (loading && !all) return <Loading />;
  return (
    <section className="pending-box" aria-label="מורים שממתינים לאישור">
      <h2>ממתינים לאישור ({queue.length})</h2>
      {!queue.length ? <p className="muted-text">אין מורים שממתינים לאישור כרגע.</p> : (
        <div className="admin-list">
          {queue.map((t) => (
            <article key={t.id} className="admin-item pending-item">
              <Avatar tutor={t} className="ai-photo" size={64} />
              <div className="ai-main">
                <b>{t.name}</b>
                <p className="t-meta">{(t.subjects || []).join(', ')}{(t.topics || []).length ? ` · ${t.topics.slice(0, 6).join(', ')}` : ''} · {t.city || 'אונליין'}</p>
                <p className="t-meta">נשלח {dateShort(t.createdAt)}</p>
                {open?.id === t.id ? (
                  <div className="pending-details">
                    <p>טלפון: <bdi>{open.phone || 'חסר'}</bdi></p>
                    <p>תאריך לידה: <bdi>{open.birthDate || 'חסר'}</bdi></p>
                    <p>כתובת: {open.address || 'חסרה'}</p>
                    <p>מייל החשבון: <bdi>{open.email || '(ראו בלוח Supabase)'}</bdi></p>
                    <p>{t.headline}</p><p>{t.about}</p>
                    <input className="input" aria-label="סיבה לדחייה" placeholder="סיבה לדחייה (רק אם דוחים)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="form-actions">
                      <button type="button" className="btn btn-brand btn-sm" onClick={() => decide(t, true)}>אישור</button>
                      <button type="button" className="btn btn-line btn-sm" onClick={() => decide(t, false)}>דחייה</button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="ai-actions"><button type="button" className="btn btn-line btn-sm" onClick={() => show(t)}>{open?.id === t.id ? 'סגירה' : 'בדיקה'}</button></div>
            </article>
          ))}
        </div>
      )}
      <ChangedTutors all={all} onDone={() => { refresh(); reload(); }} />
    </section>
  );
}

/** Approved tutors who changed their photo, headline or description: the old version stays public until approved. */
function ChangedTutors({ all, onDone }) {
  const { api, notify } = useApp();
  const list = (all || []).filter((t) => t.approval === 'approved' && t.pending);
  if (!list.length) return null;
  const decide = async (t, approve) => {
    try { await api.reviewTutorChanges(t.id, approve); notify(approve ? 'השינויים פורסמו' : 'השינויים נדחו, הגרסה הקודמת נשארת'); onDone(); } catch (e) { notify(e.message, true); }
  };
  return (
    <>
      <h2>שינויים בפרופילים מאושרים ({list.length})</h2>
      <div className="admin-list">
        {list.map((t) => (
          <article key={t.id} className="admin-item pending-item">
            <Avatar tutor={t} className="ai-photo" size={64} />
            <div className="ai-main">
              <a className="t-name" href={to(`tutor-${t.id}`)}>{t.name}</a>
              <div className="pending-details changes">
                {t.pending.photo ? <div><span className="field-label">תמונה חדשה</span><img className="ai-photo" src={t.pending.photo} alt={`התמונה החדשה של ${t.name}`} width="96" height="96" /></div> : null}
                {t.pending.headline != null ? <div><span className="field-label">שורה חדשה</span><p>{t.pending.headline || '(ריק)'}</p><p className="muted-text">היה: {t.headline || '(ריק)'}</p></div> : null}
                {t.pending.about != null ? <div><span className="field-label">תיאור חדש</span><p>{t.pending.about || '(ריק)'}</p></div> : null}
                <div className="form-actions">
                  <button type="button" className="btn btn-brand btn-sm" onClick={() => decide(t, true)}>פרסום השינויים</button>
                  <button type="button" className="btn btn-line btn-sm" onClick={() => decide(t, false)}>דחייה</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AdminReports() {
  const { api, user, version, notify } = useApp();
  const [list, loading, , refresh] = useLoad(() => api.listReports(), [user.id, version]);
  const [show, setShow] = useState('open');
  if (loading && !list) return <Loading />;
  const all = list || [];
  const shown = all.filter((r) => show === 'all' || r.status === show);
  const setStatus = async (r, status) => { try { await api.setReportStatus(r.id, status); refresh(); } catch (e) { notify(e.message, true); } };
  return (
    <div className="inbox">
      <p className="muted-text">דיווחים של משתמשים על מורים. המורה לא רואה אותם. אפשר לערוך או להסיר מורה בלשונית ״ניהול מורים״.</p>
      <span className="sr-only" id="rp-show">אילו דיווחים להציג</span>
      <Seg label="rp-show" value={show} onChange={setShow} options={[['open', `פתוחים (${all.filter((r) => r.status === 'open').length})`], ['handled', 'טופלו'], ['all', 'הכול']]} />
      {!shown.length ? <p className="muted-text">{show === 'open' ? 'אין דיווחים פתוחים.' : 'אין דיווחים.'}</p> : (
        <div className="admin-list">
          {shown.map((r) => (
            <article key={r.id} className="admin-item">
              <div className="ai-main">
                <div className="inq-top">
                  {r.tutor ? <a className="t-name" href={to(`tutor-${r.tutorId}`)}>{r.tutor.name}</a> : <b>מורה שהוסר/ה</b>}
                  <span className={'tag' + (r.status === 'open' ? ' brass' : '')}>{r.status === 'open' ? 'פתוח' : 'טופל'}</span>
                </div>
                <p className="t-meta">{labelOf(REPORT_REASONS, r.reason) || r.reason} · {dateShort(r.createdAt)}{r.userName ? ` · מאת ${r.userName}` : ''}</p>
                {r.details ? <p className="inq-msg">{r.details}</p> : null}
              </div>
              <div className="ai-actions">
                {r.status === 'open'
                  ? <button type="button" className="btn btn-line btn-sm" onClick={() => setStatus(r, 'handled')}>סימון כטופל</button>
                  : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(r, 'open')}>פתיחה מחדש</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTutors() {
  const { api, tutors: publicTutors, reload, notify, version } = useApp();
  const [allTutors] = useLoad(() => api.listAllTutors(), [version]);
  const tutors = allTutors || publicTutors;
  const [editing, setEditing] = useState(null); // null | 'new' | tutor (with phone)
  const [q, setQ] = useState('');
  const list = useMemo(() => (tutors || []).filter((t) => !q || t.name.includes(q) || (t.city || '').includes(q)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [tutors, q]);

  if (editing) {
    return <TutorForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)}
      onSaved={() => { setEditing(null); reload(); notify(editing === 'new' ? 'המורה נוסף לאתר' : 'הפרטים נשמרו'); }} />;
  }
  return (
    <div className="my-groups">
      <PendingTutors />
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
                <a className="t-name" href={to(`tutor-${t.id}`)}>{t.name}</a> <Verified tutor={t} />{t.approval && t.approval !== 'approved' ? <span className={'tag ' + (t.approval === 'pending' ? 'brass' : '')}>{t.approval === 'pending' ? 'ממתין' : 'נדחה'}</span> : null}
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
