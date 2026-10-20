import type { ExerciseType, Progress } from './types';

const KEY = 'mordecai.progress.v1';

export const ALL_EXERCISES: ExerciseType[] = [
  'card-en-cs',
  'card-cs-en',
  'mc-en-cs',
  'mc-cs-en',
  'listen-word',
  'listen-sentence',
  'gap',
];

export function defaultProgress(): Progress {
  return {
    version: 1,
    cards: {},
    customWords: [],
    settings: {
      book: 1,
      chapter: 11,
      newPerDay: 8,
      maxReviews: 40,
      readingPerDay: 2,
      rate: 0.85,
      exercises: Object.fromEntries(ALL_EXERCISES.map((e) => [e, true])) as Record<ExerciseType, boolean>,
    },
    days: {},
    readings: {},
    achievements: {},
    counters: { listenCorrect: 0, totalCorrect: 0, totalAnswers: 0, byType: {} },
  };
}

/** Fill in fields added in later versions so old saves keep working. */
function normalize(raw: Partial<Progress>): Progress {
  const base = defaultProgress();
  return {
    ...base,
    ...raw,
    settings: {
      ...base.settings,
      ...raw.settings,
      exercises: { ...base.settings.exercises, ...raw.settings?.exercises },
    },
    counters: { ...base.counters, ...raw.counters },
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Storage blocked or corrupt; start fresh rather than crash.
  }
  return defaultProgress();
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Ignore; nothing useful to do on a phone without storage.
  }
}

/** Ask the browser not to evict our data when space runs low. */
export function requestPersistentStorage(): void {
  try {
    navigator.storage?.persist?.();
  } catch {
    // Not supported.
  }
}

export function exportBackup(p: Progress): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mordecai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<Progress> {
  const parsed = JSON.parse(await file.text());
  if (parsed?.version !== 1 || typeof parsed.cards !== 'object') {
    throw new Error('This is not a Mordecai backup file.');
  }
  return normalize(parsed);
}
