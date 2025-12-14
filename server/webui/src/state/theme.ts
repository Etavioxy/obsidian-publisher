// @unocss-include
/**
 * Theme State Management
 * Handles dark mode toggle and persistence
 */

type Theme = 'light' | 'dark';
type ThemeListener = (theme: Theme) => void;

class ThemeStore {
  private theme: Theme = 'light';
  private listeners: Map<symbol, ThemeListener> = new Map();
  private readonly STORAGE_KEY = 'theme';

  constructor() {
    this.restoreFromStorage();
    this.applyTheme();
  }

  /**
   * Restore theme from localStorage
   */
  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        this.theme = stored;
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.theme = prefersDark ? 'dark' : 'light';
      }
    } catch (error) {
      console.error('Failed to restore theme:', error);
    }
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.theme;
  }

  /**
   * Check if dark mode is enabled
   */
  isDark(): boolean {
    return this.theme === 'dark';
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.applyTheme();
    
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }

    this.notifyListeners();
  }

  /**
   * Toggle between light and dark
   */
  toggle(): void {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: ThemeListener): () => void {
    const id = Symbol();
    this.listeners.set(id, listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.theme);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }
}

export const themeStore = new ThemeStore();
export type { Theme };
