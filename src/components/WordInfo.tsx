import { useState } from 'react';
import { spokenText } from '../lib/session';
import type { Word } from '../lib/types';
import { SpeakButton } from './Speak';

/** Full details of a word: Czech, definition, example with its translation behind a tap. */
export function WordInfo({ word, showHeadword = true }: { word: Word; showHeadword?: boolean }) {
  const [showExCs, setShowExCs] = useState(false);
  return (
    <div className="word-info">
      {showHeadword && (
        <div className="headword">
          <span>{word.en}</span>
          <SpeakButton text={spokenText(word)} />
          <SpeakButton text={spokenText(word)} slow />
        </div>
      )}
      {word.pos && <div className="pos">{word.pos}</div>}
      <div className="cs">🇨🇿 {word.cs}</div>
      {word.def && <div className="def">{word.def}</div>}
      {word.ex && (
        <div className="example">
          <div className="ex-en">
            “{word.ex}” <SpeakButton text={word.ex} />
          </div>
          {word.exCs &&
            (showExCs ? (
              <div className="ex-cs">{word.exCs}</div>
            ) : (
              <button type="button" className="link" onClick={() => setShowExCs(true)}>
                Show Czech · Ukázat česky
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
