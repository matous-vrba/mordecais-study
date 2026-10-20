import { useEffect, useMemo, useState } from 'react';
import { buildOptions, gapText, spokenText, type Rng } from '../lib/session';
import { speak } from '../lib/speech';
import type { ExerciseType, Grade, Word } from '../lib/types';
import { useSettings } from '../state';
import { SpeakButton } from './Speak';
import { WordInfo } from './WordInfo';

interface Props {
  word: Word;
  type: ExerciseType;
  pool: Word[];
  rng: Rng;
  onAnswer: (correct: boolean, grade: Grade) => void;
  onContinue: () => void;
}

const PROMPTS: Record<ExerciseType, [string, string]> = {
  'card-en-cs': ['Do you know what this means?', 'Víš, co to znamená?'],
  'card-cs-en': ['How do you say this in English?', 'Jak se to řekne anglicky?'],
  'mc-en-cs': ['Choose the meaning', 'Vyber význam'],
  'mc-cs-en': ['Choose the English word', 'Vyber anglické slovo'],
  'listen-word': ['Listen. What does it mean?', 'Poslouchej. Co to znamená?'],
  'listen-sentence': ['Listen. What did it say?', 'Poslouchej. Co to říkalo?'],
  gap: ['Fill the gap', 'Doplň chybějící slovo'],
};

export function Exercise(props: Props) {
  const [en, cs] = PROMPTS[props.type];
  return (
    <div className="exercise">
      <div className="prompt">
        {en}
        <small>{cs}</small>
      </div>
      {props.type.startsWith('card') ? <Flashcard {...props} /> : <MultipleChoice {...props} />}
    </div>
  );
}

function Flashcard({ word, type, onAnswer, onContinue }: Props) {
  const [revealed, setRevealed] = useState(false);
  const settings = useSettings();
  const enFirst = type === 'card-en-cs';

  const reveal = () => {
    setRevealed(true);
    if (!enFirst) speak(spokenText(word), { voiceURI: settings.voiceURI, rate: settings.rate });
  };
  const grade = (g: Grade) => {
    onAnswer(g !== 'again', g);
    onContinue();
  };

  return (
    <>
      <div className="card-face">
        {enFirst ? (
          <div className="big">
            {word.en} <SpeakButton text={spokenText(word)} />
          </div>
        ) : (
          <div className="big cs-big">{word.cs}</div>
        )}
      </div>
      {revealed ? (
        <>
          <WordInfo word={word} showHeadword={!enFirst} />
          <div className="grade-row">
            <button className="btn bad" onClick={() => grade('again')}>
              Didn't know
              <small>Nevěděla</small>
            </button>
            <button className="btn meh" onClick={() => grade('hard')}>
              Hard
              <small>Těžké</small>
            </button>
            <button className="btn good" onClick={() => grade('good')}>
              Knew it
              <small>Věděla</small>
            </button>
          </div>
        </>
      ) : (
        <button className="btn primary wide" onClick={reveal}>
          Show answer · Ukázat
        </button>
      )}
    </>
  );
}

function MultipleChoice({ word, type, pool, rng, onAnswer, onContinue }: Props) {
  const settings = useSettings();
  const [picked, setPicked] = useState<string | null>(null);

  const field = useMemo<(w: Word) => string>(() => {
    switch (type) {
      case 'mc-cs-en':
        return (w) => w.en;
      case 'gap':
        return gapText;
      case 'listen-sentence':
        return (w) => w.exCs ?? '';
      default:
        return (w) => w.cs;
    }
  }, [type]);

  // Options are fixed for the life of this exercise.
  const options = useMemo(() => buildOptions(word, pool, field, rng), [word.id, type]);
  const correct = field(word);
  const sentence = type === 'listen-sentence';
  const audio = sentence ? word.ex! : spokenText(word);
  const say = (slow = false) => speak(audio, { voiceURI: settings.voiceURI, rate: settings.rate * (slow ? 0.65 : 1) });

  useEffect(() => {
    if (type.startsWith('listen')) say();
  }, [word.id, type]);

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === correct;
    onAnswer(ok, ok ? 'good' : 'again');
    if (type === 'gap' && word.ex) speak(word.ex, { voiceURI: settings.voiceURI, rate: settings.rate });
  };

  return (
    <>
      <div className="card-face">
        {type === 'mc-en-cs' && (
          <div className="big">
            {word.en} <SpeakButton text={spokenText(word)} />
          </div>
        )}
        {type === 'mc-cs-en' && <div className="big cs-big">{word.cs}</div>}
        {type.startsWith('listen') && (
          <div className="listen">
            <button className="btn play" onClick={() => say()} aria-label="Play again">
              🔊
            </button>
            <button className="btn play small" onClick={() => say(true)} aria-label="Play slowly">
              🐢
            </button>
            {picked && <div className="reveal-text">{sentence ? `“${word.ex}”` : word.en}</div>}
          </div>
        )}
        {type === 'gap' && word.ex && <GapSentence sentence={word.ex} gap={gapText(word)} filled={picked !== null} />}
      </div>

      <div className={`options ${sentence ? 'long' : ''}`}>
        {options.map((opt) => {
          const state = !picked ? '' : opt === correct ? 'right' : opt === picked ? 'wrong' : 'dim';
          return (
            <button key={opt} className={`option ${state}`} onClick={() => choose(opt)} disabled={!!picked}>
              {opt}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className={`feedback ${picked === correct ? 'ok' : 'nope'}`}>
          <div className="verdict">{picked === correct ? '✔ Correct! · Správně!' : '✘ Not quite · Skoro'}</div>
          <WordInfo word={word} />
          <button className="btn primary wide" onClick={onContinue} autoFocus>
            Continue · Pokračovat
          </button>
        </div>
      )}
    </>
  );
}

function GapSentence({ sentence, gap, filled }: { sentence: string; gap: string; filled: boolean }) {
  const i = sentence.indexOf(gap);
  return (
    <div className="gap-sentence">
      {sentence.slice(0, i)}
      <span className={`gap ${filled ? 'filled' : ''}`}>{filled ? gap : '_____'}</span>
      {sentence.slice(i + gap.length)}
    </div>
  );
}
