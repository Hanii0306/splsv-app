import { useEffect, useRef, useState } from 'react';
import { quickPrompts } from '../engine/index.js';
import { askTutor } from '../sync/tutor.js';
import { logEvent } from '../telemetry/log.js';
import { MathText } from './CaseItem.jsx';

/**
 * Detektif AI chat sheet. Opens any time (developer decision v1.7). Short, one-step answers;
 * the server never reveals final answers. Every exchange is logged for research (student code only).
 * @param {{ mode:'item'|'materi', item?:object, caseInfo?:object, live?:{current:object}, profile:object, onClose:()=>void }} p
 */
export default function TutorChat({ mode, item, caseInfo, live, profile, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const asks = useRef(0);
  const endRef = useRef(null);

  useEffect(() => { logEvent('tutor_open', { mode, levelId: caseInfo?.id }, item?.id); }, [mode, caseInfo?.id, item?.id]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [msgs, busy]);

  async function send(message) {
    const m = message.trim();
    if (!m || busy) return;
    setErr(null);
    setText('');
    const history = msgs.slice(-6);
    setMsgs((x) => [...x, { role: 'user', content: m }]);
    setBusy(true);
    asks.current += 1;
    const st = live?.current || {};
    try {
      const r = await askTutor({
        mode, itemId: item?.id, message: m, history, studentCode: profile?.studentCode,
        box: st.box ?? 0, wrongs: st.wrongs ?? 0, hintLevel: st.hintLevel ?? 0, asks: asks.current, work: st.work || '',
      });
      setMsgs((x) => [...x, { role: 'assistant', content: r.reply }]);
      logEvent('tutor_chat', { mode, levelId: caseInfo?.id, level: r.level, blocked: !!r.blocked, message: m, reply: r.reply }, item?.id);
    } catch (e) {
      setErr(e.message);
      logEvent('tutor_error', { mode, levelId: caseInfo?.id, error: String(e.message).slice(0, 80) }, item?.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hint-panel tutor-sheet" role="dialog" aria-label="Detektif AI">
      <div className="hint-head tutor-head">
        <strong>Detektif AI</strong>
        <span className="muted">{mode === 'item' ? 'membahas soal ini' : 'tanya materi SPLSV'}</span>
        <button type="button" className="icon-btn tutor-close" onClick={onClose} aria-label="Tutup chat">✕</button>
      </div>
      <div className="chat-log">
        {msgs.length === 0 && (
          <p className="muted chat-hint">Aku tidak memberi jawaban akhir, tapi membantumu menemukannya sendiri. Pilih atau tulis pertanyaan.</p>
        )}
        {msgs.map((m, i) => (
          <p key={i} className={`bubble bubble-${m.role === 'user' ? 'me' : 'ai'}`}><MathText text={m.content} /></p>
        ))}
        {busy && <p className="bubble bubble-ai muted">Detektif AI sedang berpikir…</p>}
        {err && <p className="feedback feedback-warn">{err}</p>}
        <span ref={endRef} />
      </div>
      {msgs.length === 0 && (
        <div className="chat-chips">
          {quickPrompts(mode, item).map((q) => <button key={q} type="button" className="mini-btn" disabled={busy} onClick={() => send(q)}>{q}</button>)}
        </div>
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <textarea rows={2} maxLength={500} value={text} placeholder="Tulis pertanyaan atau langkahmu…" aria-label="Pesan untuk Detektif AI"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>Kirim</button>
      </form>
      <p className="muted chat-note">Jangan tulis nama atau data pribadi. AI bisa keliru, jadi periksa lagi, ya.</p>
    </div>
  );
}
