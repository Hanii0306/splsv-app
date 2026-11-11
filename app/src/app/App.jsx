import { useEffect, useState } from 'react';
import Diagnostic from '../features/Diagnostic.jsx';
import FreePractice from '../features/FreePractice.jsx';
import Quiz from '../features/Quiz.jsx';
import SummaryView from '../features/SummaryView.jsx';
import LearningMap from '../features/LearningMap.jsx';
import LevelRunner from '../features/LevelRunner.jsx';
import Login from '../features/Login.jsx';
import Reinforce from '../features/Reinforce.jsx';
import Research from '../features/Research.jsx';
import { signOut } from '../storage/accounts.js';
import { getProfile, getSetting, setSetting } from '../storage/db.js';
import { startSync, syncNow } from '../sync/syncWorker.js';
import { logEvent, startSession } from '../telemetry/log.js';

const DEFAULT_SETTINGS = { light3d: false, reducedMotion: false, clq: false, unlockAll: false };

export default function App() {
  const [route, setRoute] = useState({ name: 'boot' });
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      setSettings({ ...DEFAULT_SETTINGS, ...((await getSetting('app')) || {}) });
      const p = await getProfile();
      if (!p) { setRoute({ name: 'login' }); return; }
      setProfile(p);
      startSession(p.studentCode);
      startSync();
      setRoute({ name: p.prereq ? 'map' : 'diagnostic' });
    })();
    const end = () => { logEvent('session_end', {}); };
    const onHide = () => { if (document.visibilityState === 'hidden') { end(); syncNow(); } };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', !!settings.reducedMotion);
  }, [settings.reducedMotion]);

  const saveSettings = async (s) => { setSettings(s); await setSetting('app', s); };

  const openLevel = (level, reinforce) =>
    setRoute(reinforce ? { name: 'reinforce', skill: reinforce, level } : { name: 'level', level });

  switch (route.name) {
    case 'boot':
      return <div className="screen center"><p className="muted">Memuat…</p></div>;
    case 'login':
      return <Login onDone={(p) => { setProfile(p); startSession(p.studentCode); startSync(); setRoute({ name: p.prereq ? 'map' : 'diagnostic' }); }} />;
    case 'diagnostic':
      return <Diagnostic profile={profile} onDone={(p) => { setProfile(p); setRoute({ name: 'map' }); }} />;
    case 'reinforce':
      return (
        <Reinforce key={route.skill} skill={route.skill} profile={profile} onBack={() => setRoute({ name: 'map' })}
          onDone={(p) => { setProfile(p); setRoute({ name: 'level', level: route.level }); }} />
      );
    case 'level':
      return <LevelRunner key={route.level.id} level={route.level} profile={profile} settings={settings} onExit={() => { syncNow(); setRoute({ name: 'map' }); }} />;
    case 'summary':
      return <SummaryView key={route.level.id} level={route.level} onBack={() => setRoute({ name: 'map' })} onStart={() => openLevel(route.level, null)} />;
    case 'free':
      return <FreePractice key={route.level.id} level={route.level} profile={profile} settings={settings} onExit={() => { syncNow(); setRoute({ name: 'map' }); }} />;
    case 'quiz':
      return <Quiz openLevels={route.open} onExit={() => { syncNow(); setRoute({ name: 'map' }); }} />;
    case 'research':
      return (
        <Research profile={profile} settings={settings} onSettings={saveSettings} onBack={() => setRoute({ name: 'map' })}
          onLogout={async () => { await signOut(); setProfile(null); setRoute({ name: 'login' }); }} />
      );
    default:
      return <LearningMap key={route.name} profile={profile} settings={settings} onOpenLevel={openLevel}
          onSummary={(level) => setRoute({ name: 'summary', level })}
          onFree={(level) => setRoute({ name: 'free', level })}
          onQuiz={(open) => setRoute({ name: 'quiz', open })}
          onResearch={() => setRoute({ name: 'research' })}
          onSignOut={async () => { logEvent('session_end', {}); await signOut(); setProfile(null); setRoute({ name: 'login' }); }} />;
  }
}
