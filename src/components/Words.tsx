import { useState, type FormEvent } from 'react';
import { MASTERED_INTERVAL } from '../lib/srs';
import { allWords, isUnlocked } from '../lib/session';
import type { Progress, Word } from '../lib/types';
import { WordInfo } from './WordInfo';

type Filter = 'all' | 'learning' | 'new' | 'mine';

interface Props {
  progress: Progress;
  onAdd: (w: Word) => void;
  onDelete: (id: string) => void;
}

export function Words({ progress, onAdd, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const unlocked = allWords(progress).filter((w) => isUnlocked(w, progress.settings));
  const q = query.trim().toLowerCase();
  const shown = unlocked.filter((w) => {
    if (q && !w.en.toLowerCase().includes(q) && !w.cs.toLowerCase().includes(q)) return false;
    if (filter === 'learning') return Boolean(progress.cards[w.id]);
    if (filter === 'new') return !progress.cards[w.id];
    if (filter === 'mine') return Boolean(w.custom);
    return true;
  });

  const status = (w: Word) => {
    const c = progress.cards[w.id];
    if (!c) return <span className="chip">new</span>;
    if (c.interval >= MASTERED_INTERVAL) return <span className="chip gold">⭐ mastered</span>;
    return <span className="chip blue">learning</span>;
  };

  return (
    <div className="words">
      <h1>Word list · Slovíčka</h1>

      {adding ? (
        <AddWord
          book={progress.settings.book}
          chapter={progress.settings.chapter}
          onSave={(w) => {
            onAdd(w);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="btn primary wide" onClick={() => setAdding(true)}>
          ＋ Add a word from the book
        </button>
      )}

      <input
        className="search"
        type="search"
        placeholder="Search English or Czech…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tabs">
        {(['all', 'learning', 'new', 'mine'] as Filter[]).map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'mine' ? 'my words' : f}
          </button>
        ))}
      </div>

      <ul className="word-list">
        {shown.map((w) => (
          <li key={w.id} className={open === w.id ? 'open' : ''}>
            <button className="word-row" onClick={() => setOpen(open === w.id ? null : w.id)}>
              <span className="en">{w.en}</span>
              <span className="cs-short">{w.cs}</span>
              {status(w)}
            </button>
            {open === w.id && (
              <div className="word-detail">
                <WordInfo word={w} />
                {w.custom && (
                  <button
                    className="btn bad small"
                    onClick={() => {
                      if (confirm(`Delete “${w.en}”?`)) onDelete(w.id);
                    }}
                  >
                    Delete my word
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="empty">Nothing here.</li>}
      </ul>
    </div>
  );
}

function AddWord({
  book,
  chapter,
  onSave,
  onCancel,
}: {
  book: number;
  chapter: number;
  onSave: (w: Word) => void;
  onCancel: () => void;
}) {
  const [en, setEn] = useState('');
  const [cs, setCs] = useState('');
  const [ex, setEx] = useState('');
  const [exCs, setExCs] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!en.trim() || !cs.trim()) return;
    const sentence = ex.trim();
    onSave({
      id: `my-${Date.now().toString(36)}`,
      en: en.trim(),
      cs: cs.trim(),
      ex: sentence || undefined,
      // Only offer fill-the-gap if the word really appears in the sentence.
      gap: sentence && sentence.includes(en.trim()) ? en.trim() : undefined,
      exCs: exCs.trim() || undefined,
      book,
      chapter,
      custom: true,
      tags: ['mine'],
    });
  };

  return (
    <form className="panel add-word" onSubmit={submit}>
      <label>
        English word or phrase *
        <input value={en} onChange={(e) => setEn(e.target.value)} autoCapitalize="none" required />
      </label>
      <label>
        Czech meaning *
        <input value={cs} onChange={(e) => setCs(e.target.value)} required />
      </label>
      <label>
        Example sentence (optional)
        <input value={ex} onChange={(e) => setEx(e.target.value)} />
      </label>
      <label>
        Example in Czech (optional)
        <input value={exCs} onChange={(e) => setExCs(e.target.value)} />
      </label>
      <p className="hint">It will be added to chapter {chapter} and show up first in your next training.</p>
      <div className="grade-row">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save word
        </button>
      </div>
    </form>
  );
}
