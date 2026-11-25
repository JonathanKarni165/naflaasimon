import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, go, to } from '../state.jsx';
import { filterTutors, sortTutors, globalMean } from '../lib/ranking.js';
import { GroupCard, Avatar, WherePicker, resolveWhere, TopicPicker } from '../components/ui.jsx';
import { optionLabel } from '../data/topics.js';
import { groupEnded } from '../lib/format.js';

// Each tile opens the search on one course: [badge, title, line, subject, course].
const TRACKS = [
  ['5 יח״ל', 'בגרות מוגברת', 'שאלונים 581, 582', 'מתמטיקה', '5 יח״ל'],
  ['4 יח״ל', 'בגרות', 'שאלונים 471, 472', 'מתמטיקה', '4 יח״ל'],
  ['3 יח״ל', 'בגרות', 'שאלונים 371, 372', 'מתמטיקה', '3 יח״ל'],
  ['פסיכומטרי', 'פסיכומטרי', 'חשיבה כמותית', 'פסיכומטרי', ''],
  ['חדו״א 1', 'אקדמיה', 'הנדסה ומדעים', 'מתמטיקה', 'חדו״א 1'],
  ['חטיבת ביניים', 'חטיבת ביניים', 'כיתות ז׳ עד ט׳', 'מתמטיקה', 'חטיבת ביניים'],
];

