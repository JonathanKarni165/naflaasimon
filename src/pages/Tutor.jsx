import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useLoad, to } from '../state.jsx';
import { bayesScore, globalMean } from '../lib/ranking.js';
import { money, dateShort, rating1, reviewsLabel } from '../lib/format.js';
import { Avatar, TutorBadges, Stars, StarRow, Verified, InquiryBox, GroupCard, WeekGrid, ConfirmButton, Loading, Empty, placeLabel, ReportTutor } from '../components/ui.jsx';
import { topicsBySubject } from '../data/topics.js';

export default function Tutor({ id }) {
  const { api, tutors, groups, user, version, reload } = useApp();
  const [fresh, loading] = useLoad(() => api.getTutor(id), [id, version]);
  // The cached tutors list already holds this tutor, so the page draws at once and the fresh copy replaces it quietly.
  const tutor = fresh || (loading ? (tutors || []).find((t) => t.id === id) : null) || null;
  const [reviews, , , refreshReviews] = useLoad(() => api.listReviews(id), [id]);
  const myGroups = useMemo(() => (groups || []).filter((g) => g.tutorId === id), [groups, id]);
  const weighted = useMemo(() => (tutor && tutors ? bayesScore(tutor.ratingAvg, tutor.ratingCount, globalMean(tutors)) : null), [tutor, tutors]);

  // A full screen of room while the first load runs, so the footer does not jump up and down on a direct visit (CLS).
  if (loading && !tutor) return <main className="wrap page-pad" style={{ minHeight: '100vh' }}><Loading /></main>;
  if (!tutor) return <main className="wrap page-pad"><Empty title="המורה לא נמצא"><a className="btn btn-brand" href={to('search')}>חזרה לחיפוש</a></Empty></main>;

  const isOwner = user && (user.id === tutor.ownerId || user.isAdmin);
  const after = () => { refreshReviews(); reload(); };

  return (
    <main className="wrap page-pad">
      <a className="back" href={to('search')}>→ חזרה לתוצאות</a>
      {isOwner && tutor.approval !== 'approved' ? <p className="note approval-note owner-preview" role="status"><b>{tutor.approval === 'rejected' ? 'הפרופיל לא אושר.' : 'הפרופיל ממתין לאישור.'}</b> רק אתם רואים את הדף הזה. הוא יופיע לתלמידים אחרי שהצוות יאשר אותו.</p> : null}
      {isOwner && tutor.approval === 'approved' && tutor.pending ? <p className="note approval-note owner-preview" role="status"><b>יש לכם שינויים שממתינים לבדיקה.</b> כאן מוצגת הגרסה שתלמידים רואים עכשיו.</p> : null}
      <div className="profile">
        <div className="profile-main">
          <header className="p-head">
            <Avatar tutor={tutor} className="p-photo" eager />
            <div className="p-id">
              <h1>{tutor.name}</h1>
              <p className="p-headline">{tutor.headline}</p>
              <TutorBadges tutor={tutor} className="p-badges-row" />
              <div className="p-badges">
                <Verified tutor={tutor} />
                <Stars avg={tutor.ratingAvg} count={tutor.ratingCount} />
                {tutor.experienceYears ? <span className="muted-text"><bdi>{tutor.experienceYears}</bdi> שנות ניסיון</span> : null}
              </div>
              {isOwner ? <a className="btn btn-line btn-sm" href={to(user.id === tutor.ownerId ? 'panel' : 'panel-admin')}>עריכת הפרופיל</a> : null}
            </div>
          </header>

          <section className="p-sec">
            <h2>קצת עליי</h2>
            <p className="p-about">{tutor.about || 'המורה עוד לא כתב/ה על עצמו/ה.'}</p>
          </section>

          <section className="p-sec">
            <h2>מה מלמדים כאן</h2>
            <dl className="facts">
              <div><dt>מקצועות</dt><dd className="t-tags">{(tutor.subjects || []).map((s) => <span key={s} className="tag brass">{s}</span>)}</dd></div>
              {topicsBySubject(tutor.subjects, tutor.topics).map(([s, list]) => (
                <div key={s}><dt>{s}</dt><dd className="t-tags">{list.map((x) => <span key={x} className="tag">{x}</span>)}</dd></div>
              ))}
              <div><dt>מיקום</dt><dd>{placeLabel(tutor) || 'לא צוין'}</dd></div>
            </dl>
          </section>

          {myGroups.length ? (
            <section className="p-sec">
              <h2>קבוצות למידה של {tutor.name.split(' ')[0]}</h2>
              <div className="groups groups-2">{myGroups.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </section>
          ) : null}

          <section className="p-sec" aria-labelledby="rev-h">
            <h2 id="rev-h">ביקורות</h2>
            <RatingSummary tutor={tutor} reviews={reviews || []} weighted={weighted} />
            <ReviewForm tutor={tutor} reviews={reviews || []} onDone={after} />
            <ReviewList tutor={tutor} reviews={reviews || []} after={after} loaded={!!reviews} />
          </section>

          <section className="p-sec" aria-labelledby="free-h">
            <h2 id="free-h">שעות פנויות</h2>
            {tutor.availability?.length ? (
              <>
                <WeekGrid mode="view" value={tutor.availability} label={`השעות הפנויות של ${tutor.name}`} />
                <p className="muted-text small">השעות המסומנות פנויות בדרך כלל. בפנייה תוכלו לבחור את השעות שנוחות לכם.</p>
              </>
            ) : <p className="muted-text">{tutor.name.split(' ')[0]} עוד לא סימנ/ה שעות פנויות. אפשר לכתוב בפנייה מתי נוח לכם.</p>}
          </section>
        </div>

        <aside className="profile-side">
          <div className="side-card">
            <h2 className="side-h">מחיר לשעה</h2>
            <div className="side-prices">
              {tutor.teachesFrontal && tutor.priceFrontal ? <div className="sp-frontal"><PriceArt kind="frontal" /><span>פרונטלי</span><b><bdi>{money(tutor.priceFrontal)}</bdi></b><small>{tutor.city}</small></div> : null}
              {tutor.teachesOnline && tutor.priceOnline ? <div className="sp-online"><PriceArt kind="online" /><span>אונליין</span><b><bdi>{money(tutor.priceOnline)}</bdi></b><small>זום או לוח משותף</small></div> : null}
            </div>
            <h2 className="side-h">פנייה למורה</h2>
            <InquiryBox tutor={tutor} />
            <p className="hint">משלמים למורה ישירות. לנפל האסימון אין עמלה.</p>
          </div>
          <ReportTutor tutor={tutor} />
        </aside>
      </div>
    </main>
  );
}

function RatingSummary({ tutor, reviews, weighted }) {
  const counts = [5, 4, 3, 2, 1].map((s) => [s, reviews.filter((r) => r.rating === s).length]);
  const max = Math.max(1, ...counts.map(([, n]) => n));
  if (!tutor.ratingCount) return null;
  return (
    <div className="rating-sum">
      <div className="rs-big">
        <b>{rating1(tutor.ratingAvg)}</b>
        <StarRow value={Math.round(tutor.ratingAvg)} />
        <span className="muted-text">{reviewsLabel(tutor.ratingCount)}</span>
      </div>
      <div className="rs-bars">
        {counts.map(([s, n]) => (
          <div key={s} className="rs-bar"><span>{s} ★</span><i><em style={{ width: `${(n / max) * 100}%` }} /></i><span className="muted-text"><bdi>{n}</bdi></span></div>
        ))}
      </div>
      {weighted != null ? (
        <p className="rs-weighted">
          <b>ציון משוקלל {weighted.toFixed(2)}</b> · {tutor.ratingCount < 5
            ? 'יש עדיין מעט ביקורות, אז הציון מתקרב לממוצע באתר עד שיצטברו עוד.'
            : 'זה הציון שלפיו מדרגים בחיפוש. הוא מתחשב גם במספר הביקורות.'}
        </p>
      ) : null}
    </div>
  );
}

function ReviewForm({ tutor, reviews, onDone }) {
  const { api, user, requireLogin, notify } = useApp();
  const mine = user ? reviews.find((r) => r.userId === user.id) : null;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // Reviews come only from people who really contacted the tutor (the database checks this too).
  const [allowed] = useLoad(() => (user && api.canReview ? api.canReview(tutor.id) : true), [tutor.id, user?.id || '']);

  if (user && user.id === tutor.ownerId) return null;
  const start = () => {
    if (!requireLogin('כדי לכתוב ביקורת צריך להתחבר. ככה כל אדם כותב ביקורת אחת בלבד לכל מורה.')) return;
    if (!mine && allowed === false) { setBlocked(true); return; }
    setRating(mine?.rating || 0); setText(mine?.text || ''); setOpen(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { notify('בחרו מספר כוכבים', true); return; }
    setBusy(true);
    try { await api.addReview({ tutorId: tutor.id, rating, text: text.trim() }); notify(mine ? 'הביקורת עודכנה' : 'תודה! הביקורת פורסמה'); setOpen(false); onDone(); } catch (err) { notify(err.message, true); }
    setBusy(false);
  };
  if (!open) {
    return (
      <>
        <button type="button" className="btn btn-brand" onClick={start}>{mine ? 'עריכת הביקורת שלי' : 'כתיבת ביקורת'}</button>
        {blocked ? <p className="hint" role="status">אפשר לכתוב ביקורת רק על מורה שפניתם אליו דרך האתר או שלמדתם אצלו בקבוצה. כך כל הביקורות כאן אמיתיות.</p> : null}
      </>
    );
  }
  return (
    <form className="review-form" onSubmit={submit}>
      <span className="field-label" id="rate-l">כמה כוכבים?</span>
      <div className="star-pick" role="radiogroup" aria-labelledby="rate-l">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} כוכבים`} className={i <= rating ? 'on' : ''} onClick={() => setRating(i)}>★</button>
        ))}
      </div>
      <label className="field-label" htmlFor="rv-text">מה כדאי שתלמידים אחרים יידעו?</label>
      <textarea id="rv-text" className="input" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="איך היו ההסברים, הסבלנות, ההתקדמות…" />
      <div className="form-actions">
        <button type="submit" className="btn btn-brand" disabled={busy}>{busy ? 'שולחים…' : 'פרסום הביקורת'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>ביטול</button>
      </div>
      <p className="hint">הביקורת תופיע בשם {user?.name}.</p>
    </form>
  );
}

const SHOWN_REVIEWS = 3;
function ReviewItem({ r, after }) {
  const { api, user } = useApp();
  return (
    <article className="review">
      <div className="rv-top"><b>{r.userName}</b><StarRow value={r.rating} size={15} /><span className="muted-text">{dateShort(r.createdAt)}</span></div>
      {r.text ? <p>{r.text}</p> : null}
      {user && (user.id === r.userId || user.isAdmin) ? (
        <ConfirmButton className="linkish small" confirmText="למחוק את הביקורת?" onConfirm={async () => { await api.deleteReview(r.id); after(); }}>מחיקה</ConfirmButton>
      ) : null}
    </article>
  );
}

/** A few reviews in the page itself (no inner scroll box that traps the page scroll); more open in place on request. */
function ReviewList({ tutor, reviews, after, loaded }) {
  const [shown, setShown] = useState(SHOWN_REVIEWS);
  if (loaded && !reviews.length) return <p className="muted-text">עדיין אין ביקורות. למדתם עם {tutor.name.split(' ')[0]}? היו הראשונים לכתוב.</p>;
  // While reviews load, keep about the room they will take, so the page below does not jump.
  if (!loaded) return tutor.ratingCount ? <div className="reviews reviews-flat reviews-wait" style={{ '--n': Math.min(tutor.ratingCount, SHOWN_REVIEWS) }} aria-busy="true" /> : null;
  const left = reviews.length - shown;
  return (
    <>
      <div className="reviews reviews-flat" aria-label="ביקורות">
        {reviews.slice(0, shown).map((r) => <ReviewItem key={r.id} r={r} after={after} />)}
      </div>
      {left > 0 ? (
        <button type="button" className="btn btn-line more-reviews" onClick={() => setShown((n) => n + 10)}>
          הצגת עוד {Math.min(left, 10)} ביקורות <small className="muted-text">(מתוך {reviews.length})</small>
        </button>
      ) : reviews.length > SHOWN_REVIEWS ? (
        <button type="button" className="btn btn-line more-reviews" onClick={() => setShown(SHOWN_REVIEWS)}>הסתרת ביקורות</button>
      ) : null}
    </>
  );
}

// Small line drawings in the price boxes: a laptop for online lessons, two people at a table for frontal ones.
function PriceArt({ kind }) {
  return (
    <svg className="sp-art" viewBox="0 0 48 40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'online' ? (
        <>
          <rect x="9" y="6" width="30" height="20" rx="2.5" fill="#fff" />
          <path d="M4 31h40l-3 4H7z" fill="#DFC166" />
          <path d="M16 15l4 4 8-8" stroke="#0F5C5B" />
        </>
      ) : (
        <>
          <circle cx="14" cy="11" r="5" fill="#fff" /><circle cx="34" cy="11" r="5" fill="#DFC166" />
          <path d="M6 28c0-5 3.6-9 8-9s8 4 8 9M26 28c0-5 3.6-9 8-9s8 4 8 9" />
          <path d="M3 31h42" stroke="#0F5C5B" />
        </>
      )}
    </svg>
  );
}
