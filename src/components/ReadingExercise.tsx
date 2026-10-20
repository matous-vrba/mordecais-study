import { useMemo, useState } from 'react';
import { shuffle } from '../lib/session';
import type { Reading } from '../lib/types';
import { SpeakButton } from './Speak';

/** A small "CZ" button that reveals the Czech version underneath. */
function CzToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`cz-toggle ${open ? 'on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={open ? 'Hide Czech' : 'Show Czech'}
      aria-pressed={open}
    >
      CZ
    </button>
  );
}

interface Props {
  reading: Reading;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

export function ReadingExercise({ reading, onAnswer, onContinue }: Props) {
  // Option order is shuffled once; `i` keeps the original index to check the answer.
  const options = useMemo(() => shuffle(reading.options.map((o, i) => ({ ...o, i })), Math.random), [reading.id]);
  const [czech, setCzech] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const flip = (k: string) => setCzech((c) => ({ ...c, [k]: !c[k] }));

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    onAnswer(i === reading.answer);
  };
  const correct = picked === reading.answer;

  return (
    <div className="exercise reading">
      <div className="prompt">
        Read and answer
        <small>Přečti si a odpověz</small>
      </div>

      <div className="passage">
        <div className="passage-tools">
          <SpeakButton text={reading.text} label="Listen" />
          <CzToggle open={!!czech.text} onToggle={() => flip('text')} />
        </div>
        <p>{reading.text}</p>
        {czech.text && <p className="cz-text">{reading.textCs}</p>}
      </div>

      <div className="question">
        <div className="question-line">
          <b>{reading.q}</b>
          <CzToggle open={!!czech.q} onToggle={() => flip('q')} />
        </div>
        {czech.q && <div className="cz-text">{reading.qCs}</div>}
      </div>

      <div className="reading-options">
        {options.map((o) => {
          const state =
            picked === null ? '' : o.i === reading.answer ? 'right' : o.i === picked ? 'wrong' : 'dim';
          return (
            <div key={o.i} className="opt-row">
              <button className={`option ${state}`} onClick={() => choose(o.i)} disabled={picked !== null}>
                {o.en}
                {czech[`o${o.i}`] && <span className="cz-text">{o.cs}</span>}
              </button>
              <CzToggle open={!!czech[`o${o.i}`]} onToggle={() => flip(`o${o.i}`)} />
            </div>
          );
        })}
      </div>

      {picked !== null && (
        <div className={`feedback ${correct ? 'ok' : 'nope'}`}>
          <div className="verdict">{correct ? '✔ Correct! · Správně!' : '✘ Not quite · Skoro'}</div>
          {reading.why && (
            <>
              <div className="question-line">
                <span>{reading.why}</span>
                {reading.whyCs && <CzToggle open={!!czech.why} onToggle={() => flip('why')} />}
              </div>
              {czech.why && <div className="cz-text">{reading.whyCs}</div>}
            </>
          )}
          <button className="btn primary wide" onClick={onContinue} autoFocus>
            Continue · Pokračovat
          </button>
        </div>
      )}
    </div>
  );
}
