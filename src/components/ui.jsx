import { useEffect, useRef, useState } from 'react';
import { useApp, useMyTutor, go } from '../state.jsx';
import { money, rating1, reviewsLabel, initials, avatarColor, km, relDays, dateLong, dateTime, isPhone, isEmail } from '../lib/format.js';
import { CITIES, NEIGHBORHOODS, WEEK_DAYS, WEEK_DAY_NAMES, DAY_SLOTS, LESSON_COUNTS, GOALS, slotLabel, labelOf } from '../data/constants.js';
import { searchOptions, optionLabel } from '../data/topics.js';
import { topicMatch } from '../lib/ranking.js';

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
export function TutorRow({ tutor, sort, topic }) {
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
        {topic && topicMatch(tutor, topic) ? <p className="t-topic">✓ מלמד/ת {topic}</p> : null}
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
      <p className="join-mode">{group.joinMode === 'approval' ? 'הצטרפות באישור המורה' : 'הרשמה פתוחה, נכנסים מיד'}</p>
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

export const INQ_STATUS = {
  new: ['חדשה', 'st-new'],
  replied: ['נענתה', 'st-replied'],
  booked: ['נקבע שיעור', 'st-booked'],
  declined: ['לא מתאים', 'st-declined'],
};
export function StatusTag({ status, map = INQ_STATUS }) {
  const [label, cls] = map[status] || [status, ''];
  return <span className={'status ' + cls}>{label}</span>;
}

export const VIA = [['site', 'צ׳אט באתר'], ['phone', 'טלפון / וואטסאפ'], ['email', 'מייל']];
export const viaOf = (q) => (q.contactVia && q.contactVia.length ? q.contactVia : q.phone ? ['phone'] : ['site']);

/** Two-way chat on one inquiry. The first bubble is the inquiry itself. */
export function InquiryChat({ q, asTutor }) {
  const { api, notify, version, reload } = useApp();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  useEffect(() => {
    let live = true;
    api.listInquiryMessages(q.id).then((m) => live && setMsgs(m), () => live && setMsgs([]));
    return () => { live = false; };
  }, [api, q.id, version]);
  // Jump to the newest message only on first load, or when a message arrives while you're already at the bottom.
  const seen = useRef(-1);
  useEffect(() => {
    const el = listRef.current; if (!el || msgs == null) return;
    const count = msgs.length;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (seen.current === -1 || (count > seen.current && nearBottom)) el.scrollTop = el.scrollHeight;
    seen.current = count;
  }, [msgs]);

  const tutorName = q.tutor?.name || 'המורה';
  const items = [
    { id: 'first', fromTutor: false, text: q.message, createdAt: q.createdAt },
    ...(q.reply ? [{ id: 'reply', fromTutor: true, text: q.reply, createdAt: q.repliedAt || q.createdAt }] : []),
    ...(msgs || []),
  ];
  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const m = await api.sendInquiryMessage(q.id, t, asTutor);
      setMsgs((list) => [...(list || []), m]); setText('');
      requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });
      reload(); // status (new → answered) and the inbox badge update everywhere
    } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  const other = asTutor ? q.name.split(' ')[0] : tutorName.split(' ')[0];
  return (
    <div className="chat">
      <ol className="chat-list" ref={listRef}>
        {items.map((m) => {
          const mine = m.fromTutor === !!asTutor;
          return (
            <li key={m.id} className={'msg ' + (mine ? 'mine' : 'theirs')}>
              <span className="msg-who">{mine ? 'אתם' : m.fromTutor ? tutorName : q.name}</span>
              <p>{m.text}</p>
              <time dateTime={m.createdAt}>{dateTime(m.createdAt)}</time>
            </li>
          );
        })}
      </ol>
      <form className="chat-form" onSubmit={send}>
        <label className="sr-only" htmlFor={'chat-' + q.id}>הודעה ל{other}</label>
        <textarea id={'chat-' + q.id} className="input" rows={1} maxLength={1000} value={text} placeholder={`הודעה ל${other}…`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e); }} />
        <button type="submit" className="btn btn-brand btn-sm" disabled={busy || !text.trim()}>שליחה</button>
      </form>
    </div>
  );
}

