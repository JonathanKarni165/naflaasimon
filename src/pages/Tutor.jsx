import { useMemo, useState } from 'react';
import { useApp, useLoad } from '../state.jsx';
import { bayesScore, globalMean } from '../lib/ranking.js';
import { money, dateShort, rating1, reviewsLabel } from '../lib/format.js';
import { Avatar, Stars, StarRow, Verified, InquiryBox, GroupCard, WeekGrid, ConfirmButton, Loading, Empty, placeLabel } from '../components/ui.jsx';

export default function Tutor({ id }) {
  const { api, tutors, groups, user, version, reload } = useApp();
  const [tutor, loading] = useLoad(() => api.getTutor(id), [id, version]);
  const [reviews, , , refreshReviews] = useLoad(() => api.listReviews(id), [id]);
  const myGroups = useMemo(() => (groups || []).filter((g) => g.tutorId === id), [groups, id]);
  const weighted = useMemo(() => (tutor && tutors ? bayesScore(tutor.ratingAvg, tutor.ratingCount, globalMean(tutors)) : null), [tutor, tutors]);

  if (loading && !tutor) return <main className="wrap page-pad"><Loading /></main>;
  if (!tutor) return <main className="wrap page-pad"><Empty title="המורה לא נמצא"><a className="btn btn-brand" href="#search">חזרה לחיפוש</a></Empty></main>;

  const isOwner = user && (user.id === tutor.ownerId || user.isAdmin);
  const after = () => { refreshReviews(); reload(); };

  return (
    <main className="wrap page-pad">
      <a className="back" href="#search">→ חזרה לתוצאות</a>
      <div className="profile">
        <div className="profile-main">
          <header className="p-head">
            <Avatar tutor={tutor} className="p-photo" />
            <div className="p-id">
              <h1>{tutor.name}</h1>
              <p className="p-headline">{tutor.headline}</p>
              <div className="p-badges">
                <Verified tutor={tutor} />
                <Stars avg={tutor.ratingAvg} count={tutor.ratingCount} />
                {tutor.experienceYears ? <span className="muted-text"><bdi>{tutor.experienceYears}</bdi> שנות ניסיון</span> : null}
              </div>
              {isOwner ? <a className="btn btn-line btn-sm" href={user.id === tutor.ownerId ? '#panel' : `#panel-admin`}>עריכת הפרופיל</a> : null}
            </div>
          </header>

          <section className="p-sec">
            <h2>קצת עליי</h2>
            <p className="p-about">{tutor.about || 'המורה עוד לא כתב/ה על עצמו/ה.'}</p>
          </section>

          <section className="p-sec">
            <h2>מה אני מלמד/ת</h2>
            <dl className="facts">
              <div><dt>מקצועות</dt><dd className="t-tags">{(tutor.subjects || []).map((s) => <span key={s} className="tag brass">{s}</span>)}</dd></div>
              <div><dt>רמות</dt><dd className="t-tags">{(tutor.levels || []).map((l) => <span key={l} className="tag">{l}</span>)}</dd></div>
              {(tutor.topics || []).length ? <div><dt>קורסים</dt><dd className="t-tags">{tutor.topics.map((x) => <span key={x} className="tag">{x}</span>)}</dd></div> : null}
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
            <div className="reviews">
              {(reviews || []).map((r) => (
                <article key={r.id} className="review">
                  <div className="rv-top"><b>{r.userName}</b><StarRow value={r.rating} size={15} /><span className="muted-text">{dateShort(r.createdAt)}</span></div>
                  {r.text ? <p>{r.text}</p> : null}
                  {user && (user.id === r.userId || user.isAdmin) ? (
                    <ConfirmButton className="linkish small" confirmText="למחוק את הביקורת?" onConfirm={async () => { await api.deleteReview(r.id); after(); }}>מחיקה</ConfirmButton>
                  ) : null}
                </article>
              ))}
              {reviews && !reviews.length ? <p className="muted-text">עדיין אין ביקורות. למדתם עם {tutor.name.split(' ')[0]}? היו הראשונים לכתוב.</p> : null}
            </div>
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
              {tutor.teachesFrontal && tutor.priceFrontal ? <div><span>פרונטלי</span><b><bdi>{money(tutor.priceFrontal)}</bdi></b><small>{tutor.city}</small></div> : null}
              {tutor.teachesOnline && tutor.priceOnline ? <div><span>אונליין</span><b><bdi>{money(tutor.priceOnline)}</bdi></b><small>זום או לוח משותף</small></div> : null}
            </div>
            <h2 className="side-h">פנייה למורה</h2>
            <InquiryBox tutor={tutor} />
            <p className="hint">משלמים למורה ישירות. לנפל האסימון אין עמלה.</p>
          </div>
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

  if (user && user.id === tutor.ownerId) return null;
  const start = () => {
    if (!requireLogin('כדי לכתוב ביקורת צריך להתחבר. ככה כל אדם כותב ביקורת אחת בלבד לכל מורה.')) return;
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
    return <button type="button" className="btn btn-brand" onClick={start}>{mine ? 'עריכת הביקורת שלי' : 'כתיבת ביקורת'}</button>;
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
