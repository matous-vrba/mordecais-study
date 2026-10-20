import builtin from '../data/words.json';
import { ALL_EXERCISES } from './storage';
import type { ExerciseType, Progress, Settings, Word } from './types';

export const BUILTIN_WORDS = builtin as Word[];

export function allWords(p: Progress): Word[] {
  return [...p.customWords, ...BUILTIN_WORDS];
}

/** Words from chapters you haven't reached stay locked, so nothing is spoiled. */
export function isUnlocked(w: Word, s: Settings): boolean {
  if (w.book !== s.book) return w.book < s.book;
  return (w.chapter ?? 0) <= s.chapter;
}

export function gapText(w: Word): string {
  return w.gap ?? w.en;
}

/** What to say out loud for the word: drop bracketed notes like "(XP)". */
export function spokenText(w: Word): string {
  return w.en.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function validExercises(
  w: Word,
  enabled: Record<ExerciseType, boolean>,
  canSpeak: boolean,
): ExerciseType[] {
  return ALL_EXERCISES.filter((e) => {
    if (!enabled[e]) return false;
    if (e.startsWith('listen') && !canSpeak) return false;
    if (e === 'listen-sentence') return Boolean(w.ex && w.exCs);
    if (e === 'gap') return Boolean(w.ex?.includes(gapText(w)));
    return true;
  });
}

export function pickExercise(
  w: Word,
  s: Settings,
  canSpeak: boolean,
  rng: Rng,
  firstCheck = false,
): ExerciseType {
  const valid = validExercises(w, s.exercises, canSpeak);
  if (valid.length === 0) return 'card-en-cs';
  // Right after learning a word, recognising it is easier than recalling it.
  if (firstCheck) {
    const easy = valid.filter((e) => e === 'mc-en-cs' || e === 'listen-word');
    if (easy.length) return easy[Math.floor(rng() * easy.length)];
  }
  return valid[Math.floor(rng() * valid.length)];
}

/** Returns `n` option strings (one correct) for multiple choice, preferring same part of speech. */
export function buildOptions(
  w: Word,
  pool: Word[],
  field: (x: Word) => string,
  rng: Rng,
  n = 4,
): string[] {
  const correct = field(w);
  const others = shuffle(
    pool.filter((x) => x.id !== w.id),
    rng,
  ).sort((a, b) => Number(b.pos === w.pos) - Number(a.pos === w.pos));
  const picked = new Set<string>([correct]);
  for (const o of others) {
    if (picked.size >= n) break;
    const v = field(o);
    if (v && v.toLowerCase() !== correct.toLowerCase()) picked.add(v);
  }
  return shuffle([...picked], rng);
}

export interface Step {
  key: string;
  wordId: string;
  kind: 'intro' | 'exercise';
  exercise?: ExerciseType;
  isNew: boolean;
  /** Retries after a wrong answer don't change the schedule a second time. */
  retry?: boolean;
}

export interface SessionPlan {
  steps: Step[];
  reviewCount: number;
  newCount: number;
}

export function newWordCandidates(p: Progress): Word[] {
  const s = p.settings;
  const unseen = allWords(p).filter((w) => isUnlocked(w, s) && !p.cards[w.id]);
  // Her own words first, then the chapter we're about to read, then general vocabulary.
  const rank = (w: Word) => (w.custom ? 0 : w.chapter !== undefined ? 1 : 2);
  return unseen
    .map((w, i) => ({ w, i }))
    .sort((a, b) => rank(a.w) - rank(b.w) || (b.w.chapter ?? 0) - (a.w.chapter ?? 0) || a.i - b.i)
    .map((x) => x.w);
}

export function dueWordIds(p: Progress, today: number): string[] {
  const known = new Set(allWords(p).map((w) => w.id));
  return Object.entries(p.cards)
    .filter(([id, c]) => known.has(id) && c.due <= today)
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, p.settings.maxReviews)
    .map(([id]) => id);
}

export function newAllowanceToday(p: Progress, today: number): number {
  const introducedToday = Object.values(p.cards).filter((c) => c.introducedDay === today).length;
  return Math.max(0, p.settings.newPerDay - introducedToday);
}

export function buildSession(p: Progress, today: number, canSpeak: boolean, rng: Rng): SessionPlan {
  const byId = new Map(allWords(p).map((w) => [w.id, w]));
  const s = p.settings;
  let n = 0;
  const key = () => `s${n++}`;

  const reviews: Step[] = shuffle(dueWordIds(p, today), rng).map((id) => ({
    key: key(),
    wordId: id,
    kind: 'exercise',
    exercise: pickExercise(byId.get(id)!, s, canSpeak, rng),
    isNew: false,
  }));
  const news = newWordCandidates(p).slice(0, newAllowanceToday(p, today));

  const steps: Step[] = [];
  const pending: { step: Step; wait: number }[] = [];
  const push = (st: Step) => {
    steps.push(st);
    pending.forEach((c) => c.wait--);
  };

  let newIdx = 0;
  while (reviews.length || newIdx < news.length || pending.length) {
    const ready = pending.findIndex((c) => c.wait <= 0);
    if (ready >= 0) {
      push(pending.splice(ready, 1)[0].step);
    } else if (newIdx < news.length && (steps.length % 3 === 0 || !reviews.length)) {
      const w = news[newIdx++];
      push({ key: key(), wordId: w.id, kind: 'intro', isNew: true });
      pending.push({
        step: { key: key(), wordId: w.id, kind: 'exercise', exercise: pickExercise(w, s, canSpeak, rng, true), isNew: true },
        wait: 2,
      });
    } else if (reviews.length) {
      push(reviews.shift()!);
    } else {
      push(pending.shift()!.step);
    }
  }

  return { steps, reviewCount: steps.filter((x) => x.kind === 'exercise' && !x.isNew).length, newCount: news.length };
}

/** Extra practice when nothing is due: a random handful of words already learned. Doesn't change the schedule. */
export function buildPractice(p: Progress, canSpeak: boolean, rng: Rng, count = 10): Step[] {
  const byId = new Map(allWords(p).map((w) => [w.id, w]));
  const ids = shuffle(
    Object.keys(p.cards).filter((id) => byId.has(id)),
    rng,
  ).slice(0, count);
  return ids.map((id, i) => ({
    key: `p${i}`,
    wordId: id,
    kind: 'exercise',
    exercise: pickExercise(byId.get(id)!, p.settings, canSpeak, rng),
    isNew: false,
  }));
}