/** The inquiry text the tutor reads, built from the template answers. */
export function buildInquiryText(tutor, f) {
  const lines = [`היי ${tutor.name.split(' ')[0]}, אשמח לשיעורים${f.subject ? ` ב${f.subject}` : ''}${f.level ? ` (${f.level})` : ''}.`];
  if (f.lessons) lines.push(`כמה שיעורים: ${labelOf(LESSON_COUNTS, f.lessons)}`);
  if (f.goal) lines.push(`מטרה: ${labelOf(GOALS, f.goal)}`);
  if (f.mode) lines.push(`איך: ${f.mode === 'online' ? 'אונליין' : 'פרונטלי'}`);
  if (f.slots?.length) lines.push(`זמנים נוחים: ${[...f.slots].sort(slotSort).map(slotLabel).join(', ')}`);
  if (f.note?.trim()) lines.push('', f.note.trim());
  return lines.join('\n').slice(0, 1000);
}
const slotSort = (a, b) => { const [d1, h1] = a.split('-').map(Number); const [d2, h2] = b.split('-').map(Number); return d1 - d2 || h1 - h2; };

/** Contact a tutor through the site. The tutor's phone is never shown; the request lands in their panel. */
export function InquiryBox({ tutor }) {
  const { user, api, requireLogin, notify, version } = useApp();
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const dlg = useRef(null);
  const both = tutor.teachesFrontal && tutor.teachesOnline;
  const blank = () => ({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '', save: true,
    via: user?.phone ? ['site', 'phone'] : ['site'],
    subject: (tutor.subjects || [])[0] || '', level: '', lessons: '', goal: '', slots: [],
    mode: both ? '' : tutor.teachesOnline ? 'online' : 'frontal', note: '',
  });
  const [f, setF] = useState(blank);
  useEffect(() => {
    let live = true;
    if (!user) { setMine([]); return undefined; }
    api.myInquiries().then((list) => live && setMine(list.filter((q) => q.tutorId === tutor.id)), () => {});
    return () => { live = false; };
  }, [user?.id, tutor.id, version, api]);
  useEffect(() => {
    const d = dlg.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (user && user.id === tutor.ownerId) return <p className="hint">זה הפרופיל שלכם. פניות מתלמידים מגיעות ל<a href="#panel-inbox">תיבת הפניות בפאנל</a>.</p>;

  const start = () => {
    if (!requireLogin('כדי לשלוח פנייה למורה צריך להתחבר. ככה המורה יודע שמדובר באדם אמיתי, ואתם רואים את התשובה באזור האישי.')) return;
    setF(blank()); setEditDetails(!user?.name); setStep(0); setSent(false); setOpen(true);
  };
  const toggleVia = (v) => setF((x) => ({ ...x, via: x.via.includes(v) ? x.via.filter((y) => y !== v) : [...x.via, v] }));
  const submit = async (e) => {
    e.preventDefault();
    if (!f.via.length) { notify('בחרו לפחות דרך אחת שבה המורה יחזור אליכם', true); return; }
    if (f.via.includes('phone') && !isPhone(f.phone)) { notify('בדקו את מספר הטלפון, למשל 050-1234567', true); setEditDetails(true); return; }
    if (f.via.includes('email') && !isEmail(f.email)) { notify('בדקו את כתובת המייל', true); setEditDetails(true); return; }
    if (f.phone.trim() && !isPhone(f.phone)) { notify('בדקו את מספר הטלפון, למשל 050-1234567', true); setEditDetails(true); return; }
    if (!f.lessons || !f.goal) { setStep(0); notify('בחרו כמה שיעורים ומה המטרה', true); return; }
    setBusy(true);
    try {
      const q = await api.sendInquiry({
        tutorId: tutor.id, name: f.name.trim(), subject: f.subject, level: f.level, mode: f.mode, contactVia: f.via,
        lessons: f.lessons, goal: f.goal, slots: f.slots,
        phone: f.via.includes('phone') ? f.phone.trim() : '', email: f.via.includes('email') ? f.email.trim() : '',
        message: buildInquiryText(tutor, f),
      });
      if (f.save && (f.name.trim() !== user.name || f.phone.trim() !== (user.phone || ''))) {
        await api.saveMyContact({ name: f.name.trim(), phone: f.phone.trim() }).catch(() => {});
      }
      setMine((m) => [{ ...q, tutor, messageCount: 0 }, ...m]); setSent(true);
    } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  const last = mine[0];

  const STEPS = ['מה צריך', 'מתי ואיך', 'הודעה ושליחה'];
  const canNext = step === 0 ? !!(f.lessons && f.goal) : true;
  const next = () => {
    if (step === 0 && !f.lessons) { notify('בחרו בערך כמה שיעורים', true); return; }
    if (step === 0 && !f.goal) { notify('בחרו מה המטרה', true); return; }
    setStep(step + 1);
  };
  const close = () => { setOpen(false); setSent(false); };
  const wizard = (
    <dialog ref={dlg} className="modal inq-modal" onClose={close} onClick={(e) => { if (e.target === dlg.current) close(); }} aria-labelledby="iq-title">
      <form className="modal-body inq-wiz" onSubmit={step < 2 ? (e) => { e.preventDefault(); next(); } : submit}>
        <button type="button" className="modal-x" onClick={close} aria-label="סגירה">×</button>
        {sent ? (
          <div className="inq-done">
            <Coin size={48} />
            <h2 id="iq-title">הפנייה נשלחה ל{tutor.name.split(' ')[0]}</h2>
            <p className="muted-text">המורה קיבל/ה אותה בפאנל{f.via.includes('phone') || f.via.includes('email') ? ' יחד עם פרטי הקשר שבחרתם' : ''}. התשובה תופיע כאן בפרופיל וב״הפניות שלי״.</p>
            <button type="button" className="btn btn-brand go" onClick={close}>סגירה</button>
          </div>
        ) : (
          <>
            <div className="wiz-head">
              <h2 id="iq-title">פנייה ל{tutor.name}</h2>
              <ol className="wiz-steps" aria-label="שלבים">
                {STEPS.map((x, i) => <li key={x} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span>{x}</li>)}
              </ol>
            </div>
            <div className="wiz-body">
              {step === 0 ? (
                <>
                  {(tutor.subjects || []).length > 1 ? (
                    <>
                      <span className="field-label" id="iq-subj">מקצוע</span>
                      <div className="chips wrap-chips" role="group" aria-labelledby="iq-subj">
                        {tutor.subjects.map((x) => <button key={x} type="button" className="chip" aria-pressed={f.subject === x} onClick={() => setF({ ...f, subject: x })}>{x}</button>)}
                      </div>
                    </>
                  ) : null}
                  {(tutor.levels || []).length > 1 ? (
                    <>
                      <span className="field-label" id="iq-level">רמה</span>
                      <div className="chips wrap-chips" role="group" aria-labelledby="iq-level">
                        {tutor.levels.map((l) => <button key={l} type="button" className="chip" aria-pressed={f.level === l} onClick={() => setF({ ...f, level: f.level === l ? '' : l })}>{l}</button>)}
                      </div>
                    </>
                  ) : null}
                  <span className="field-label" id="iq-lessons">כמה שיעורים בערך?</span>
                  <div className="chips wrap-chips" role="group" aria-labelledby="iq-lessons">
                    {LESSON_COUNTS.map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={f.lessons === v} onClick={() => setF({ ...f, lessons: v })}>{l}</button>)}
                  </div>
                  <span className="field-label" id="iq-goal">מה המטרה?</span>
                  <div className="chips wrap-chips" role="group" aria-labelledby="iq-goal">
                    {GOALS.map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={f.goal === v} onClick={() => setF({ ...f, goal: v })}>{l}</button>)}
                  </div>
                </>
              ) : null}
              {step === 1 ? (
                <>
                  {both ? (
                    <>
                      <span className="field-label" id="iq-mode">איך תרצו ללמוד?</span>
                      <Seg label="iq-mode" value={f.mode} onChange={(mode) => setF({ ...f, mode })} options={[['frontal', 'פרונטלי'], ['online', 'אונליין'], ['', 'לא משנה']]} />
                    </>
                  ) : null}
                  <span className="field-label">מתי נוח לכם? <small className="muted-text">(לא חובה)</small></span>
                  <WeekGrid mode="pick" value={f.slots} allowed={tutor.availability} onChange={(slots) => setF({ ...f, slots })} label="בחירת זמנים נוחים" />
                  {(tutor.availability || []).length ? <p className="wg-legend"><span><i className="free" />המורה פנוי/ה</span><span><i />בחרתם</span></p> : null}
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <label className="field-label" htmlFor="iq-note">הודעה אישית למורה <small className="muted-text">(לא חובה)</small></label>
                  <textarea id="iq-note" className="input inq-note" rows={4} maxLength={600} value={f.note}
                    placeholder="ספרו למורה במילים שלכם: מה קשה לכם, מתי המבחן, שאלות על השיעורים…"
                    onChange={(e) => setF({ ...f, note: e.target.value })} />
                  <p className="hint inq-count"><bdi dir="ltr">{f.note.length}/600</bdi></p>
                  <span className="field-label" id="iq-via">איך המורה יחזור אליכם?</span>
                  <div className="chips wrap-chips" role="group" aria-labelledby="iq-via">
                    {VIA.map(([v, label]) => <button key={v} type="button" className="chip" aria-pressed={f.via.includes(v)} onClick={() => toggleVia(v)}>{label}</button>)}
                  </div>
                  {!editDetails ? (
                    <div className="my-details">
                      <div><b>{f.name}</b><span className="muted-text"><bdi>{[f.via.includes('phone') && f.phone, f.via.includes('email') && f.email].filter(Boolean).join(' · ') || 'בלי טלפון ומייל, רק צ׳אט באתר'}</bdi></span></div>
                      <button type="button" className="linkish small" onClick={() => setEditDetails(true)}>שינוי</button>
                    </div>
                  ) : (
                    <>
                      <label className="field-label" htmlFor="iq-name">שם</label>
                      <input id="iq-name" className="input" required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                      {f.via.includes('phone') ? (
                        <>
                          <label className="field-label" htmlFor="iq-phone">טלפון</label>
                          <input id="iq-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" placeholder="050-1234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                        </>
                      ) : null}
                      {f.via.includes('email') ? (
                        <>
                          <label className="field-label" htmlFor="iq-email">מייל</label>
                          <input id="iq-email" className="input" type="email" autoComplete="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                        </>
                      ) : null}
                      <label className="check-line"><input type="checkbox" checked={f.save} onChange={(e) => setF({ ...f, save: e.target.checked })} /> לשמור את הפרטים לפעם הבאה</label>
                    </>
                  )}
                  <span className="field-label">כך המורה יקבל את הפנייה</span>
                  <pre className="inq-preview">{buildInquiryText(tutor, f)}</pre>
                </>
              ) : null}
            </div>
            <div className="wiz-actions">
              {step < 2
                ? <button type="submit" className="btn btn-brand" disabled={!canNext}>המשך</button>
                : <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שולחים…' : 'שליחת הפנייה'}</button>}
              {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>חזרה</button> : null}
            </div>
          </>
        )}
      </form>
    </dialog>
  );

  return (
    <div className="inq-box">
      {last ? (
        <div className="inq-sent">
          <div className="inq-sent-top"><b>השיחה שלכם עם {tutor.name.split(' ')[0]}</b><StatusTag status={last.status} /></div>
          {last.status === 'new' && !last.messageCount ? <p className="hint">המורה עוד לא ענה. בדרך כלל עונים תוך יום.</p> : null}
          <InquiryChat q={{ ...last, tutor }} />
          <a className="linkish small" href="#panel-seats">לכל הפניות שלי</a>
        </div>
      ) : null}
      <button type="button" className={'btn go ' + (last ? 'btn-line' : 'btn-brand')} onClick={start}>{last ? 'פנייה חדשה' : 'שליחת פנייה למורה'}</button>
      {!user ? <p className="hint">כניסה מהירה עם Google, בלי סיסמה. אפשר לדבר עם המורה בצ׳אט באתר, בלי למסור טלפון.</p> : null}
      {wizard}
    </div>
  );
}

/** Marks the typed text inside a suggestion. */
function Hl({ text, q }) {
  const t = (q || '').trim();
  const i = t ? text.indexOf(t) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

/** "מה רוצים ללמוד?": one free-text field over subjects, levels, exam codes and university courses, e.g. "מתמטיקה - אינפי 1". */
export function TopicPicker({ id, value, onPick, placeholder = 'מקצוע או קורס, למשל 582 או אינפי', subjects, autoFocus, adder }) {
  const [text, setText] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setText(value || ''); } };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, [value]);
  const picked = text === value && !!value;
  // adder: pick topics one after another (tutor profile), so only topic rows and the field empties after each pick.
  const opts = (picked ? [] : searchOptions(text, adder ? 40 : 14)).filter((o) => (!subjects || subjects.includes(o.subject)) && (!adder || o.topic)).slice(0, 14);
  const pick = (o) => { onPick(o); setText(o && !adder ? optionLabel(o) : ''); setOpen(false); setActive(-1); };
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(opts.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && opts.length) { e.preventDefault(); pick(opts[Math.max(0, active)]); }
    else if (e.key === 'Escape') { setOpen(false); setText(value || ''); }
  };
  return (
    <div className="combo topic-combo" ref={ref}>
      <input id={id} className="input combo-input" role="combobox" aria-expanded={open && opts.length > 0} aria-controls={id + '-list'} aria-autocomplete="list"
        autoComplete="off" enterKeyHint="search" placeholder={value && !text ? value : placeholder} value={text} autoFocus={autoFocus}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
        // Tapping a chosen value empties the field so you can type right away; leaving without a pick brings it back.
        onFocus={() => { setOpen(true); if (picked) setText(''); }} onBlur={() => { if (!text.trim()) setText(value || ''); }}
        onClick={() => setOpen(true)} onKeyDown={key} />
      {text ? <button type="button" className="combo-btn" aria-label="ניקוי" onClick={() => { setText(''); if (value) onPick(null); }}>×</button> : null}
      {open && opts.length ? (
        <ul className="combo-list" id={id + '-list'} role="listbox">
          {opts.map((o, i) => (
            <li key={o.key} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}><Hl text={o.label} q={text} /></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Weekly grid of two-hour blocks. mode "edit": tutor toggles free cells. mode "pick": student picks among
 * `allowed` cells (all cells when allowed is empty). mode "view": read only.
 */
export function WeekGrid({ value = [], onChange, mode = 'view', allowed, label = 'שעות פנויות' }) {
  const on = new Set(value);
  const ok = (k) => mode === 'edit' || !allowed || !allowed.length || allowed.includes(k);
  const toggle = (k) => onChange(on.has(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className={'week-grid wg-' + mode} role="table" aria-label={label}>
      <div className="wg-row wg-head" role="row">
        <span role="columnheader" />
        {WEEK_DAYS.map((d, i) => <span key={d} role="columnheader" title={WEEK_DAY_NAMES[i]}>{d}</span>)}
      </div>
      {DAY_SLOTS.map((h) => (
        <div key={h} className="wg-row" role="row">
          <span className="wg-hour" role="rowheader">{String(h).padStart(2, '0')}–{String(h + 2).padStart(2, '0')}</span>
          {WEEK_DAYS.map((d, day) => {
            const k = `${day}-${h}`;
            const cls = 'wg-cell' + (on.has(k) ? ' on' : '') + (ok(k) ? '' : ' off') + (mode === 'pick' && allowed?.includes(k) ? ' free' : '');
            const name = `${WEEK_DAY_NAMES[day]} ${h}:00`;
            if (mode === 'view') return <span key={k} role="cell" className={cls} aria-label={`${name}: ${on.has(k) ? 'פנוי' : 'לא פנוי'}`} />;
            return (
              <button key={k} type="button" role="cell" className={cls} disabled={!ok(k)} aria-pressed={on.has(k)} aria-label={name}
                onClick={() => toggle(k)} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

const WHERE_FIXED = [['', 'כל הארץ'], ['online', 'אונליין']];
/** Turns what was typed in "איפה?" into search filters. Free text that isn't a city searches city and area. */
export function resolveWhere(text) {
  const v = (text || '').trim();
  if (!v || v === 'כל הארץ') return { mode: 'any', city: '', origin: null, place: '' };
  if (v === 'online' || v === 'אונליין') return { mode: 'online', city: '', origin: null, place: '' };
  // A neighbourhood ("המשתלה", "שכונת המשתלה", "המשתלה, תל אביב") searches around its centre and city.
  const bare = v.replace(/^שכונת\s+|^שכונה\s+/, '');
  const cityIn = CITIES.find((x) => bare.includes(x.name));
  const nb = NEIGHBORHOODS.find((n) => bare.split(/[,\s]+/).join(' ').includes(n.name) && (!cityIn || cityIn.name === n.city));
  if (nb) return { mode: 'any', city: nb.city, origin: { lat: nb.lat, lng: nb.lng }, place: '' };
  const c = CITIES.find((x) => x.name === v) || cityIn;
  if (c) return { mode: 'any', city: c.name, origin: { lat: c.lat, lng: c.lng }, place: '' };
  return { mode: 'any', city: '', origin: null, place: v };
}

/** "איפה?" field: type anything, or pick from the list (cities, online, everywhere). */
export function WherePicker({ id, value, onChange, placeholder = 'עיר או שכונה' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const shown = value === 'online' ? 'אונליין' : value;
  const typed = (shown || '').trim();
  // A value that was picked from the list (e.g. "חיפה") must not hide the other cities: show them all.
  const nbLabel = (n) => `${n.name}, ${n.city}`;
  const picked = WHERE_FIXED.some(([, l]) => l === typed) || CITIES.some((c) => c.name === typed) || NEIGHBORHOODS.some((n) => nbLabel(n) === typed);
  const q = picked ? '' : typed;
  const opts = [
    ...WHERE_FIXED.filter(([, l]) => !q || l.includes(q)),
    ...CITIES.filter((c) => !q || c.name.includes(q)).map((c) => [c.name, c.name]),
    // Neighbourhoods only show once something is typed, so the empty list stays short.
    ...(q ? NEIGHBORHOODS.filter((n) => nbLabel(n).includes(q.replace(/^שכונת\s+|^שכונה\s+/, ''))).map((n) => [nbLabel(n), 'שכונת ' + nbLabel(n)]) : []),
  ];
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);
  const pick = (v) => { onChange(v); setOpen(false); setActive(-1); };
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(opts.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && active >= 0 && opts[active]) { e.preventDefault(); pick(opts[active][0]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div className="combo" ref={ref}>
      <input id={id} className="input combo-input" role="combobox" aria-expanded={open} aria-controls={id + '-list'} aria-autocomplete="list"
        autoComplete="off" placeholder={placeholder} value={shown}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={(e) => { setOpen(true); if (picked) e.target.select(); }} onClick={() => setOpen(true)} onKeyDown={key} />
      <button type="button" className="combo-btn" tabIndex={-1} aria-label="הצגת האפשרויות" onClick={() => setOpen((o) => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && opts.length ? (
        <ul className="combo-list" id={id + '-list'} role="listbox">
          {opts.map(([v, l], i) => (
            <li key={l} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(v); }}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Sign in / sign up with email and password (the account works without Google). */
function EmailLogin({ api, onError }) {
  const [mode, setMode] = useState('in'); // 'in' | 'up' | 'reset'
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const submit = async (e) => {
    e.preventDefault(); onError(''); setInfo('');
    const email = f.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { onError('כתבו כתובת מייל תקינה'); return; }
    if (mode !== 'reset' && f.password.length < 6) { onError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (mode === 'up' && !f.name.trim()) { onError('כתבו שם'); return; }
    setBusy(true);
    try {
      if (mode === 'in') await api.auth.signInEmail({ email, password: f.password });
      else if (mode === 'up') {
        const r = await api.auth.signUpEmail({ email, password: f.password, name: f.name.trim() });
        if (r.needsConfirm) setInfo('שלחנו אליכם מייל אימות. לחצו על הקישור שבו (חפשו גם בספאם) ואז היכנסו.');
      } else { await api.auth.resetPassword(email); setInfo('שלחנו קישור לאיפוס הסיסמה למייל.'); }
    } catch (err) { onError(err.message); }
    setBusy(false);
  };
  return (
    <form className="login-email" onSubmit={submit} noValidate>
      <div className="login-or"><span>או עם מייל</span></div>
      <div className="seg" role="group" aria-label="כניסה או הרשמה">
        <button type="button" aria-pressed={mode !== 'up'} onClick={() => { setMode('in'); setInfo(''); onError(''); }}>כניסה</button>
        <button type="button" aria-pressed={mode === 'up'} onClick={() => { setMode('up'); setInfo(''); onError(''); }}>הרשמה</button>
      </div>
      {mode === 'up' ? <input className="input" aria-label="שם" autoComplete="name" placeholder="שם" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /> : null}
      <input className="input" aria-label="מייל" type="email" autoComplete="email" dir="ltr" placeholder="name@email.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      {mode !== 'reset' ? <input className="input" aria-label="סיסמה" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} dir="ltr" placeholder="סיסמה (לפחות 6 תווים)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /> : null}
      <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'רגע…' : mode === 'in' ? 'כניסה' : mode === 'up' ? 'יצירת חשבון' : 'שליחת קישור לאיפוס'}</button>
      {mode === 'in' ? <button type="button" className="linkish" onClick={() => { setMode('reset'); setInfo(''); onError(''); }}>שכחתי סיסמה</button> : null}
      {mode === 'reset' ? <button type="button" className="linkish" onClick={() => setMode('in')}>חזרה לכניסה</button> : null}
      {info ? <p className="ok-note" role="status">{info}</p> : null}
    </form>
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
        <p className="muted-text">{loginReason || 'מתחברים כדי לפנות למורים, לכתוב ביקורות ולהצטרף לקבוצות.'}</p>
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
        {!picking && api.mode !== 'demo' ? <EmailLogin api={api} onError={setErr} /> : null}
        {err ? <p className="err">{err}</p> : null}
        <p className="fine">בכניסה אתם מסכימים לתנאי השימוש. לא נפרסם דבר בשמכם.</p>
      </div>
    </dialog>
  );
}

/** Shown once after a new person signs up: name is needed, the rest is optional. */
export function ProfileSetup() {
  const { user, api, notify } = useApp();
  const [skipped, setSkipped] = useState(() => { try { return sessionStorage.getItem('naflaasimon-setup-skipped') === '1'; } catch { return false; } });
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const show = !!user && api.mode !== 'demo' && user.profileDone === false && !skipped;
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (show && !d.open) { setF({ name: user.name || '', phone: user.phone || '', birthDate: '', area: user.area || '' }); d.showModal(); }
    if (!show && d.open) d.close();
  }, [show, user]);
  const skip = () => { try { sessionStorage.setItem('naflaasimon-setup-skipped', '1'); } catch { /* private mode */ } setSkipped(true); };
  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { notify('כתבו שם', true); return; }
    if (f.phone.trim() && !isPhone(f.phone)) { notify('בדקו את מספר הטלפון, למשל 050-1234567', true); return; }
    setBusy(true);
    try { await api.saveMyContact({ name: f.name.trim(), phone: f.phone.trim(), birthDate: f.birthDate, area: f.area }); notify('נשמר. ברוכים הבאים!'); } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  return (
    <dialog ref={ref} className="modal" onCancel={(e) => { e.preventDefault(); skip(); }}>
      {f ? (
        <form className="modal-body setup-form" onSubmit={save} noValidate>
          <Coin size={44} />
          <h2>ברוכים הבאים</h2>
          <p className="muted-text">שם נדרש כדי שמורים ידעו מי פונה. כל השאר לא חובה, והפרטים נשמרים אצלנו ולא מוצגים באתר.</p>
          <label className="field-label" htmlFor="su-name">שם</label>
          <input id="su-name" className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <label className="field-label" htmlFor="su-phone">טלפון (לא חובה)</label>
          <input id="su-phone" className="input" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="050-1234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <label className="field-label" htmlFor="su-birth">תאריך לידה (לא חובה, אי אפשר לשנות אחר כך)</label>
          <input id="su-birth" className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
          <label className="field-label" htmlFor="su-area">אזור מגורים (לא חובה)</label>
          <input id="su-area" className="input" list="su-cities" autoComplete="off" placeholder="עיר או שכונה" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
          <datalist id="su-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          <p className="fine">המייל שלכם: <bdi>{user.email}</bdi></p>
          <div className="form-actions"><button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שומרים…' : 'שמירה והמשך'}</button><button type="button" className="btn btn-ghost" onClick={skip}>אחר כך</button></div>
        </form>
      ) : null}
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
  const [mine] = useMyTutor();
  const isTutor = !!mine;
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
          {isTutor ? (
            <>
              <a href="#panel" onClick={() => setOpen(false)}>פאנל מורה</a>
              <a href="#panel-groups" onClick={() => setOpen(false)}>קבוצות הלמידה שלי</a>
              <a href="#panel-inbox" onClick={() => setOpen(false)}>פניות מתלמידים</a>
            </>
          ) : null}
          <a href="#panel-seats" onClick={() => setOpen(false)}>הפניות וההרשמות שלי</a>
          <a href="#panel-me" onClick={() => setOpen(false)}>הפרטים שלי</a>
          {user.isAdmin ? <a href="#panel-admin" onClick={() => setOpen(false)}>ניהול מורים</a> : null}
          <button type="button" onClick={() => { setOpen(false); api.auth.signOut(); }}>התנתקות</button>
        </div>
      ) : null}
    </div>
  );
}

/** Shown while there is no internet connection. */
export function OfflineBar() {
  const { online } = useApp();
  if (online) return null;
  return <div className="offline-bar" role="status">אין חיבור לאינטרנט. מוצג המידע האחרון שנטען, ונעדכן כשהחיבור יחזור.</div>;
}

export function Header() {
  const { user, setLoginOpen, route, api } = useApp();
  const [mine] = useMyTutor();
  const isTutor = !!(user && mine);
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
          </nav>
          <div className="top-actions">
            {user ? <UserMenu /> : <button type="button" className="btn btn-ghost" onClick={() => setLoginOpen(true)}>כניסה</button>}
            {isTutor ? null : <a className="btn btn-brass hide-sm" href="#panel">פתיחת פרופיל מורה</a>}
          </div>
        </div>
      </header>
      {api.mode === 'demo' ? <div className="demo-strip"><div className="wrap">גרסת תצוגה: כל הנתונים לדוגמה, והכניסה עם Google מדומה.</div></div> : null}
    </>
  );
}

export function BottomNav() {
  const { route } = useApp();
  const items = [['', 'home', 'בית'], ['search', 'search', 'חיפוש'], ['groups', 'groups', 'קבוצות']];
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
          <a href="#search">חיפוש מורים</a><a href="#groups">קבוצות למידה</a><a href="#groups-marathons">מרתונים</a><a href="#panel">למורים</a><a href="#about">אודות ותנאי שימוש</a>
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

export function Loading() {
  return <div className="loading" aria-live="polite"><Coin size={34} /><span>טוען…</span></div>;
}

/**
 * Page change: a short coin-drop, like an asimon falling into the payphone slot (≈0.5s, small and quiet).
 * Only on the important moves: opening the site, a tutor profile, a group page, and entering
 * the personal area. Moving between lists stays instant.
 */
const IMPORTANT = (name) => name === 'tutor' || name === 'group' || name.startsWith('panel');
export function CoinTransition() {
  const { route } = useApp();
  const [n, setN] = useState(0);
  const prev = useRef(null);
  useEffect(() => {
    const key = route.name.startsWith('panel') ? 'panel' : route.name + (route.id || '');
    const first = prev.current === null;
    const changed = prev.current !== key;
    prev.current = key;
    if (changed && (first || IMPORTANT(route.name))) setN((x) => Math.abs(x) + 1);
  }, [route]);
  useEffect(() => {
    if (n <= 0) return undefined;
    const t = setTimeout(() => setN((x) => (x === n ? -x : x)), 520);
    return () => clearTimeout(t);
  }, [n]);
  if (n <= 0) return null;
  return (
    <div className="coin-veil" key={n} aria-hidden="true">
      <svg className="cv-svg" viewBox="0 0 120 150" width="64" height="80">
        <defs><clipPath id="cv-clip"><rect x="0" y="0" width="120" height="118" /></clipPath></defs>
        <g clipPath="url(#cv-clip)"><g className="cv-coin">
          <circle cx="60" cy="40" r="26" fill="#DFC166" stroke="#3A3130" strokeWidth="3" />
          <circle cx="60" cy="40" r="19" fill="none" stroke="#1A1406" strokeOpacity=".25" strokeWidth="2.4" />
          <rect x="44" y="37" width="32" height="6" rx="3" fill="#1A1406" fillOpacity=".55" />
        </g></g>
        <rect className="cv-slot" x="22" y="112" width="76" height="12" rx="6" fill="#3A3130" />
        <g className="cv-spark" stroke="#DFC166" strokeWidth="4" strokeLinecap="round">
          <path d="M14 100l-8-8M106 100l8-8M60 92v-12" />
        </g>
      </svg>
    </div>
  );
}
