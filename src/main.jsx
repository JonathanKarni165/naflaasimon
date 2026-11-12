import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './state.jsx';
import { Header, OfflineBar, BottomNav, Footer, LoginModal, GuestDialog, ProfileSetup, Toast, CoinTransition } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Tutor from './pages/Tutor.jsx';
import { Groups, Group } from './pages/Groups.jsx';
import Panel from './pages/Panel.jsx';
import About from './pages/About.jsx';
import './base.css';
import './app.css';

function Router() {
  const { route } = useApp();
  switch (route.name) {
    case 'search': return <Search />;
    case 'tutor': return <Tutor id={route.id} />;
    case 'groups': return <Groups key="all" />;
    case 'groups-marathons': return <Groups key="marathons" initialKind="marathon" />;
    case 'group': return <Group id={route.id} />;
    case 'about': return <About />;
    default:
      if (route.name.startsWith('panel')) return <Panel />;
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
