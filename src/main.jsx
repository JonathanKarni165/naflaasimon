import { useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './state.jsx';
import { Header, OfflineBar, BottomNav, Footer, LoginModal, GuestDialog, ProfileSetup, Toast, CoinTransition, Loading } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Tutor from './pages/Tutor.jsx';
import { Groups, Group } from './pages/Groups.jsx';
// The personal area is big and only signed-in people open it, so it loads on demand and the public pages start faster.
const Panel = lazy(() => import('./pages/Panel.jsx'));
import About from './pages/About.jsx';
import Auth from './pages/Auth.jsx';
import { Privacy, Accessibility, Contact, NotFound } from './pages/Legal.jsx';
import './base.css';
import './app.css';

const SITE = 'נפל האסימון';
const TITLES = {
  search: 'חיפוש מורים פרטיים', privacy: 'מדיניות פרטיות', accessibility: 'הצהרת נגישות', contact: 'צור קשר', groups: 'קבוצות למידה ומרתונים', 'groups-marathons': 'מרתונים לבגרות', about: 'אודות ותנאי שימוש',
  login: 'כניסה', signup: 'פתיחת חשבון', panel: 'פאנל מורה', 'panel-inbox': 'פניות מתלמידים', 'panel-groups': 'הקבוצות שלי',
  'panel-seats': 'השיחות וההרשמות שלי', 'panel-me': 'הפרטים האישיים שלי', 'panel-admin': 'ניהול מורים', 'panel-reports': 'דיווחים', chat: 'שיחה',
};

/** A tab title for each page, so tabs, history and search results tell pages apart. */
function useTitle() {
  const { route, tutors, groups } = useApp();
  useEffect(() => {
    let page = TITLES[route.name] || '';
    if (route.name === 'tutor') { const t = (tutors || []).find((x) => x.id === route.id); page = t ? `${t.name}, שיעורים פרטיים` : 'פרופיל מורה'; }
    if (route.name === 'group') { const g = (groups || []).find((x) => x.id === route.id); page = g ? g.title : 'קבוצת למידה'; }
    const known = route.name === 'home' || TITLES[route.name] || route.name === 'tutor' || route.name === 'group';
    if (!known) page = 'העמוד לא נמצא';
    document.title = page ? `${page} | ${SITE}` : `${SITE} | מורים פרטיים למתמטיקה ועוד`;
    // Private and sample pages are kept out of search engines (robots.txt can't do it under /naflaasimon/).
    const sample = route.name === 'tutor' ? (tutors || []).find((x) => x.id === route.id)?.isExample
      : route.name === 'group' ? (() => { const g = (groups || []).find((x) => x.id === route.id); return !g || !!(tutors || []).find((x) => x.id === g.tutorId)?.isExample; })() : false;
    const hide = !known || sample || /^(panel|chat|login|signup)/.test(route.name);
    let meta = document.querySelector('meta[name="robots"]');
    if (hide) { if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); } meta.content = 'noindex'; }
    else if (meta) meta.remove();
  }, [route.name, route.id, tutors, groups]);
}

function Router() {
  const { route } = useApp();
  useTitle();
  switch (route.name) {
    case 'search': return <Search />;
    case 'tutor': return <Tutor id={route.id} />;
    case 'groups': return <Groups key="all" />;
    case 'groups-marathons': return <Groups key="marathons" initialKind="marathon" />;
    case 'group': return <Group id={route.id} />;
    case 'about': return <About />;
    case 'privacy': return <Privacy />;
    case 'accessibility': return <Accessibility />;
    case 'contact': return <Contact />;
    case 'login': return <Auth mode="login" />;
    case 'signup': return <Auth mode="signup" />;
    default:
      if (route.name.startsWith('panel') || route.name === 'chat') return <Suspense fallback={<main className="wrap page-pad" style={{ minHeight: '70vh' }}><Loading /></main>}><Panel /></Suspense>;
      if (route.name !== 'home') return <NotFound />;
      return <Home />;
  }
}

function App() {
  return (
    <div className="page" lang="he" dir="rtl">
      <Header />
      <OfflineBar />
      <Router />
      <CoinTransition />
      <Footer />
      <BottomNav />
      <LoginModal />
      <GuestDialog />
      <ProfileSetup />
      <Toast />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<AppProvider><App /></AppProvider>);
