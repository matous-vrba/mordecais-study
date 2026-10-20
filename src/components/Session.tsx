import { useMemo, useRef, useState } from 'react';
import { allWords, pickExercise, type Step } from '../lib/session';
import { markKnown, newCard, review } from '../lib/srs';
import { speechSupported } from '../lib/speech';
import type { DayLog, Grade, Progress } from '../lib/types';
import { Exercise } from './Exercise';
import { WordInfo } from './WordInfo';

export interface SessionResult {
  answers: number;
  mistakes: number;
  newWords: number;
  practice: boolean;
}

interface Props {
  progress: Progress;
  steps: Step[];
  practice: boolean;
  today: number;
  update: (fn: (draft: Progress) => void) => void;
  onFinish: (r: SessionResult) => void;
  onQuit: () => void;
}

function dayLog(p: Progress, today: number): DayLog {
  return (p.days[today] ??= { reviews: 0, correct: 0, newWords: 0, finished: false });
}

export function Session({ progress, steps: initial, practice, today, update, onFinish, onQuit }: Props) {
  // The word list can't change while a session is open, so compute it once.
  const [words] = useState(() => allWords(progress));
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  // Refs, because an answer and "continue" can fire in the same tick.
  const steps = useRef(initial.filter((s) => byId.has(s.wordId)));
  const tally = useRef({ answers: 0, mistakes: 0, newWords: 0 });
  const [index, setIndex] = useState(0);
  const [, rerender] = useState(0);
  const rng = Math.random;

  const step = steps.current[index];
  const word = step && byId.get(step.wordId);
  if (!step || !word) return null;

  const advance = () => {
    if (index + 1 >= steps.current.length) onFinish({ ...tally.current, practice });
    else setIndex(index + 1);
  };

  const learn = (known: boolean) => {
    update((p) => {
      p.cards[word.id] = known ? markKnown(today) : newCard(today);
      dayLog(p, today).newWords++;
    });
    tally.current.newWords++;
    if (known) {
      // No need to quiz a word she already knows.
      steps.current = steps.current.filter((s, i) => i <= index || !(s.isNew && s.wordId === word.id));
    }
    advance();
  };

  const answer = (correct: boolean, grade: Grade) => {
    const type = step.exercise!;
    update((p) => {
      const c = p.counters;
      c.totalAnswers++;
      if (correct) c.totalCorrect++;
      if (correct && type.startsWith('listen')) c.listenCorrect++;
      const bt = (c.byType[type] ??= { answered: 0, correct: 0 });
      bt.answered++;
      if (correct) bt.correct++;

      if (!practice && !step.retry) {
        const card = p.cards[word.id] ?? newCard(today);
        p.cards[word.id] = review(card, grade, today);
        const d = dayLog(p, today);
        if (!step.isNew) d.reviews++;
        if (correct) d.correct++;
      }
    });
    tally.current.answers++;
    if (!correct) {
      tally.current.mistakes++;
      // Try the same word again a little later, in a different form if possible.
      const retry: Step = {
        ...step,
        key: `${step.key}r${index}`,
        retry: true,
        exercise: pickExercise(word, progress.settings, speechSupported(), rng),
      };
      const at = Math.min(steps.current.length, index + 4);
      steps.current = [...steps.current.slice(0, at), retry, ...steps.current.slice(at)];
      rerender((n) => n + 1);
    }
  };

  const total = steps.current.length;
  const pct = Math.round((index / total) * 100);

  return (
    <div className="session">
      <div className="session-bar">
        <button className="link quit" onClick={onQuit} aria-label="Stop for now">
          ✕
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="count">
          {index + 1}/{total}
        </span>
      </div>

      {step.kind === 'intro' ? (
        <div className="intro" key={step.key}>
          <div className="tag">✨ New word · Nové slovo</div>
          <WordInfo word={word} />
          <div className="grade-row">
            <button className="btn meh" onClick={() => learn(true)}>
              I already know it
              <small>Už to znám</small>
            </button>
            <button className="btn primary" onClick={() => learn(false)}>
              Got it!
              <small>Jasně</small>
            </button>
          </div>
        </div>
      ) : (
        <Exercise
          key={step.key}
          word={word}
          type={step.exercise!}
          pool={words}
          rng={rng}
          onAnswer={answer}
          onContinue={advance}
        />
      )}
    </div>
  );
}
