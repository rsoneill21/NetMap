import { createContext } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface Preferences {
  theme: ThemeMode;
  showSubnetLabels: boolean;
  showSubnetBoundaries: boolean;
}

export interface PreferencesContextValue extends Preferences {
  setTheme: (theme: ThemeMode) => void;
  setShowSubnetLabels: (value: boolean) => void;
  setShowSubnetBoundaries: (value: boolean) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
