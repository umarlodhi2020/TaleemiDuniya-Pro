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
    // Always start with light mode when the page opens
    localStorage.setItem('taleemi_theme', 'light');
    return 'light';
  });

  const setTheme = (newTheme) => {
    if (THEME_OPTIONS.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('taleemi_theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('taleemi_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    
    // Reset theme classes
    const allThemeClasses = ['light-mode', 'dark-mode', 'theme-light', 'theme-dark'];
    allThemeClasses.forEach(cls => {
      root.classList.remove(cls);
      body.classList.remove(cls);
    });

    if (theme === 'dark') {
      root.classList.add('dark-mode', 'theme-dark');
      body.classList.add('dark-mode', 'theme-dark');
    } else {
      root.classList.add('light-mode', `theme-${theme}`);
      body.classList.add('light-mode', `theme-${theme}`);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

