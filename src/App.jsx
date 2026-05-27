import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useSplit } from './context/SplitContext';
import { store } from './lib/store';
import HomeScreen from './screens/HomeScreen';
import ScanScreen from './screens/ScanScreen';
import EditItemsScreen from './screens/EditItemsScreen';
import PeopleScreen from './screens/PeopleScreen';
import AssignScreen from './screens/AssignScreen';
import SummaryScreen from './screens/SummaryScreen';
import SplitDetailScreen from './screens/SplitDetailScreen';
import SettingsScreen from './screens/SettingsScreen';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetSplit } = useSplit();

  const path = location.pathname;
  const wizardScreens = ['/items', '/people', '/assign', '/summary'];
  const isWizard = wizardScreens.includes(path);

  const activeIndex = wizardScreens.indexOf(path);

  const handleLogoClick = () => {
    if (wizardScreens.includes(path)) {
      if (confirm('Cancel current split check and return to home screen?')) {
        resetSplit();
        navigate('/home');
      }
    } else {
      navigate('/home');
    }
  };

  const steps = [
    { name: 'Receipt', path: '/items' },
    { name: 'People', path: '/people' },
    { name: 'Assign', path: '/assign' },
    { name: 'Summary', path: '/summary' }
  ];

  return (
    <header className="border-b bg-card-60 backdrop-blur-sm sticky top-[env(safe-area-inset-top)] z-10 pt-[env(safe-area-inset-top)]">
      <div className="max-w-xl mx-auto px-5 py-3 flex items-center justify-between">
        {/* Logo/Brand Button */}
        <button onClick={handleLogoClick} className="flex items-center gap-25 hover:opacity-90" aria-label="Go to Home Screen" id="header-logo-btn">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <svg className="w-35 h-35 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
              <path d="M16 8H8"/>
              <path d="M16 12H8"/>
              <path d="M13 16H8"/>
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight font-serif" id="app-title-display">TabMate</span>
        </button>

        {/* Wizard Steps Navigation */}
        {isWizard ? (
          <nav id="wizard-nav" className="flex items-center gap-05">
            {steps.map((step, idx) => {
              const isActive = path === step.path;
              const isPast = idx < activeIndex;
              const isFuture = idx > activeIndex;

              return (
                <React.Fragment key={step.name}>
                  {idx > 0 && (
                    <svg className="w-3 h-3 text-muted-foreground/30 mx-05 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  )}
                  <button
                    disabled={isFuture}
                    onClick={() => isPast && navigate(step.path)}
                    id={`nav-step-${step.name.toLowerCase()}`}
                    className={`text-xs px-25 py-1 rounded-md transition-colors font-medium ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isPast
                        ? 'text-foreground/60 hover:text-foreground hover:bg-muted'
                        : 'text-foreground/30 cursor-default'
                    }`}
                  >
                    {step.name}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          /* Settings gear when not in split context */
          <button
            onClick={() => navigate('/settings')}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="App Settings"
            id="home-settings-btn"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

function MainRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function init() {
      const settings = await store.getSettings();
      if (!settings.venmo && !settings.zelle) {
        if (location.pathname !== '/settings') {
          navigate('/settings');
        }
      } else if (location.pathname === '/') {
        navigate('/home');
      }
    }
    init();
  }, [navigate, location]);

  return (
    <main className="max-w-xl mx-auto px-5 py-8 pb-16">
      <Routes>
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/scan" element={<ScanScreen />} />
        <Route path="/items" element={<EditItemsScreen />} />
        <Route path="/people" element={<PeopleScreen />} />
        <Route path="/assign" element={<AssignScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="/split/:id" element={<SplitDetailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col pt-20">
      <Header />
      <MainRoutes />
    </div>
  );
}
