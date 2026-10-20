import { MASTERED_INTERVAL } from './srs';
import type { Progress } from './types';

export interface Stats {
  learned: number;
  mastered: number;
  streak: number;
  bestStreak: number;
}

export function computeStats(p: Progress, today: number): Stats {
  const cards = Object.values(p.cards);
  const doneDays = new Set(
    Object.entries(p.days)
      .filter(([, d]) => d.finished)
      .map(([k]) => Number(k)),
  );

  // A streak survives until the end of today even if today isn't done yet.
  let streak = 0;
  for (let d = doneDays.has(today) ? today : today - 1; doneDays.has(d); d--) streak++;

  let bestStreak = 0;
  let run = 0;
  const sorted = [...doneDays].sort((a, b) => a - b);
  sorted.forEach((d, i) => {
    run = i > 0 && sorted[i - 1] === d - 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });

  return {
    learned: cards.length,
    mastered: cards.filter((c) => c.interval >= MASTERED_INTERVAL).length,
    streak,
    bestStreak,
  };
}

export interface Achievement {
  id: string;
  title: string;
  text: string;
  /** Flavour text in the voice of the dungeon's System AI. */
  quip: string;
  check: (p: Progress, s: Stats, session?: { answers: number; mistakes: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-word',
    title: 'First Blood',
    text: 'Learn your first word.',
    quip: 'One word down. Only about 170,000 to go.',
    check: (_p, s) => s.learned >= 1,
  },
  {
    id: 'words-10',
    title: 'Vocabulary Goblin',
    text: 'Learn 10 words.',
    quip: 'You now know more English than the average goblin. Low bar, but still.',
    check: (_p, s) => s.learned >= 10,
  },
  {
    id: 'words-50',
    title: 'Word Hoarder',
    text: 'Learn 50 words.',
    quip: 'You are collecting words like a crawler collects junk. Excellent.',
    check: (_p, s) => s.learned >= 50,
  },
  {
    id: 'words-100',
    title: 'Walking Dictionary',
    text: 'Learn 100 words.',
    quip: 'The audience is impressed. Some of them are even awake.',
    check: (_p, s) => s.learned >= 100,
  },
  {
    id: 'mastered-10',
    title: 'Long-Term Memory',
    text: 'Master 10 words (remembered for 3+ weeks).',
    quip: 'These words are now permanently installed. No refunds.',
    check: (_p, s) => s.mastered >= 10,
  },
  {
    id: 'streak-3',
    title: 'Habit Forming',
    text: 'Train 3 days in a row.',
    quip: 'Three days! The sponsors are starting to notice you.',
    check: (_p, s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    title: 'Crawler of the Week',
    text: 'Train 7 days in a row.',
    quip: 'A full week without giving up. Most crawlers can not say that. Most crawlers are dead.',
    check: (_p, s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    title: 'Thirty Days in the Dungeon',
    text: 'Train 30 days in a row.',
    quip: 'Reward: a Gold Box of pride. It is invisible, but it is there.',
    check: (_p, s) => s.streak >= 30,
  },
  {
    id: 'flawless',
    title: 'Flawless Victory',
    text: 'Finish a session of 10+ answers with no mistakes.',
    quip: 'Not a single mistake. Are you sure you are not cheating?',
    check: (_p, _s, sess) => !!sess && sess.answers >= 10 && sess.mistakes === 0,
  },
  {
    id: 'listener-50',
    title: 'Ears of the Crawler',
    text: 'Answer 50 listening exercises correctly.',
    quip: 'You can hear the monsters coming now. That will be useful.',
    check: (p) => p.counters.listenCorrect >= 50,
  },
  {
    id: 'custom-word',
    title: 'Self-Taught',
    text: 'Add your own word.',
    quip: 'Finding your own loot. Mordecai would be proud. He would not say it, though.',
    check: (p) => p.customWords.length >= 1,
  },
];

/** Returns achievements newly earned and records them in `p` (mutates). */
export function unlockAchievements(
  p: Progress,
  today: number,
  session?: { answers: number; mistakes: number },
): Achievement[] {
  const stats = computeStats(p, today);
  const fresh = ACHIEVEMENTS.filter((a) => !(a.id in p.achievements) && a.check(p, stats, session));
  fresh.forEach((a) => (p.achievements[a.id] = today));
  return fresh;
}
