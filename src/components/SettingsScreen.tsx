import { useEffect, useRef, useState } from 'react';
import { englishVoices, onVoicesChanged, speak, speechSupported } from '../lib/speech';
import { ALL_EXERCISES, exportBackup, importBackup } from '../lib/storage';
import type { ExerciseType, Progress, Settings } from '../lib/types';

const EXERCISE_NAMES: Record<ExerciseType, string> = {
  'card-en-cs': 'Flashcard: English → Czech',
  'card-cs-en': 'Flashcard: Czech → English',
  'mc-en-cs': 'Quiz: pick the Czech meaning',
  'mc-cs-en': 'Quiz: pick the English word',
  'listen-word': 'Listening: single word',
  'listen-sentence': 'Listening: whole sentence',
  gap: 'Fill the gap in a sentence',
};

interface Props {
  progress: Progress;
  onSettings: (s: Partial<Settings>) => void;
  onReplace: (p: Progress) => void;
  onReset: () => void;
}

export function SettingsScreen({ progress, onSettings, onReplace, onReset }: Props) {
  const s = progress.settings;
  const [voices, setVoices] = useState(englishVoices());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => onVoicesChanged(() => setVoices(englishVoices())), []);

  const toggle = (e: ExerciseType) => {
    const next = { ...s.exercises, [e]: !s.exercises[e] };
    if (Object.values(next).some(Boolean)) onSettings({ exercises: next });
  };

  return (
    <div className="settings">
      <h1>Settings · Nastavení</h1>

      <section className="panel">
        <h2>Daily training</h2>
        <label className="row">
          New words per day
          <select value={s.newPerDay} onChange={(e) => onSettings({ newPerDay: Number(e.target.value) })}>
            {[3, 5, 8, 10, 15, 20].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="row">
          Max reviews per day
          <select value={s.maxReviews} onChange={(e) => onSettings({ maxReviews: Number(e.target.value) })}>
            {[20, 40, 60, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="row">
          Reading scenes per day
          <select value={s.readingPerDay} onChange={(e) => onSettings({ readingPerDay: Number(e.target.value) })}>
            {[0, 1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Off' : n}
              </option>
            ))}
          </select>
          {progress.counters.byType.reading && (
            <small className="hint">
              Answered {progress.counters.byType.reading.answered}×, right{' '}
              {Math.round((progress.counters.byType.reading.correct / progress.counters.byType.reading.answered) * 100)}%
            </small>
          )}
        </label>
        <label className="row">
          Book
          <select value={s.book} onChange={(e) => onSettings({ book: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>Exercise types</h2>
        <p className="hint">Turn off the ones you don't like. The numbers show how often each was used and how often it was right.</p>
        {ALL_EXERCISES.map((e) => {
          const st = progress.counters.byType[e];
          return (
            <label key={e} className="row toggle">
              <input type="checkbox" checked={s.exercises[e]} onChange={() => toggle(e)} />
              <span>{EXERCISE_NAMES[e]}</span>
              {st && st.answered > 0 && (
                <small>
                  {st.answered}× · {Math.round((st.correct / st.answered) * 100)}%
                </small>
              )}
            </label>
          );
        })}
      </section>

      <section className="panel">
        <h2>Voice</h2>
        {speechSupported() ? (
          <>
            <label className="row">
              Voice
              <select value={s.voiceURI ?? ''} onChange={(e) => onSettings({ voiceURI: e.target.value || undefined })}>
                <option value="">Automatic</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="row">
              Speed: {s.rate.toFixed(2)}×
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.05}
                value={s.rate}
                onChange={(e) => onSettings({ rate: Number(e.target.value) })}
              />
            </label>
            <button
              className="btn wide"
              onClick={() => speak('Welcome to the dungeon, crawler.', { voiceURI: s.voiceURI, rate: s.rate })}
            >
              🔊 Test voice
            </button>
          </>
        ) : (
          <p>This browser can't speak, so listening exercises are hidden.</p>
        )}
      </section>

      <section className="panel">
        <h2>Backup</h2>
        <p className="hint">Progress is saved only on this phone. Save a backup now and then, in case the phone is lost or the browser data is cleared.</p>
        <div className="grade-row">
          <button className="btn" onClick={() => exportBackup(progress)}>
            Save backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Restore backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const p = await importBackup(f);
              if (confirm('Replace current progress with this backup?')) onReplace(p);
            } catch (err) {
              alert((err as Error).message);
            }
          }}
        />
        <button
          className="btn bad wide"
          onClick={() => {
            if (confirm('Delete ALL progress? This cannot be undone.')) onReset();
          }}
        >
          Reset all progress
        </button>
      </section>

      <section className="panel">
        <h2>Install on your phone</h2>
        <p className="hint">
          <b>iPhone (Safari):</b> tap Share ⬆️ → “Add to Home Screen”.
          <br />
          <b>Android (Chrome):</b> tap ⋮ → “Add to Home screen” / “Install app”.
        </p>
      </section>

      <p className="footer">Fan-made study tool. Not affiliated with Matt Dinniman or his publishers.</p>
    </div>
  );
}
