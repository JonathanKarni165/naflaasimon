// Admin statistics (ניהול האתר → סטטיסטיקות): how many users, their ages, what people search for,
// monthly activity, and above all the searches that found no real tutor (unmet demand).
// Everything comes from one database call, admin_stats() in supabase/stats.sql; example tutors are left out.
import { useState } from 'react';
import { useApp, useLoad, to } from '../state.jsx';
import { dateShort } from '../lib/format.js';
import { Seg, Loading } from '../components/ui.jsx';

const PERIODS = [['30', '30 יום'], ['90', '3 חודשים'], ['365', 'שנה'], ['0', 'הכול']];
const MODE = { online: 'אונליין', frontal: 'פרונטלי', any: '' };
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const monthName = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
const n = (x) => (x || 0).toLocaleString('he-IL');

/** The search page link that repeats a logged search, so the admin can see what the visitor saw. */
function searchHref(z) {
  const p = new URLSearchParams();
  if (z.subject) p.set('subject', z.subject);
  if (z.topic) p.set('topic', z.topic);
  if (z.q) p.set('q', z.q);
  if (z.mode && z.mode !== 'any') p.set('mode', z.mode);
  if (z.kind !== 'groups' && z.place && z.place !== 'מיקום נוכחי') p.set('where', z.place);
  if (z.kind !== 'groups' && z.maxPrice) p.set('price', String(z.maxPrice));
  const qs = p.toString();
  return to(z.kind === 'groups' ? 'groups' : 'search') + (qs ? '?' + qs : '');
}

