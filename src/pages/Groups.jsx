import { useMemo, useState } from 'react';
import { useApp, useLoad } from '../state.jsx';
import { SUBJECTS } from '../data/constants.js';
import { money, dateLong, relDays, dateShort, isPhone } from '../lib/format.js';
import { GroupCard, Seg, SeatDots, Avatar, Verified, Stars, Loading, Empty } from '../components/ui.jsx';

export const isMarathon = (g) => Number(g.sessions) <= 1 || /מרתון/.test(g.title || '');

export function Groups({ initialKind = 'any' }) {
  const { groups, filters } = useApp();
  const [subject, setSubject] = useState(filters.subject || '');
  const [mode, setMode] = useState('any');
  const [kind, setKind] = useState(initialKind);
  const [q, setQ] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const list = useMemo(() => {
    const words = q.trim().split(/\s+/).filter(Boolean);
    return (groups || [])
      .filter((g) => (!subject || g.subject === subject) && (mode === 'any' || g.mode === mode) && (!onlyOpen || g.seatsTaken < g.maxSeats))
      .filter((g) => kind === 'any' || (kind === 'marathon') === isMarathon(g))
      .filter((g) => {
        if (!words.length) return true;
        const hay = [g.title, g.description, g.subject, g.level, g.city, g.location, g.tutor?.name].filter(Boolean).join(' ');
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [groups, subject, mode, onlyOpen, kind, q]);

  const subjects = useMemo(() => [...new Set([...(groups || []).map((g) => g.subject).filter(Boolean)])].sort((a, b) => SUBJECTS.indexOf(a) - SUBJECTS.indexOf(b)), [groups]);

  return (
    <main className="wrap page-pad">
      <div className="page-head">
        <h1>קבוצות למידה ומרתונים</h1>
        <p className="muted-text">מורים מעלים קבוצה עם מטרה, תאריך ומחיר לתלמיד. שומרים מקום בלחיצה ושואלים את המורה ישירות.</p>
      </div>
      <div className="group-filters">
        <label className="sr-only" htmlFor="g-q">חיפוש קבוצה או מרתון</label>
        <input id="g-q" className="input" type="search" placeholder="חיפוש: 472, גאומטריה, פסיכומטרי, שם מורה…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="sr-only" id="g-kind">סוג קבוצה</span>
        <Seg label="g-kind" value={kind} onChange={setKind} options={[['any', 'הכול'], ['marathon', 'מרתונים'], ['course', 'קבוצות קבועות']]} />
        <div className="chips" role="group" aria-label="מקצוע">
          <button type="button" className="chip" aria-pressed={!subject} onClick={() => setSubject('')}>הכול</button>
          {subjects.map((s) => <button key={s} type="button" className="chip" aria-pressed={subject === s} onClick={() => setSubject(s)}>{s}</button>)}
        </div>
        <div className="gf-row">
          <span className="sr-only" id="g-mode">סוג</span>
          <Seg label="g-mode" value={mode} onChange={setMode} options={[['any', 'הכול'], ['online', 'אונליין'], ['frontal', 'פרונטלי']]} />
          <label className="check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> רק קבוצות עם מקום פנוי</label>
        </div>
      </div>
      {!groups ? <Loading /> : list.length === 0 ? (
        <Empty title="אין כרגע קבוצות שמתאימות">
          <p>{kind === 'marathon' ? 'אין כרגע מרתון שמתאים. נסו מקצוע אחר, או בקשו מהמורה שלכם לפתוח מרתון.' : 'נסו מקצוע אחר, או בקשו מהמורה שלכם לפתוח קבוצה.'}</p>
        </Empty>
      ) : (
        <div className="groups groups-page">{list.map((g) => <GroupCard key={g.id} group={g} />)}</div>
      )}
      <div className="band-inline">
        <div><h2>מלמדים? פתחו קבוצה או מרתון</h2><p className="muted-text">למשל ״מרתון לבגרות 472״ ביום שישי, 90 ₪ לתלמיד. אתם קובעים מטרה, תאריך, מחיר ומספר מקומות.</p></div>
        <a className="btn btn-brand" href="#panel-groups">פתיחת קבוצה</a>
      </div>
    </main>
  );
}

export function Group({ id }) {
  const { api, user, version, reload, requireLogin, notify } = useApp();
  const [group, loading] = useLoad(() => api.getGroup(id), [id, version]);
  const [seats, , , refreshSeats] = useLoad(() => api.mySeats(), [user?.id, version]);
  const [messages, , , refreshMsgs] = useLoad(() => api.listGroupMessages(id), [id, version]);
  const [joining, setJoining] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !group) return <main className="wrap page-pad"><Loading /></main>;
  if (!group) return <main className="wrap page-pad"><Empty title="הקבוצה לא נמצאה"><a className="btn btn-brand" href="#groups">לכל הקבוצות</a></Empty></main>;

  const t = group.tutor;
  const mine = (seats || []).find((s) => s.groupId === id);
  const full = group.seatsTaken >= group.maxSeats;
  const approval = group.joinMode === 'approval';
  const activeSeat = mine && mine.status !== 'declined' ? mine : null;
  const isTutor = user && t && (user.id === t.ownerId || user.isAdmin);

  const startJoin = () => {
    if (!requireLogin('כדי לשמור מקום בקבוצה צריך להתחבר. ככה המורה יודע מי נרשם.')) return;
    setForm({ name: user.name, phone: user.phone || '', note: '' }); setJoining(true);
  };
  const join = async (e) => {
    e.preventDefault();
    if (!isPhone(form.phone)) { notify('בדקו את מספר הטלפון, למשל 050-1234567', true); return; }
    setBusy(true);
    try {
      const st = await api.joinGroup(id, form);
      if (!user.phone && form.phone.trim()) api.saveMyContact({ name: user.name, phone: form.phone.trim() }).catch(() => {});
      notify(st === 'pending' ? 'הבקשה נשלחה למורה. נעדכן אתכם כשיאשר.' : 'שמרנו לכם מקום! המורה יצור קשר לפני המפגש.');
      setJoining(false); refreshSeats(); reload();
    } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  const leave = async () => {
    setBusy(true);
    try { await api.leaveGroup(id); notify('ביטלנו את ההרשמה'); refreshSeats(); reload(); } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    if (!requireLogin('כדי לשאול את המורה שאלה צריך להתחבר.')) return;
    try { await api.addGroupMessage(id, msg.trim()); setMsg(''); refreshMsgs(); } catch (err) { notify(err.message, true); }
  };

  return (
    <main className="wrap page-pad">
      <a className="back" href="#groups">→ לכל הקבוצות</a>
      <div className="profile">
        <div className="profile-main">
          <header className="g-head">
            <div className="g-top"><span className="units">{group.level || group.subject}</span><span className="g-when">{relDays(group.startDate) === 'כבר התחילה' ? 'פעילה' : `מתחילה ${relDays(group.startDate)}`}</span></div>
            <h1>{group.title}</h1>
            <p className="p-headline">{group.subject}{group.level && group.level !== group.subject ? ` · ${group.level}` : ''}</p>
          </header>
          <dl className="facts facts-grid">
            <div><dt>תאריך התחלה</dt><dd>{dateLong(group.startDate)}</dd></div>
            <div><dt>מתי</dt><dd>{group.time || 'יתואם עם המורה'}</dd></div>
            <div><dt>מפגשים</dt><dd>{group.sessions > 1 ? `${group.sessions} מפגשים` : 'מפגש אחד'}</dd></div>
            <div><dt>איפה</dt><dd>{group.mode === 'online' ? 'אונליין (קישור יישלח לנרשמים)' : group.location || group.city}</dd></div>
          </dl>
          {group.description ? <section className="p-sec"><h2>מה עושים בקבוצה</h2><p className="p-about">{group.description}</p></section> : null}

          {t ? (
            <section className="p-sec">
              <h2>המורה</h2>
              <a className="mini-tutor" href={`#tutor-${t.id}`}>
                <Avatar tutor={t} className="mini-photo" size={72} />
                <span><b>{t.name}</b> <Verified tutor={t} /><span className="t-meta">{t.headline}</span><Stars avg={t.ratingAvg} count={t.ratingCount} /></span>
              </a>
            </section>
          ) : null}

          <section className="p-sec" aria-labelledby="qa-h">
            <h2 id="qa-h">שאלות למורה</h2>
            <p className="muted-text">השאלות והתשובות גלויות לכל מי שמתעניין בקבוצה.</p>
            <div className="thread">
              {(messages || []).map((m) => (
                <div key={m.id} className={'bubble-msg' + (m.isTutor ? ' tutor' : '')}>
                  <b>{m.userName}{m.isTutor ? ' · המורה' : ''}</b><p>{m.text}</p><small>{dateShort(m.createdAt)}</small>
                </div>
              ))}
              {messages && !messages.length ? <p className="muted-text">עוד אין שאלות. רוצים לדעת משהו לפני שנרשמים? שאלו כאן.</p> : null}
            </div>
            <form className="msg-form" onSubmit={send}>
              <label className="sr-only" htmlFor="msg">שאלה למורה</label>
              <input id="msg" className="input" maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={isTutor ? 'תשובה לתלמידים…' : 'למשל: יש הקלטה למי שלא מגיע?'} />
              <button type="submit" className="btn btn-brand">שליחה</button>
            </form>
          </section>
        </div>

        <aside className="profile-side">
          <div className="side-card">
            <div className="side-price"><b><bdi>{money(group.pricePerPerson)}</bdi></b><span>{group.sessions > 1 ? 'לתלמיד לכל מפגש' : 'לתלמיד'}</span></div>
            {group.sessions > 1 ? <p className="hint">סה״כ <bdi>{money(group.pricePerPerson * group.sessions)}</bdi> ל־{group.sessions} מפגשים</p> : null}
            <SeatDots taken={group.seatsTaken} max={group.maxSeats} />
            <p className="join-mode">{approval ? 'הצטרפות באישור המורה: שולחים בקשה, והמורה מאשר.' : 'הרשמה פתוחה: נרשמים ונכנסים מיד.'}</p>
            {activeSeat ? (
              <div className={'joined' + (activeSeat.status === 'pending' ? ' pending' : '')}>
                <b>{activeSeat.status === 'pending' ? '⏳ הבקשה ממתינה לאישור המורה' : '✓ אתם בקבוצה'}</b>
                <p className="hint">{activeSeat.status === 'pending' ? `שלחתם בקשה ב־${dateShort(activeSeat.createdAt)}. ברגע שהמורה יאשר, תראו את זה כאן וב״הפניות וההרשמות שלי״.` : `נרשמתם ב־${dateShort(activeSeat.createdAt)}. המורה יקבל את הטלפון שלכם ויצור קשר לתיאום תשלום.`}</p>
                <button type="button" className="btn btn-line btn-sm" onClick={leave} disabled={busy}>{activeSeat.status === 'pending' ? 'ביטול הבקשה' : 'ביטול ההרשמה'}</button>
              </div>
            ) : joining ? (
              <form className="join-form" onSubmit={join}>
                <label className="field-label" htmlFor="j-name">שם התלמיד/ה</label>
                <input id="j-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <label className="field-label" htmlFor="j-phone">טלפון לתיאום</label>
                <input id="j-phone" className="input" required type="tel" autoComplete="tel" inputMode="tel" dir="ltr" placeholder="050-1234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <label className="field-label" htmlFor="j-note">הערה למורה (לא חובה)</label>
                <input id="j-note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="כיתה, נושא שקשה לכם…" />
                <button type="submit" className="btn btn-brand go" disabled={busy}>{busy ? 'שולחים…' : approval ? 'שליחת בקשה למורה' : 'שמירת מקום'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setJoining(false)}>ביטול</button>
              </form>
            ) : (
              <>
                {mine?.status === 'declined' ? <p className="hint">המורה לא אישר/ה את הבקשה הקודמת שלכם. אפשר לשאול אותו/ה למטה למה, או לשלוח שוב.</p> : null}
                <button type="button" className="btn btn-brand go" onClick={startJoin} disabled={full}>{full ? 'הקבוצה מלאה' : approval ? 'בקשת הצטרפות' : 'אני נכנס/ת, שמרו לי מקום'}</button>
              </>
            )}
            {t && !isTutor ? <a className="btn btn-line btn-sm" href={`#tutor-${t.id}`}>פנייה פרטית למורה</a> : null}
            {isTutor ? <a className="btn btn-line btn-sm" href="#panel-groups">{group.pendingCount ? `${group.pendingCount} ממתינים לאישור בפאנל` : 'לרשימת הנרשמים בפאנל'}</a> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