export default function Home() {
  const { tutors, groups, filters, setFilters } = useApp();
  // The home search box always starts empty (grey "מקצוע לימוד"), not with the last search.
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [where, setWhere] = useState(filters.mode === 'online' ? 'online' : filters.city || filters.place || '');
  const [kind, setKind] = useState('private');
  // Online / frontal / "לא משנה", carried to the search and groups pages.
  const [learn, setLearn] = useState(filters.mode === 'online' || filters.mode === 'frontal' ? filters.mode : 'any');

  const count = useMemo(() => {
    if (!tutors) return null;
    if (kind === 'group') return (groups || []).filter((g) => (!subject || g.subject === subject) && (learn === 'any' || g.mode === learn)).length;
    const w = resolveWhere(where);
    return filterTutors(tutors, { subject, topic, mode: learn !== 'any' ? learn : w.mode, place: w.place }).length;
  }, [tutors, groups, subject, topic, where, kind, learn]);

  const upcoming = useMemo(() => (groups ? [...groups].filter((g) => g.seatsTaken < g.maxSeats && !groupEnded(g)).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3) : []), [groups]);
  const proof = useMemo(() => {
    if (!tutors) return null;
    const n = tutors.reduce((a, t) => a + (t.ratingCount || 0), 0);
    return { n, avg: globalMean(tutors), faces: tutors.filter((t) => t.photo).slice(0, 4) };
  }, [tutors]);

  const submit = (e) => {
    e.preventDefault();
    if (kind === 'group') { setFilters((f) => ({ ...f, subject, topic, mode: learn })); go('groups'); return; }
    const w = resolveWhere(where);
    setFilters((f) => ({ ...f, subject, topic, ...w, mode: learn !== 'any' ? learn : w.mode, sort: w.origin && learn !== 'online' ? 'near' : 'best' }));
    go('search');
  };
  const track = (subject, topic) => { setFilters((f) => ({ ...f, subject, topic, sort: 'best' })); go('search'); };

  return (
    <main id="top">
      <div className="hero hero-video">
        <HeroPhoto />
        <div className="hero-shade" aria-hidden="true" />
        <div className="wrap hero-v-inner">
          <h1>השיעור שבו <span className="hl">נופל האסימון</span></h1>
          <p className="lead">מורים פרטיים למתמטיקה ולשאר המקצועות. מחפשים לפי מקצוע ומיקום, משווים מחיר וביקורות, ופונים ישירות.</p>
          <ul className="hero-points">
            <li>פנייה חינם, בלי עמלות</li>
            <li>ביקורות של תלמידים אמיתיים</li>
            <li>פרונטלי או אונליין</li>
          </ul>
          {proof && proof.n >= 20 ? (
            <div className="proof-row">
              <span className="faces" aria-hidden="true">{proof.faces.map((t) => <Avatar key={t.id} tutor={t} className="face" size={48} />)}</span>
              <span><b>{proof.avg.toFixed(1)}</b> ממוצע מתוך <bdi>{proof.n.toLocaleString('he-IL')}</bdi> ביקורות</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="wrap search">
        <form className="card" onSubmit={submit} aria-label="חיפוש מורה">
          <div className="subjects">
            <label className="field-label" htmlFor="home-topic">מה רוצים ללמוד?</label>
            <TopicPicker id="home-topic" value={optionLabel({ subject, topic })}
              onPick={(o) => { setSubject(o?.subject || ''); setTopic(o?.topic || ''); }} />
          </div>
          <div className="row1">
            <div>
              <label className="field-label" htmlFor="home-where">איפה?</label>
              <WherePicker id="home-where" value={where} onChange={setWhere} />
            </div>
          </div>
          <div className="card-segs">
          <div>
            <span className="field-label" id="learn-label">איך לומדים?</span>
            <div className="seg seg-3" role="group" aria-labelledby="learn-label">
              <button type="button" aria-pressed={learn === 'any'} onClick={() => setLearn('any')}>לא משנה</button>
              <button type="button" aria-pressed={learn === 'frontal'} onClick={() => setLearn('frontal')}>פרונטלי</button>
              <button type="button" aria-pressed={learn === 'online'} onClick={() => setLearn('online')}>אונליין</button>
            </div>
          </div>
          <div>
            <span className="field-label" id="mode-label">סוג לימוד</span>
            <div className="seg" role="group" aria-labelledby="mode-label">
              <button type="button" aria-pressed={kind === 'private'} onClick={() => setKind('private')}>שיעור פרטי</button>
              <button type="button" aria-pressed={kind === 'group'} onClick={() => setKind('group')}>בקבוצה</button>
            </div>
          </div>
          </div>
          <button type="submit" className="btn btn-brand go">{kind === 'group' ? 'חיפוש קבוצות' : 'חיפוש מורים'} {count != null ? <small>· {count} תוצאות</small> : null}</button>
        </form>
      </div>

      <section className="block" aria-labelledby="tracks-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="tracks-h">מתמטיקה לפי מסלול</h2><a href={to('search')}>כל המורים</a></div>
          <div className="tracks">
            {TRACKS.map(([lvl, title, sub, subj, course]) => (
              <button key={lvl} type="button" className="track" onClick={() => track(subj, course)}>
                <span className="units">{lvl}</span><strong>{title}</strong><span>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="block" id="groups-sec" aria-labelledby="groups-h">
        <div className="wrap">
          <div className="sec-head">
            <div><h2 id="groups-h">לומדים בקבוצה, משלמים פחות</h2><p className="sec-sub">מרתונים לבגרות וקבוצות קטנות עם מורה מאומת. בערך חצי מחיר משיעור פרטי.</p></div>
            <a href={to('groups')}>כל הקבוצות</a>
          </div>
          <figure className="group-photo">
            <img src="img/hero-3-1200.webp" srcSet="img/hero-3-600.webp 600w, img/hero-3-1200.webp 1200w" sizes="(max-width: 900px) 100vw, 1100px" loading="lazy" decoding="async" width="1200" height="960" alt="שלוש חברות לומדות יחד ליד שולחן עם מחשבים וצוחקות" />
            <figcaption>לומדים יחד, בכיתה, בזום או בבית קפה</figcaption>
          </figure>
          <div className="groups">
            {upcoming.map((g) => <GroupCard key={g.id} group={g} />)}
            <article className="group open">
              <strong>מלמדים? פתחו קבוצה</strong>
              <p className="t-meta">מעלים מרתון או קבוצה קבועה עם מטרה, תאריך ומחיר לתלמיד. התלמידים שומרים מקום ושואלים שאלות ישירות בעמוד הקבוצה.</p>
              <a className="btn btn-line t-cta" href={to('panel-groups')}>פתיחת קבוצה</a>
            </article>
          </div>
        </div>
      </section>

      <section className="block why" aria-labelledby="why-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="why-h">למה לסמוך עלינו</h2></div>
          <div className="why-list">
            <div className="why-item"><div className="why-art"><img className="art" loading="lazy" decoding="async" src="img/art-verified.svg" alt="" /></div><div><h3>מורים מאומתים</h3><p>מורה עם סימן ✓ עבר בדיקה של תעודת זהות ותארים או תעודות הוראה.</p></div></div>
            <div className="why-item"><div className="why-art"><img className="art" loading="lazy" decoding="async" src="img/art-reviews.svg" alt="" /></div><div><h3>דירוג שאי אפשר לנפח</h3><p>ביקורת אחת לכל חשבון, והדירוג מתחשב בכמות: חמישה כוכבים מביקורת אחת לא עוקפים 40 ביקורות טובות.</p></div></div>
            <div className="why-item"><div className="why-art"><img className="art" loading="lazy" decoding="async" src="img/art-phone.svg" alt="" /></div><div><h3>ישר למורה, בלי עמלה</h3><p>שולחים פנייה מהפרופיל, המורה עונה לכם באתר או בטלפון, ומשלמים לו ישירות.</p></div></div>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="how-h">
        <div className="wrap">
          <div className="sec-head"><h2 id="how-h">איך זה עובד</h2></div>
          <ol className="steps">
            <li className="step"><span className="n">1</span><div><h3>מחפשים</h3><p>מקצוע, רמה ועיר. ממיינים לפי המומלצים, הכי קרוב או הכי מבוקש.</p></div></li>
            <li className="step"><span className="n">2</span><div><h3>משווים</h3><p>מחיר פרונטלי ואונליין, ניסיון וביקורות של תלמידים.</p></div></li>
            <li className="step"><span className="n">3</span><div><h3>שולחים פנייה</h3><p>נכנסים לחשבון (Google או מייל) ושולחים למורה פנייה. התשובה מחכה לכם באזור האישי.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="band" id="teachers" aria-labelledby="teach-h">
        <div className="wrap">
          <div className="band-art"><img className="art" loading="lazy" decoding="async" src="img/art-teacher.svg" alt="" /></div>
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
            <a className="btn btn-brand" href={to('panel')}>פתיחת פרופיל מורה</a>
          </div>
        </div>
      </section>
    </main>
  );
}

// Real study moments (Unsplash free licence): students on the grass, at a cafe, on the beach, a study group,
// lecturers. A different photo every 3 hours, the same for everyone at that time (index.html preloads it
// with the same math). 2400px source so it stays sharp on wide and retina screens.
// [file stem, where the people are in the frame], so the crop keeps them in view on wide and narrow screens.
const HERO_PHOTOS = [['01', '42% 55%'], ['02', '50% 55%'], ['03', '40% 45%'], ['04', '50% 40%'], ['05', '45% 35%'],
  ['06', '50% 60%'], ['07', '35% 35%'], ['08', '60% 35%'], ['09', '30% 60%']];
const HERO_EVERY = 3 * 3600e3;
function HeroPhoto() {
  const [n, pos] = HERO_PHOTOS[Math.floor(Date.now() / HERO_EVERY) % HERO_PHOTOS.length];
  const stem = 'img/hero-' + n;
  return <img className="hero-media on" src={stem + '-1280.webp'} srcSet={`${stem}-1280.webp 1280w, ${stem}-2400.webp 2400w`} sizes="100vw"
    alt="" width="2400" height="1600" fetchpriority="high" style={{ objectPosition: pos }} />;
}