function Bars({ title, rows, empty = 'עוד אין נתונים.', showZero = true }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="st-block" aria-label={title}>
      <h3>{title}</h3>
      {!rows.length ? <p className="muted-text">{empty}</p> : (
        <ul className="st-bars">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="st-label">{r.label}{r.subject && r.subject !== r.label ? <small> · {r.subject}</small> : null}</span>
              <span className="st-bar" aria-hidden="true"><i style={{ width: `${(r.count / max) * 100}%` }} /></span>
              <span className="st-num"><bdi>{n(r.count)}</bdi>{showZero && r.zero ? <small className="st-zero" title="בלי מורה אמיתי בתוצאות"> · {n(r.zero)} בלי תוצאות</small> : null}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Stats() {
  const { api, user, version } = useApp();
  const [period, setPeriod] = useState('30');
  const [data, loading, error] = useLoad(() => api.adminStats(Number(period)), [user.id, version, period]);
  if (error) return <p className="err" role="alert">{error.message || String(error)}</p>;
  if (!data) return <Loading />;
  const t = data.totals || {};
  const zero = data.zero || [];
  const ages = data.ages || [];
  const ageMax = Math.max(1, ...ages.map((a) => Math.max(a.students, a.tutors)));
  const modes = data.modes || {};
  const modeTotal = Object.values(modes).reduce((a, b) => a + b, 0);
  const periodText = period === '0' ? 'מאז שהתחלנו לתעד' : `ב־${PERIODS.find(([k]) => k === period)[1]} האחרונים`;

  return (
    <div className={'stats' + (loading ? ' is-loading' : '')}>
      <div className="st-head">
        <p className="muted-text">נתוני השימוש באתר. מורים לדוגמה וחשבון הניהול לא נספרים. החיפושים נשמרים בלי לדעת מי חיפש.</p>
        <span className="sr-only" id="st-period">תקופה</span>
        <Seg label="st-period" value={period} onChange={setPeriod} options={PERIODS} />
      </div>

      <dl className="st-kpis">
        <div><dt>משתמשים רשומים</dt><dd><bdi>{n(t.users)}</bdi></dd><small>{n(t.newUsers)} חדשים {periodText}</small></div>
        <div><dt>תלמידים</dt><dd><bdi>{n(t.students)}</bdi></dd><small>חשבונות בלי פרופיל מורה</small></div>
        <div><dt>מורים פעילים</dt><dd><bdi>{n(t.tutors)}</bdi></dd><small>{t.tutorsPending ? `${n(t.tutorsPending)} ממתינים לאישור · ` : ''}{n(t.exampleTutors)} לדוגמה לא נספרים</small></div>
        <div><dt>חיפושים</dt><dd><bdi>{n(t.searches)}</bdi></dd><small>{periodText}</small></div>
        <div className="st-kpi-alert"><dt>חיפושים בלי מורה</dt><dd><bdi>{n(t.zeroSearches)}</bdi></dd><small>{t.searches ? `${Math.round((t.zeroSearches / t.searches) * 100)}% מהחיפושים` : 'עוד אין חיפושים'}</small></div>
        <div><dt>פניות למורים</dt><dd><bdi>{n(t.inquiries)}</bdi></dd><small>{t.inquiriesToExamples ? `${n(t.inquiriesToExamples)} מהן למורים לדוגמה · ` : ''}{n(t.groupSignups)} הרשמות לקבוצות</small></div>
      </dl>

      <section className="st-block st-unmet" aria-labelledby="st-unmet-h">
        <h2 id="st-unmet-h">חיפשו ולא מצאו מורה</h2>
        <p className="muted-text">חיפושים שלא הציגו אף מורה אמיתי {periodText}. ״רק לדוגמה״ = הופיעו רק מורים לדוגמה. לחיצה פותחת את אותו חיפוש.</p>
        {!zero.length ? <p className="muted-text">אין חיפושים כאלה {periodText}.</p> : (
          <div className="st-table-wrap">
            <table className="st-table">
              <thead><tr><th scope="col">מה חיפשו</th><th scope="col">איפה</th><th scope="col">פעמים</th><th scope="col">לאחרונה</th></tr></thead>
              <tbody>
                {zero.map((z, i) => (
                  <tr key={i}>
                    <td>
                      <a href={searchHref(z)}>{[z.subject, z.topic].filter(Boolean).join(' · ') || (z.q ? `״${z.q}״` : 'כל המקצועות')}</a>
                      {z.subject && z.q ? <small> · ״{z.q}״</small> : null}
                      {z.kind === 'groups' ? <span className="tag">קבוצות</span> : null}
                      {z.examplesOnly ? <span className="tag brass">רק לדוגמה</span> : null}
                      {z.maxPrice ? <small> · עד {z.maxPrice} ₪</small> : null}
                    </td>
                    <td>{[z.place, MODE[z.mode]].filter(Boolean).join(' · ') || '—'}</td>
                    <td><bdi>{n(z.count)}</bdi></td>
                    <td>{dateShort(z.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="st-h2">מה מחפשים</h2>
      <div className="st-cols">
        <Bars title="מקצועות" rows={data.subjects || []} />
        <Bars title="קורסים ושאלונים" rows={data.topics || []} />
        <Bars title="ערים ואזורים בחיפוש" rows={data.places || []} />
        <Bars title="מילים שהקלידו" rows={data.words || []} />
      </div>
      {modeTotal ? (
        <p className="muted-text st-modes">איך רוצים ללמוד: {['frontal', 'online', 'any'].map((k) => `${{ frontal: 'פרונטלי', online: 'אונליין', any: 'לא משנה' }[k]} ${Math.round(((modes[k] || 0) / modeTotal) * 100)}%`).join(' · ')}</p>
      ) : null}

      <h2 className="st-h2">מי המשתמשים</h2>
      <div className="st-cols">
        <section className="st-block" aria-label="גילאים">
          <h3>גילאים</h3>
          <p className="st-legend"><span className="st-key st-key-s" /> תלמידים <span className="st-key st-key-t" /> מורים</p>
          <ul className="st-bars st-ages">
            {ages.map((a) => (
              <li key={a.bucket}>
                <span className="st-label"><bdi dir="ltr">{a.bucket}</bdi></span>
                <span className="st-bar st-bar-2" aria-hidden="true"><i style={{ width: `${(a.students / ageMax) * 100}%`, minWidth: a.students ? 2 : 0 }} /><i className="t" style={{ width: `${(a.tutors / ageMax) * 100}%`, minWidth: a.tutors ? 2 : 0 }} /></span>
                <span className="st-num"><bdi>{n(a.students)}</bdi> · <bdi>{n(a.tutors)}</bdi></span>
              </li>
            ))}
          </ul>
          <p className="hint">לפי תאריך הלידה בחשבון. אצל תלמידים הוא לא חובה, ולכן חלק ב״לא ידוע״.</p>
        </section>
        <Bars title="אזורי מגורים (מהחשבון)" rows={data.areas || []} showZero={false} empty="עוד אין משתמשים שמילאו אזור." />
      </div>

      <h2 className="st-h2">פעילות לפי חודש</h2>
      <div className="st-table-wrap">
        <table className="st-table st-monthly">
          <thead><tr><th scope="col">חודש</th><th scope="col">נרשמו</th><th scope="col">מורים חדשים</th><th scope="col">חיפושים</th><th scope="col">בלי תוצאות</th><th scope="col">פניות</th><th scope="col">הרשמות לקבוצות</th></tr></thead>
          <tbody>
            {(data.monthly || []).map((m) => (
              <tr key={m.month}>
                <th scope="row">{monthName(m.month)}</th>
                <td>{n(m.signups)}</td><td>{n(m.tutors)}</td><td>{n(m.searches)}</td>
                <td className={m.zeroSearches ? 'st-zero' : ''}>{n(m.zeroSearches)}</td><td>{n(m.inquiries)}</td><td>{n(m.groupSignups)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">החיפושים נספרים מהיום שהפיצ׳ר עלה לאוויר, ולכן בחודשים קודמים יופיע 0. נתונים מעודכנים ל־{dateShort(data.generatedAt)}.</p>
    </div>
  );
}
