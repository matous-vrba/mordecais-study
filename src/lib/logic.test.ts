import { describe, expect, it } from 'vitest';
import { computeStats } from './achievements';
import { BUILTIN_WORDS, buildOptions, buildSession, gapText, newWordCandidates, spokenText } from './session';
import { newCard, review } from './srs';
import { defaultProgress } from './storage';

/** Deterministic random numbers so tests are repeatable. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('word list', () => {
  it('has unique ids', () => {
    const ids = BUILTIN_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the required fields on every word', () => {
    for (const w of BUILTIN_WORDS) {
      expect(w.en, w.id).toBeTruthy();
      expect(w.cs, w.id).toBeTruthy();
      expect(w.book, w.id).toBeGreaterThan(0);
      expect(Boolean(w.ex) === Boolean(w.exCs), `${w.id}: ex and exCs go together`).toBe(true);
    }
  });

  it('every gap appears in its example sentence', () => {
    for (const w of BUILTIN_WORDS.filter((x) => x.ex)) {
      expect(w.ex!.includes(gapText(w)), `${w.id}: "${gapText(w)}" not in "${w.ex}"`).toBe(true);
    }
  });

  it('speaks headwords without bracketed notes', () => {
    expect(spokenText({ ...BUILTIN_WORDS[0], en: 'experience (XP)' })).toBe('experience');
    expect(spokenText({ ...BUILTIN_WORDS[0], en: "kick (someone's) ass" })).toBe('kick ass');
  });
});

describe('spaced repetition', () => {
  it('grows intervals with good answers and resets on a miss', () => {
    let c = newCard(100);
    c = review(c, 'good', 100);
    expect(c.interval).toBe(1);
    c = review(c, 'good', 101);
    expect(c.interval).toBe(3);
    c = review(c, 'good', 104);
    expect(c.interval).toBeGreaterThan(3);
    c = review(c, 'again', 112);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(113);
    expect(c.lapses).toBe(1);
  });
});

describe('daily session', () => {
  it('introduces new words, each followed later by a check', () => {
    const p = defaultProgress();
    const plan = buildSession(p, 100, true, seeded());
    expect(plan.newCount).toBe(p.settings.newPerDay);
    for (const intro of plan.steps.filter((s) => s.kind === 'intro')) {
      const at = plan.steps.indexOf(intro);
      const check = plan.steps.findIndex((s, i) => i > at && s.wordId === intro.wordId && s.kind === 'exercise');
      expect(check).toBeGreaterThan(at);
    }
  });

  it('includes due reviews and respects the new-word allowance', () => {
    const p = defaultProgress();
    p.cards.dungeon = { ...newCard(90), due: 100, interval: 3, reps: 2 };
    p.cards.loot = { ...newCard(100), due: 101 }; // introduced today, not due
    const plan = buildSession(p, 100, true, seeded());
    expect(plan.steps.some((s) => s.wordId === 'dungeon' && !s.isNew)).toBe(true);
    expect(plan.steps.some((s) => s.wordId === 'loot')).toBe(false);
    expect(plan.newCount).toBe(p.settings.newPerDay - 1);
  });

  it('never unlocks words from chapters ahead', () => {
    const p = defaultProgress();
    p.settings.chapter = 5;
    p.customWords.push({ id: 'future', en: 'future', cs: 'budoucnost', book: 1, chapter: 6, custom: true });
    p.customWords.push({ id: 'mine', en: 'mine', cs: 'můj', book: 1, chapter: 5, custom: true });
    const candidates = newWordCandidates(p).map((w) => w.id);
    expect(candidates).not.toContain('future');
    expect(candidates[0]).toBe('mine');
  });

  it('skips listening exercises when the phone cannot speak', () => {
    const plan = buildSession(defaultProgress(), 100, false, seeded(7));
    expect(plan.steps.some((s) => s.exercise?.startsWith('listen'))).toBe(false);
  });
});

describe('multiple choice options', () => {
  it('returns four distinct options including the answer', () => {
    const w = BUILTIN_WORDS.find((x) => x.id === 'dodge')!;
    const opts = buildOptions(w, BUILTIN_WORDS, (x) => x.cs, seeded(3));
    expect(opts).toHaveLength(4);
    expect(new Set(opts).size).toBe(4);
    expect(opts).toContain(w.cs);
  });
});

describe('streaks', () => {
  it('counts consecutive finished days and survives an unfinished today', () => {
    const p = defaultProgress();
    for (const d of [95, 97, 98, 99]) p.days[d] = { reviews: 1, correct: 1, newWords: 0, finished: true };
    expect(computeStats(p, 100).streak).toBe(3);
    expect(computeStats(p, 101).streak).toBe(0);
    expect(computeStats(p, 100).bestStreak).toBe(3);
  });
});
