export interface Word {
  id: string;
  /** English headword or phrase as shown to the learner. */
  en: string;
  /** Czech translation(s). */
  cs: string;
  pos?: string;
  /** Simple English definition. */
  def?: string;
  /** Original example sentence (never a quote from the book). */
  ex?: string;
  /** The exact text inside `ex` to blank out in fill-the-gap. Defaults to `en`. */
  gap?: string;
  /** Czech translation of `ex`. */
  exCs?: string;
  book: number;
  /** Chapter where the word first shows up; omitted for general series vocabulary. */
  chapter?: number;
  tags?: string[];
  /** True for words the learner added on the phone. */
  custom?: boolean;
}

export interface CardState {
  /** Day index (see dates.ts) when the card is next due. */
  due: number;
  /** Days between reviews. */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  introducedDay: number;
}

export type ExerciseType =
  | 'card-en-cs'
  | 'card-cs-en'
  | 'mc-en-cs'
  | 'mc-cs-en'
  | 'listen-word'
  | 'listen-sentence'
  | 'gap';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface DayLog {
  reviews: number;
  correct: number;
  newWords: number;
  finished: boolean;
}

export interface Settings {
  book: number;
  /** The chapter you will read next. Words up to this chapter are unlocked. */
  chapter: number;
  newPerDay: number;
  maxReviews: number;
  voiceURI?: string;
  rate: number;
  exercises: Record<ExerciseType, boolean>;
}

export interface Progress {
  version: 1;
  cards: Record<string, CardState>;
  customWords: Word[];
  settings: Settings;
  /** Keyed by day index. */
  days: Record<number, DayLog>;
  /** Achievement id -> day index unlocked. */
  achievements: Record<string, number>;
  counters: {
    listenCorrect: number;
    totalCorrect: number;
    totalAnswers: number;
    /** Per exercise type: how often it was answered, to see what she uses. */
    byType: Partial<Record<ExerciseType, { answered: number; correct: number }>>;
  };
}
