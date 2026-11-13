import { useMemo, useState } from 'react';
import { useApp } from '../state.jsx';
import { LEVELS } from '../data/constants.js';
import { filterTutors, sortTutors, topicFirst, queryFirst, blendedRank } from '../lib/ranking.js';
import { optionLabel } from '../data/topics.js';
import { TutorRow, Seg, Loading, Empty, WherePicker, resolveWhere, TopicPicker } from '../components/ui.jsx';

const SORTS = [
  ['best', 'מומלצים'],
  ['near', 'הכי קרוב'],
  ['popular', 'הכי מבוקש'],
];

export default function Search() {
  const { tutors, filters: f, setFilters, resetFilters } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [locMsg, setLocMsg] = useState('');
  const set = (patch) => setFilters((x) => ({ ...x, ...patch }));

  const results = useMemo(() => {
    if (!tutors) return null;
    return f.sort === 'best'
      ? blendedRank(filterTutors(tutors, f), { q: f.q, topic: f.topic, origin: f.origin, mode: f.mode })
      : queryFirst(topicFirst(sortTutors(filterTutors(tutors, f), f.sort, { origin: f.origin, mode: f.mode }), f.topic), f.q);
  }, [tutors, f]);

  const [whereText, setWhereText] = useState(f.mode === 'online' ? 'online' : f.city === 'המיקום שלי' ? '' : f.city || f.place || '');
  const pickWhere = (text) => {
    setWhereText(text);
    const w = resolveWhere(text);
    set({ ...w, mode: w.mode === 'online' ? 'online' : f.mode === 'online' ? 'any' : f.mode, sort: w.origin && f.sort === 'best' ? 'near' : f.sort });
  };
  const useMyLocation = () => {
    setLocMsg('מאתרים…');
    if (!navigator.geolocation) { setLocMsg('הדפדפן לא תומך באיתור מיקום. בחרו עיר מהרשימה.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { set({ origin: { lat: p.coords.latitude, lng: p.coords.longitude }, city: 'המיקום שלי', place: '', sort: 'near' }); setWhereText(''); setLocMsg(''); },
      () => setLocMsg('לא קיבלנו הרשאה למיקום. בחרו עיר מהרשימה.'),
      { timeout: 8000, maximumAge: 600000 },
    );
  };

  const activeCount = [f.level, f.mode !== 'any', f.maxPrice, f.maxKm, f.q, f.place].filter(Boolean).length;

  return (
    <main className="wrap page-pad">
      <div className="page-head">
        <h1>מורים פרטיים{f.subject ? ` ל${f.subject}` : ''}{f.topic ? `: ${f.topic}` : f.level ? `, ${f.level}` : ''}</h1>
        <div className="topic-search">
          <label className="field-label" htmlFor="topic">מה רוצים ללמוד?</label>
          <TopicPicker id="topic" value={optionLabel(f)} onPick={(o) => set(o
            ? { subject: o.subject, topic: o.topic, level: o.topic ? (o.level || f.level) : o.level }
            : { subject: '', topic: '', level: '' })} />
        </div>
        <p className="muted-text head-meta">{results ? `${results.length} מורים` : ''}{f.city && f.origin ? ` · מרחקים מ${f.city === 'המיקום שלי' ? 'המיקום שלכם' : f.city}` : ''} · <span className="marathon-link">מחפשים מרתון או קבוצה? <a href="#groups-marathons">לחיפוש מרתונים</a></span></p>
      </div>

      <div className="search-layout">

        <section className="results" aria-label="תוצאות">
          <div className="sortbar">
            <button type="button" className={'btn btn-sm filter-btn' + (showFilters ? ' btn-brand' : ' btn-line')} aria-expanded={showFilters} onClick={() => setShowFilters((x) => !x)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              סינון{activeCount ? ` (${activeCount})` : ''}
            </button>
            <div className="chips" role="group" aria-label="מיון">
              {SORTS.map(([v, label]) => <button key={v} type="button" className="chip" aria-pressed={f.sort === v} onClick={() => set({ sort: v })}>{label}</button>)}
            </div>
          </div>
          <aside className={'filters' + (showFilters ? ' open' : '')} aria-label="סינון">
            <div className="filters-inner">
              <div className="filters-top"><h2>סינון</h2><button type="button" className="linkish" onClick={() => { resetFilters(); setWhereText(''); }}>ניקוי</button></div>

              <div className="f-field">
              <label className="field-label" htmlFor="q">חיפוש לפי שם או מילה</label>
              <input id="q" className="input" type="search" placeholder="שם מורה, עיר, מילה מהפרופיל…" value={f.q} onChange={(e) => set({ q: e.target.value })} />
              </div>

              {f.subject && (f.topic || f.level) ? null : (
                <div className="f-field">
                  <label className="field-label" htmlFor="f-level">רמה</label>
                  <select id="f-level" className="select" value={f.level} onChange={(e) => set({ level: e.target.value })}>
                    <option value="">כל הרמות</option>
                    {LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              )}

              <div className="f-field">
              <span className="field-label" id="f-mode">איך לומדים</span>
              <Seg label="f-mode" value={f.mode} onChange={(mode) => set({ mode })} options={[['any', 'הכול'], ['frontal', 'פרונטלי'], ['online', 'אונליין']]} />
              </div>

              <div className="f-field">
              <label className="field-label" htmlFor="f-city">אני נמצא/ת ב…</label>
              <WherePicker id="f-city" value={whereText} onChange={pickWhere} placeholder={f.city === 'המיקום שלי' ? 'המיקום הנוכחי שלי' : 'עיר או שכונה'} />
              <button type="button" className="btn btn-line btn-sm loc-btn" onClick={useMyLocation}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
                להשתמש במיקום הנוכחי
              </button>
              {locMsg ? <p className="hint">{locMsg}</p> : null}
              </div>

              {f.origin && f.mode !== 'online' ? (
                <div className="f-field">
                  <label className="field-label" htmlFor="f-km">מרחק מקסימלי: {f.maxKm ? `${f.maxKm} ק״מ` : 'ללא הגבלה'}</label>
                  <input id="f-km" type="range" min="0" max="60" step="5" value={f.maxKm} onChange={(e) => set({ maxKm: Number(e.target.value) })} />
                </div>
              ) : null}

              <div className="f-field">
              <label className="field-label" htmlFor="f-price">מחיר לשעה עד: {f.maxPrice ? `${f.maxPrice} ₪` : 'ללא הגבלה'}</label>
              <input id="f-price" type="range" min="0" max="250" step="10" value={f.maxPrice} onChange={(e) => set({ maxPrice: Number(e.target.value) })} />
              </div>

              <button type="button" className="btn btn-brand go only-sm" onClick={() => setShowFilters(false)}>הצגת {results?.length ?? ''} מורים</button>
            </div>
          </aside>
          <p className="sort-note">
            {f.sort === 'best' && 'מדורג לפי ציון משוקלל: התאמה למה שחיפשתם, דירוג, כמות ביקורות ופניות, ומרחק אם בחרתם מיקום. מורה עם 40 ביקורות של 4.8 יופיע לפני מורה עם ביקורת אחת של 5.'}
            {f.sort === 'near' && (f.origin ? 'המורים הקרובים אליכם קודם. מורים שמלמדים רק אונליין מופיעים בסוף.' : 'בחרו עיר או השתמשו במיקום הנוכחי כדי למיין לפי מרחק.')}
            {f.sort === 'popular' && 'המורים שהכי הרבה תלמידים פנו אליהם וכתבו עליהם ביקורת.'}
          </p>
          {f.sort === 'near' ? (
            <div className="inline-pick">
              <label className="sr-only" htmlFor="near-where">איפה אתם?</label>
              {/* Type a city or neighbourhood (same field as "אני נמצא/ת ב…"), not only pick from a long list. */}
              <WherePicker id="near-where" value={whereText === 'online' ? '' : whereText} onChange={pickWhere} placeholder="הקלידו עיר או שכונה, למשל חולון" />
              <button type="button" className="btn btn-line" onClick={useMyLocation}>מיקום נוכחי</button>
            </div>
          ) : null}

          {!results ? <Loading /> : results.length === 0 ? (
            <Empty title="לא מצאנו מורים שמתאימים לכל הסינונים">
              <p>נסו להסיר את הגבלת המחיר או המרחק, או לבחור רמה אחרת.</p>
              <button type="button" className="btn btn-brand" onClick={() => { resetFilters(); setWhereText(''); }}>ניקוי הסינון</button>
            </Empty>
          ) : (
            <div className="t-rows">{results.map((t) => <TutorRow key={t.id} tutor={t} sort={f.sort} topic={f.topic} />)}</div>
          )}
        </section>
      </div>
    </main>
  );
}
