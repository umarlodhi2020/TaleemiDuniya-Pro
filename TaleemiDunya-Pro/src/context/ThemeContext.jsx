import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEME_OPTIONS = [
  { id: 'light', name: 'Clean Light', primary: '#3b82f6', accent: '#60a5fa', bg: '#f1f5f9', type: 'light' },
  { id: 'dark', name: 'Midnight Dark', primary: '#6366f1', accent: '#38bdf8', bg: '#09090b', type: 'dark' },
];

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  THEME_OPTIONS,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('taleemi_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'dark';
  });

  const setTheme = (newTheme) => {
    if (THEME_OPTIONS.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
      try {
        localStorage.setItem('taleemi_theme', newTheme);
      } catch (e) {
        // ignore
      }
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('taleemi_theme', next);
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    
    // Reset all previous theme classes
    const allThemeClasses = ['light-mode', 'dark-mode', 'theme-light', 'theme-dark', 'dark', 'light'];
    allThemeClasses.forEach(cls => {
      root.classList.remove(cls);
      body.classList.remove(cls);
    });

    if (theme === 'dark') {
      root.classList.add('dark', 'dark-mode', 'theme-dark');
      body.classList.add('dark', 'dark-mode', 'theme-dark');
    } else {
      root.classList.add('light-mode', 'theme-light');
      body.classList.add('light-mode', 'theme-light');
    }

    try {
      window.dispatchEvent(new CustomEvent('taleemi-theme-change', { detail: { theme } }));
    } catch (e) {
      // ignore
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

