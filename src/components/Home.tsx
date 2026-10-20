import { computeStats } from '../lib/achievements';
import { dueWordIds, newAllowanceToday, newWordCandidates } from '../lib/session';
import type { Progress } from '../lib/types';

interface Props {
  progress: Progress;
  today: number;
  onStart: () => void;
  onPractice: () => void;
  onChangeChapter: (delta: number) => void;
}

export function Home({ progress, today, onStart, onPractice, onChangeChapter }: Props) {
  const stats = computeStats(progress, today);
  const due = dueWordIds(progress, today).length;
  const fresh = Math.min(newWordCandidates(progress).length, newAllowanceToday(progress, today));
  const finishedToday = progress.days[today]?.finished;
  const s = progress.settings;

  return (
    <div className="home">
      <header className="hero">
        <div className="logo">📜</div>
        <h1>Mordecai's Study Guide</h1>
        <p className="tagline">{finishedToday ? 'Good work today, crawler.' : 'Welcome back, crawler. Training time.'}</p>
      </header>

      <div className="stats">
        <div className="stat">
          <b>🔥 {stats.streak}</b>
          <span>day streak</span>
        </div>
        <div className="stat">
          <b>{stats.learned}</b>
          <span>words learned</span>
        </div>
        <div className="stat">
          <b>⭐ {stats.mastered}</b>
          <span>mastered</span>
        </div>
      </div>

      <section className="panel today">
        <h2>Today's training · Dnešní trénink</h2>
        {due + fresh > 0 ? (
          <>
            <p>
              <b>{due}</b> to review · <b>{fresh}</b> new words
            </p>
            <button className="btn primary wide big-btn" onClick={onStart}>
              {finishedToday ? 'Continue training' : 'Start training ⚔️'}
            </button>
          </>
        ) : (
          <>
            <p>
              {stats.learned === 0
                ? 'No words unlocked yet. Check the chapter below.'
                : 'All done for today! Come back tomorrow for new words. · Hotovo, zítra přijdou nová slova.'}
            </p>
            {stats.learned > 0 && (
              <button className="btn wide" onClick={onPractice}>
                Extra practice (10 words)
              </button>
            )}
          </>
        )}
      </section>

      <section className="panel chapter">
        <h2>Where are you in the book?</h2>
        <p className="hint">Set the chapter you will read next. New words come from there and earlier, so nothing gets spoiled.</p>
        <div className="stepper">
          <button className="btn" onClick={() => onChangeChapter(-1)} aria-label="Previous chapter">
            −
          </button>
          <div className="stepper-value">
            Book {s.book}
            <b>Chapter {s.chapter}</b>
          </div>
          <button className="btn" onClick={() => onChangeChapter(1)} aria-label="Next chapter">
            +
          </button>
        </div>
      </section>
    </div>
  );
}
