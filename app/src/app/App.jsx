import { useEffect, useState } from 'react';
import Quiz from '../features/Quiz.jsx';
import SummaryView from '../features/SummaryView.jsx';
import LearningMap from '../features/LearningMap.jsx';
import CaseRunner from '../features/CaseRunner.jsx';
import cases from '../content/cases.json';
import Login from '../features/Login.jsx';
import Research from '../features/Research.jsx';
import { signOut } from '../storage/accounts.js';
import { getProfile, getSetting, setSetting } from '../storage/db.js';
import { startSync, syncNow } from '../sync/syncWorker.js';
import { logEvent, startSession } from '../telemetry/log.js';

// Every learning/gamification feature can be switched off in Menu peneliti (v1.6).
export const DEFAULT_SETTINGS = {
  light3d: false, reducedMotion: false, clq: false, unlockAll: false,
  detective: true, agentM: true, clues: true, xp: true, badges: true,
  summaries: true, quiz: true, cats: true,
  tutor: true, // Detektif AI chatbot (needs the Supabase Edge Function `tutor`)
  pattern: true, // faint static detective pattern behind questions (no motion)
};
const caseById = (id) => cases.find((c) => c.id === id) || cases[0];

export default function App() {
  const [route, setRoute] = useState({ name: 'boot' });
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      const st = { ...DEFAULT_SETTINGS, ...((await getSetting('app')) || {}) };
      setSettings(st);
      const p = await getProfile();
      if (!p) { setRoute({ name: 'login' }); return; }
      setProfile(p);
      startSession(p.studentCode);
      startSync();
      setRoute({ name: 'map' });
    })();
    const end = () => { logEvent('session_end', {}); };
    const onHide = () => { if (document.visibilityState === 'hidden') { end(); syncNow(); } };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', !!settings.reducedMotion);
    root.classList.toggle('no-cats', settings.cats === false);
    root.classList.toggle('no-pattern', settings.pattern === false);
    root.dataset.skin = settings.detective === false ? 'cute' : 'detective';
  }, [settings.reducedMotion, settings.cats, settings.detective, settings.pattern]);

  const saveSettings = async (s) => { setSettings(s); await setSetting('app', s); };

  const openLevel = (level) => setRoute({ name: 'level', level });

  switch (route.name) {
    case 'boot':
      return <div className="screen center"><p className="muted">Memuat…</p></div>;
    case 'login':
      return <Login onDone={(p) => { setProfile(p); startSession(p.studentCode); startSync(); setRoute({ name: 'map' }); }} />;
    case 'level':
      return <CaseRunner key={route.level.id} caseInfo={caseById(route.level.id)} profile={profile} settings={settings} onExit={() => { syncNow(); setRoute({ name: 'map' }); }} />;
    case 'summary':
      return <SummaryView key={route.level.id} level={route.level} onBack={() => setRoute({ name: 'map' })} onStart={() => openLevel(caseById(route.level.id))} />;
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
          onQuiz={(open) => setRoute({ name: 'quiz', open })}
          onResearch={() => setRoute({ name: 'research' })}
          onSignOut={async () => { logEvent('session_end', {}); await signOut(); setProfile(null); setRoute({ name: 'login' }); }} />;
  }
}
