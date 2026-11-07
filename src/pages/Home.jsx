import { useMemo, useState } from 'react';
import { useApp, go } from '../state.jsx';
import { LEVELS } from '../data/constants.js';
import { filterTutors, sortTutors, globalMean } from '../lib/ranking.js';
import { TutorRow, GroupCard, Avatar, Loading, WherePicker, resolveWhere, TopicPicker } from '../components/ui.jsx';
import { optionLabel } from '../data/topics.js';

const TRACKS = [
  ['5 יח״ל', 'בגרות מוגברת', 'שאלונים 581, 582'],
  ['4 יח״ל', 'בגרות', 'שאלונים 471, 472'],
  ['3 יח״ל', 'בגרות', 'שאלונים 371, 372'],
  ['פסיכומטרי', 'פסיכומטרי', 'חשיבה כמותית'],
  ['אקדמיה', 'חדו״א ואלגברה', 'הנדסה ומדעים'],
  ['חטיבת ביניים', 'חטיבת ביניים', 'כיתות ז׳ עד ט׳'],
];

export default function Home() {
  const { tutors, groups, filters, setFilters } = useApp();
  const [subject, setSubject] = useState(filters.subject || '');
  const [level, setLevel] = useState(filters.level || '');
  const [topic, setTopic] = useState(filters.topic || '');
  const [where, setWhere] = useState(filters.mode === 'online' ? 'online' : filters.city || filters.place || '');
  const [kind, setKind] = useState('private');

  const count = useMemo(() => {
    if (!tutors) return null;
    if (kind === 'group') return (groups || []).filter((g) => (!subject || g.subject === subject) && (!level || g.level === level)).length;
    const w = resolveWhere(where);
    return filterTutors(tutors, { subject, level, mode: w.mode, place: w.place }).length;
  }, [tutors, groups, subject, level, where, kind]);

  const featured = useMemo(() => (tutors ? sortTutors(tutors, 'best').filter((t) => t.ratingCount >= 10 && t.photo).slice(0, 3) : []), [tutors]);
  const upcoming = useMemo(() => (groups ? [...groups].filter((g) => g.seatsTaken < g.maxSeats).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3) : []), [groups]);
  const proof = useMemo(() => {
    if (!tutors) return null;
    const n = tutors.reduce((a, t) => a + (t.ratingCount || 0), 0);
    return { n, avg: globalMean(tutors), faces: tutors.filter((t) => t.photo).slice(0, 4) };
  }, [tutors]);

  const submit = (e) => {
    e.preventDefault();
    if (kind === 'group') { setFilters((f) => ({ ...f, subject, level, topic })); go('groups'); return; }
    const w = resolveWhere(where);
    setFilters((f) => ({ ...f, subject, level, topic, ...w, sort: w.origin ? 'near' : 'best' }));
    go('search');
  };
  const track = (lvl) => { setFilters((f) => ({ ...f, subject: lvl === 'פסיכומטרי' ? '' : 'מתמטיקה', topic: '', level: lvl, sort: 'best' })); go('search'); };

  return (
    <main id="top">
      <div className="hero">
        <div className="wrap hero-grid">
          <h1>השיעור שבו <span className="hl">נופל האסימון</span></h1>
          {proof && proof.n ? (
            <div className="proof-row">
              <span className="faces" aria-hidden="true">{proof.faces.map((t) => <Avatar key={t.id} tutor={t} className="face" size={48} />)}</span>
              <span><b>{proof.avg.toFixed(1)}</b> ממוצע מתוך <bdi>{proof.n.toLocaleString('he-IL')}</bdi> ביקורות</span>
            </div>
          ) : null}
          <p className="lead">מורים פרטיים למתמטיקה ולשאר המקצועות. מחפשים לפי רמה ומיקום, משווים מחיר וביקורות, ופונים ישירות.</p>
          <figure className="hero-photo">
            <img src="img/hero.jpg" alt="סטודנטית עם משקפיים לומדת ליד שולחן עם מחשב ועפרונות צבעוניים" width="1200" height="800" />
            <div className="h-chip h-chip-tutor"><span className="dot" aria-hidden="true">✓</span><span><b>דנה, מורה למתמטיקה</b>מאומתת · 5 יח״ל</span></div>
            <div className="h-chip h-chip-aha"><b>״אה, עכשיו הבנתי!״</b><span>עידו, כיתה י״א</span></div>
            <svg className="h-coin" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#F2CC4B" stroke="#3A3130" strokeWidth="4" /><circle cx="50" cy="50" r="33" fill="none" stroke="#3A3130" strokeOpacity=".3" strokeWidth="3" /><rect x="22" y="45" width="56" height="10" rx="5" fill="#3A3130" /></svg>
          </figure>
        </div>
      </div>

      <div className="wrap search">
        <form className="card" onSubmit={submit} aria-label="חיפוש מורה">
          <div className="subjects">
            <label className="field-label" htmlFor="home-topic">מה רוצים ללמוד?</label>
            <TopicPicker id="home-topic" value={optionLabel({ subject, level, topic })}
              onPick={(o) => { setSubject(o?.subject || ''); setTopic(o?.topic || ''); setLevel(o ? (o.topic ? (o.level || level) : o.level) : ''); }} />
          </div>
          {/* A chosen topic or "subject - level" already says the level, so the separate level field goes away. */}
          <div className={subject && (topic || level) ? 'row1' : 'row2'}>
            {subject && (topic || level) ? null : (
              <div>
                <label className="field-label" htmlFor="home-level">רמה</label>
                <select className="select" id="home-level" value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="">כל הרמות</option>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="home-where">איפה?</label>
              <WherePicker id="home-where" value={where} onChange={setWhere} />
            </div>
          </div>
          <div>
            <span className="field-label" id="mode-label">סוג לימוד</span>
            <div className="seg" role="group" aria-labelledby="mode-label">
              <button type="button" aria-pressed={kind === 'private'} onClick={() => setKind('private')}>שיעור פרטי</button>
              <button type="button" aria-pressed={kind === 'group'} onClick={() => setKind('group')}>בקבוצה</button>
            </div>
          </div>
          <button type="submit" className="btn btn-brand go">{kind === 'group' ? 'חיפוש קבוצות' : 'חיפוש מורים'} {count != null ? <small>· {count} תוצאות</small> : null}</button>
        </form>
      </div>

      <section className="block" aria-labelledby="tracks-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="tracks-h">מתמטיקה לפי מסלול</h2><a href="#search">כל המורים</a></div>
          <div className="tracks">
            {TRACKS.map(([lvl, title, sub]) => (
              <button key={lvl} type="button" className="track" onClick={() => track(lvl)}>
                <span className="units">{lvl}</span><strong>{title}</strong><span>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="tutors-h">
        <div className="wrap">
          <div className="sec-head">
            <div><h2 id="tutors-h">מורים מומלצים</h2><p className="sec-sub">מדורגים לפי ציון משוקלל: גם כמה כוכבים וגם כמה ביקורות.</p></div>
            <a href="#search">לכל המורים</a>
          </div>
          {tutors ? <div className="t-rows">{featured.map((t) => <TutorRow key={t.id} tutor={t} />)}</div> : <Loading />}
        </div>
      </section>

      <section className="block" id="groups-sec" aria-labelledby="groups-h">
        <div className="wrap">
          <div className="sec-head">
            <div><h2 id="groups-h">לומדים בקבוצה, משלמים פחות</h2><p className="sec-sub">מרתונים לבגרות וקבוצות קטנות עם מורה מאומת. בערך חצי מחיר משיעור פרטי.</p></div>
            <a href="#groups">כל הקבוצות</a>
          </div>
          <div className="groups">
            {upcoming.map((g) => <GroupCard key={g.id} group={g} />)}
            <article className="group open">
              <strong>מלמדים? פתחו קבוצה</strong>
              <p className="t-meta">מעלים מרתון או קבוצה קבועה עם מטרה, תאריך ומחיר לתלמיד. התלמידים שומרים מקום ושואלים שאלות ישירות בעמוד הקבוצה.</p>
              <a className="btn btn-line t-cta" href="#panel-groups">פתיחת קבוצה</a>
            </article>
          </div>
        </div>
      </section>

      <section className="block why" aria-labelledby="why-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="why-h">למה לסמוך עלינו</h2></div>
          <div className="why-list">
            <div className="why-item"><div className="why-art"><img className="art" src="img/art-verified.svg" alt="" /></div><div><h3>מורים מאומתים</h3><p>מורה עם סימן ✓ עבר בדיקה של תעודת זהות ותארים או תעודות הוראה.</p></div></div>
            <div className="why-item"><div className="why-art"><img className="art" src="img/art-reviews.svg" alt="" /></div><div><h3>דירוג שאי אפשר לנפח</h3><p>ביקורת אחת לכל חשבון Google, והדירוג מתחשב בכמות: חמישה כוכבים מביקורת אחת לא עוקפים 40 ביקורות טובות.</p></div></div>
            <div className="why-item"><div className="why-art"><img className="art" src="img/art-phone.svg" alt="" /></div><div><h3>ישר למורה, בלי עמלה</h3><p>שולחים פנייה מהפרופיל, המורה עונה לכם באתר או בטלפון, ומשלמים לו ישירות.</p></div></div>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="how-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="how-h">איך זה עובד</h2></div>
          <ol className="steps">
            <li className="step"><span className="n">1</span><div><h3>מחפשים</h3><p>מקצוע, רמה ועיר. ממיינים לפי הכי קרוב, הכי זול או הכי מבוקש.</p></div></li>
            <li className="step"><span className="n">2</span><div><h3>משווים</h3><p>מחיר פרונטלי ואונליין, ניסיון וביקורות של תלמידים.</p></div></li>
            <li className="step"><span className="n">3</span><div><h3>שולחים פנייה</h3><p>נכנסים עם Google ושולחים למורה פנייה. התשובה מחכה לכם באזור האישי.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="band" id="teachers" aria-labelledby="teach-h">
        <div className="wrap">
          <div className="band-art"><img className="art" src="img/art-teacher.svg" alt="" /></div>
          <div style={{ display: 'grid', gap: 10 }}>
            <h2 id="teach-h">מלמדים? תנו לתלמידים למצוא אתכם</h2>
            <p>פותחים פרופיל בכמה דקות ומקבלים פניות ישירות מתלמידים ומהורים.</p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <ul>
              <li>פרופיל עם מחיר פרונטלי ואונליין, אזור ורמות</li>
              <li>ביקורות מתלמידים שלמדו אצלכם</li>
              <li>תיבת פניות אישית, בלי לפרסם את הטלפון שלכם</li>
              <li>קבוצות ומרתונים עם הרשמה ושמירת מקום</li>
            </ul>
            <a className="btn btn-brand" href="#panel">פתיחת פרופיל מורה</a>
          </div>
        </div>
      </section>
    </main>
  );
}
