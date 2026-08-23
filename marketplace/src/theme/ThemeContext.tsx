'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// The single source of truth for light/dark.
//
// Before this existed, ~69 files each defined their own local palette and a few
// components carried their own local theme state defaulting to dark. The result
// was dark panels floating inside a light shell, and a theme control in Settings
// that changed nothing. Everything now reads one value from here.
//
// The applied theme is written to <html data-theme="..."> and the palettes live
// in styles/globals.css. theme/colors.ts resolves every token to those vars, so
// flipping this re-skins inline-styled surfaces a stylesheet could never reach.

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'vs_theme';

interface ThemeContextValue {
  /** What the user chose, including 'system'. */
  preference: ThemePreference;
  /** What is actually on screen — 'system' already resolved. */
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'dark',
  theme: 'dark',
  setPreference: () => {},
});

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStored(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage blocked — fall through to the default */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // G7: dark on the server and first paint. _document's boot script has
  // already stamped the real (possibly stored 'light') value onto <html>
  // before paint, so this initial value never reaches the screen.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [system, setSystem] = useState<ResolvedTheme>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferenceState(readStored());
    setSystem(systemTheme());
    setHydrated(true);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const theme: ResolvedTheme = preference === 'system' ? system : preference;

  // Stamp it on <html> so the CSS palettes take effect. Skipped until the
  // stored preference has been read — before that the boot script's value is
  // already correct and overwriting it would flash the wrong theme.
  useEffect(() => {
    if (typeof document === 'undefined' || !hydrated) return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme, hydrated]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  }, []);

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
