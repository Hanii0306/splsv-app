import { useEffect, useState } from 'react';
import { isPlaying, onMusicChange, startMusic, stopMusic } from '../audio/music.js';

const KEY = 'splv.music.on';
export const musicWanted = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const remember = (on) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ } };

/** 🎵 toggle in the header. The tune only ever starts from this tap (no autoplay). */
export default function MusicButton() {
  const [on, setOn] = useState(isPlaying());
  useEffect(() => onMusicChange(setOn), []);
  return (
    <button type="button" className={`icon-btn music-btn${on ? ' music-on' : ''}`} aria-pressed={on}
      aria-label={on ? 'Matikan musik' : 'Nyalakan musik detektif'}
      onClick={() => { if (on) { stopMusic(); remember(false); } else { startMusic(); remember(true); } }}>
      {on ? '🎵' : '🔇'}
    </button>
  );
}
