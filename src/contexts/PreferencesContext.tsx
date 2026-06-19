import { useEffect, useState, type ReactNode } from 'react';
import { PreferencesContext, type Preferences } from './preferencesContext';

const STORAGE_KEY = 'netmap.preferences.v1';

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  showSubnetLabels: true,
  showSubnetBoundaries: true,
};

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  const value = {
    ...preferences,
    setTheme: (theme: Preferences['theme']) => setPreferences((prev) => ({ ...prev, theme })),
    setShowSubnetLabels: (showSubnetLabels: boolean) =>
      setPreferences((prev) => ({ ...prev, showSubnetLabels })),
    setShowSubnetBoundaries: (showSubnetBoundaries: boolean) =>
      setPreferences((prev) => ({ ...prev, showSubnetBoundaries })),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
