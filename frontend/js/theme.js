/**
 * Student Task Manager — Theme Manager (theme.js)
 *
 * Responsibilities:
 *   1. Detect saved theme from localStorage (or OS preference as default)
 *   2. Apply theme to <html data-theme="..."> BEFORE first paint (no flash)
 *   3. Expose ThemeManager.toggle() for all toggle buttons
 *   4. Keep icon state in sync across pages
 *   5. Persist preference in localStorage
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'stm_theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  const ThemeManager = {
    /**
     * Returns the currently active theme string.
     */
    current() {
      return document.documentElement.getAttribute('data-theme') || LIGHT;
    },

    /**
     * Detects the preferred theme:
     *   1. Saved in localStorage
     *   2. OS prefers-color-scheme
     *   3. Default: light
     */
    getPreferred() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === DARK || saved === LIGHT) return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return DARK;
      }
      return LIGHT;
    },

    /**
     * Apply a theme to the document.
     * @param {string} theme - 'light' | 'dark'
     */
    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-bs-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
      this._syncToggleButtons(theme);
    },

    /**
     * Toggle between light and dark.
     */
    toggle() {
      const next = this.current() === DARK ? LIGHT : DARK;
      this.apply(next);
    },

    /**
     * Update all theme toggle buttons to reflect the active theme.
     */
    _syncToggleButtons(theme) {
      const buttons = document.querySelectorAll('.btn-theme-toggle');
      buttons.forEach(btn => {
        btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
      });
    },

    /**
     * Initialize: apply saved/preferred theme and wire toggle buttons.
     * Call this once per page in DOMContentLoaded.
     */
    init() {
      const theme = this.getPreferred();
      // apply() already called by inline script, but also update buttons after DOM ready:
      this._syncToggleButtons(theme);

      // Wire all toggle buttons
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-theme-toggle');
        if (btn) {
          ThemeManager.toggle();
        }


      });

      // Sync with OS preference changes (only if no saved preference)
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem(STORAGE_KEY)) {
            this.apply(e.matches ? DARK : LIGHT);
          }
        });
      }
    }
  };

  // Expose globally
  window.ThemeManager = ThemeManager;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
  } else {
    ThemeManager.init();
  }
})();
