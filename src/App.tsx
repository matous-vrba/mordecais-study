import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Home } from './components/Home';
import { Session, type SessionResult } from './components/Session';
import { SettingsScreen } from './components/SettingsScreen';
import { Words } from './components/Words';
import { unlockAchievements, type Achievement } from './lib/achievements';
import { dayIndex } from './lib/dates';
import { buildPractice, buildSession, type Step } from './lib/session';
import { speechSupported } from './lib/speech';
import { defaultProgress, loadProgress, requestPersistentStorage, saveProgress } from './lib/storage';
import type { Progress } from './lib/types';
import { SettingsContext } from './state';

type Screen = 'home' | 'session' | 'done' | 'words' | 'settings';

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<{ steps: Step[]; practice: boolean } | null>(null);
  const [result, setResult] = useState<{ r: SessionResult; earned: Achievement[] } | null>(null);
  const [toast, setToast] = useState<Achievement[]>([]);
  const [today, setToday] = useState(dayIndex);

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(requestPersistentStorage, []);

  // The app may stay open overnight; pick up the new day when it comes back.
  useEffect(() => {
    const refresh = () => setToday(dayIndex());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const update = useCallback((fn: (draft: Progress) => void) => {
    setProgress((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const start = (practice: boolean) => {
    const canSpeak = speechSupported();
    const steps = practice
      ? buildPractice(progress, canSpeak, Math.random)
      : buildSession(progress, today, canSpeak, Math.random).steps;
    if (!steps.length) return;
    setSession({ steps, practice });
    setScreen('session');
  };

  const finish = (r: SessionResult) => {
    let earned: Achievement[] = [];
    // flushSync applies the update right away, so `earned` is filled in below.
    flushSync(() =>
      update((p) => {
        if (!r.practice) {
          p.days[today] ??= { reviews: 0, correct: 0, newWords: 0, finished: false };
          p.days[today].finished = true;
        }
        earned = unlockAchievements(p, today, r);
      }),
    );
    setResult({ r, earned });
    setScreen('done');
  };

  const addWord: Parameters<typeof Words>[0]['onAdd'] = (w) => {
    let earned: Achievement[] = [];
    flushSync(() =>
      update((p) => {
        p.customWords.unshift(w);
        earned = unlockAchievements(p, today);
      }),
    );
    if (earned.length) setToast(earned);
  };

  return (
    <SettingsContext.Provider value={progress.settings}>
      <main className="app">
        {screen === 'home' && (
          <Home
            progress={progress}
            today={today}
            onStart={() => start(false)}
            onPractice={() => start(true)}
            onChangeChapter={(d) =>
              update((p) => {
                p.settings.chapter = Math.max(1, p.settings.chapter + d);
              })
            }
          />
        )}
        {screen === 'session' && session && (
          <Session
            progress={progress}
            steps={session.steps}
            practice={session.practice}
            today={today}
            update={update}
            onFinish={finish}
            onQuit={() => setScreen('home')}
          />
        )}
        {screen === 'done' && result && <Done result={result} onHome={() => setScreen('home')} />}
        {screen === 'words' && (
          <Words
            progress={progress}
            onAdd={addWord}
            onDelete={(id) =>
              update((p) => {
                p.customWords = p.customWords.filter((w) => w.id !== id);
                delete p.cards[id];
              })
            }
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            progress={progress}
            onSettings={(s) => update((p) => Object.assign(p.settings, s))}
            onReplace={(p) => setProgress(p)}
            onReset={() => setProgress(defaultProgress())}
          />
        )}
      </main>

      {screen !== 'session' && (
        <nav className="tabbar">
          {(
            [
              ['home', '⚔️', 'Train'],
              ['words', '📖', 'Words'],
              ['settings', '⚙️', 'Settings'],
            ] as const
          ).map(([id, icon, label]) => (
            <button key={id} className={screen === id || (id === 'home' && screen === 'done') ? 'active' : ''} onClick={() => setScreen(id)}>
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      )}

      {toast.length > 0 && <AchievementToast items={toast} onClose={() => setToast([])} />}
    </SettingsContext.Provider>
  );
}

function Done({ result, onHome }: { result: { r: SessionResult; earned: Achievement[] }; onHome: () => void }) {
  const { r, earned } = result;
  const right = r.answers - r.mistakes;
  return (
    <div className="done">
      <div className="logo">🏆</div>
      <h1>{r.practice ? 'Practice complete!' : 'Floor cleared!'}</h1>
      <p className="tagline">{r.practice ? 'Extra training never hurts.' : "Today's training is done. Hotovo!"}</p>
      <div className="stats">
        <div className="stat">
          <b>{r.newWords}</b>
          <span>new words</span>
        </div>
        <div className="stat">
          <b>{right}</b>
          <span>correct</span>
        </div>
        <div className="stat">
          <b>{r.answers ? Math.round((right / r.answers) * 100) : 100}%</b>
          <span>accuracy</span>
        </div>
      </div>
      {earned.map((a) => (
        <AchievementCard key={a.id} a={a} />
      ))}
      <button className="btn primary wide big-btn" onClick={onHome}>
        Back to the safe room
      </button>
    </div>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <div className="achievement">
      <div className="ach-head">New achievement!</div>
      <div className="ach-title">{a.title}</div>
      <div className="ach-text">{a.text}</div>
      <div className="ach-quip">{a.quip}</div>
    </div>
  );
}

function AchievementToast({ items, onClose }: { items: Achievement[]; onClose: () => void }) {
  return (
    <div className="toast" onClick={onClose} role="status">
      {items.map((a) => (
        <AchievementCard key={a.id} a={a} />
      ))}
      <small>Tap to close</small>
    </div>
  );
}
