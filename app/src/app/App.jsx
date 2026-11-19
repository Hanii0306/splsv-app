import { useEffect, useState } from 'react';
import LearningMap from '../features/LearningMap.jsx';
import TestRunner from '../features/TestRunner.jsx';
import { installTapEffect } from '../ui/tapEffect.js';
import Login from '../features/Login.jsx';
import Research from '../features/Research.jsx';
import { signOut } from '../storage/accounts.js';
import { startMusic, stopMusic } from '../audio/music.js';
import { musicWanted } from '../ui/MusicButton.jsx';
import { getProfile, getSetting, setSetting } from '../storage/db.js';
import { startSync, syncNow } from '../sync/syncWorker.js';
import { logEvent, startSession } from '../telemetry/log.js';

// v2.0: the only questions are the 4 soal of the PDF test. Every extra feature can be switched off in Menu peneliti.
export const DEFAULT_SETTINGS = {
  reducedMotion: false, clq: false,
  testMode: 'tes', // 'tes' = no help (research) | 'latihan' = Amplop Petunjuk + Detektif AI
  detective: true, agentM: true, clues: true, cats: true,
  tutor: true, // Detektif AI chatbot (needs the Supabase Edge Function `tutor`)
  pattern: true, // faint static detective pattern behind questions (no motion)
  music: true, // detective tune, started only by the student's tap on 🎵
};
installTapEffect();

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

  // If the student switched music on earlier, resume it on their first tap (browsers forbid real autoplay).
  useEffect(() => {
    if (settings.music === false) { stopMusic(); return undefined; }
    if (!musicWanted()) return undefined;
    const go = () => startMusic();
    window.addEventListener('pointerdown', go, { once: true });
    return () => window.removeEventListener('pointerdown', go);
  }, [settings.music]);

  const saveSettings = async (s) => { setSettings(s); await setSetting('app', s); };

  switch (route.name) {
    case 'boot':
      return <div className="screen center"><p className="muted">Memuat…</p></div>;
    case 'login':
      return <Login onDone={(p) => { setProfile(p); startSession(p.studentCode); startSync(); setRoute({ name: 'map' }); }} />;
    case 'test':
      return <TestRunner profile={profile} settings={settings} onExit={() => { syncNow(); setRoute({ name: 'map' }); }} />;
    case 'research':
      return (
        <Research profile={profile} settings={settings} onSettings={saveSettings} onBack={() => setRoute({ name: 'map' })}
          onLogout={async () => { await signOut(); setProfile(null); setRoute({ name: 'login' }); }} />
      );
    default:
      return <LearningMap key={route.name} profile={profile} settings={settings} onOpenTest={() => setRoute({ name: 'test' })}
          onResearch={() => setRoute({ name: 'research' })}
          onSignOut={async () => { logEvent('session_end', {}); await signOut(); setProfile(null); setRoute({ name: 'login' }); }} />;
  }
}
