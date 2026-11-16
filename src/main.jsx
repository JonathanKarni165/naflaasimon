import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './state.jsx';
import { Header, OfflineBar, BottomNav, Footer, LoginModal, GuestDialog, ProfileSetup, Toast, CoinTransition } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Tutor from './pages/Tutor.jsx';
import { Groups, Group } from './pages/Groups.jsx';
import Panel from './pages/Panel.jsx';
import About from './pages/About.jsx';
import Auth from './pages/Auth.jsx';
import './base.css';
import './app.css';

const SITE = 'נפל האסימון';
const TITLES = {
  search: 'חיפוש מורים פרטיים', groups: 'קבוצות למידה ומרתונים', 'groups-marathons': 'מרתונים לבגרות', about: 'אודות ותנאי שימוש',
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
    document.title = page ? `${page} | ${SITE}` : `${SITE} | מורים פרטיים למתמטיקה ועוד`;
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
    case 'login': return <Auth mode="login" />;
    case 'signup': return <Auth mode="signup" />;
    default:
      if (route.name.startsWith('panel') || route.name === 'chat') return <Panel />;
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
