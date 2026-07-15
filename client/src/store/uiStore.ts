import { create } from 'zustand';

type Theme = 'light' | 'dark';

const THEME_KEY = 'bs-theme';

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

interface UiState {
  search: string; // drives the /posts?q= query on the feed
  theme: Theme;
  setSearch: (search: string) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  search: '',
  theme: readTheme(),
  setSearch: (search) => set({ search }),
  toggleTheme: () =>
    set((state) => {
      const theme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        /* ignore persistence failures (private mode, etc.) */
      }
      return { theme };
    }),
}));
