import type { CardState, Grade } from './types';

const MIN_EASE = 1.3;
const MAX_INTERVAL = 365;

export function newCard(today: number): CardState {
  return { due: today, interval: 0, ease: 2.5, reps: 0, lapses: 0, introducedDay: today };
}

/** A simplified SM-2: returns the card's next state after an answer today. */
export function review(card: CardState, grade: Grade, today: number): CardState {
  let { interval, ease, reps, lapses } = card;

  if (grade === 'again') {
    lapses += 1;
    reps = 0;
    interval = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else {
    if (reps === 0) interval = grade === 'easy' ? 4 : 1;
    else if (reps === 1) interval = grade === 'hard' ? 2 : grade === 'easy' ? 6 : 3;
    else {
      const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
      interval = Math.max(interval + 1, Math.round(interval * factor));
    }
    if (grade === 'hard') ease = Math.max(MIN_EASE, ease - 0.15);
    if (grade === 'easy') ease += 0.15;
    reps += 1;
  }

  interval = Math.min(interval, MAX_INTERVAL);
  return { ...card, interval, ease, reps, lapses, due: today + interval };
}

/** For words the learner says they already know: push far into the future. */
export function markKnown(today: number): CardState {
  return { ...newCard(today), interval: 30, reps: 3, due: today + 30 };
}

export const MASTERED_INTERVAL = 21;
