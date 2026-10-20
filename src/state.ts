import { createContext, useContext } from 'react';
import { defaultProgress } from './lib/storage';
import type { Settings } from './lib/types';

export const SettingsContext = createContext<Settings>(defaultProgress().settings);

export function useSettings(): Settings {
  return useContext(SettingsContext);
}
