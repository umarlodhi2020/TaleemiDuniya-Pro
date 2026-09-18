import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEME_OPTIONS = [
  { id: 'royal', name: 'Royal Indigo', primary: '#4f46e5', accent: '#10b981', bg: '#f8fafc', type: 'light' },
  { id: 'ocean', name: 'Ocean Blue', primary: '#0284c7', accent: '#06b6d4', bg: '#f1f5f9', type: 'light' },
  { id: 'academic', name: 'Academic Gold', primary: '#1e3a8a', accent: '#f59e0b', bg: '#fafafa', type: 'light' },
  { id: 'teal', name: 'Teal Mint', primary: '#0d9488', accent: '#34d399', bg: '#f8fafc', type: 'light' },
  { id: 'dark', name: 'Midnight Dark', primary: '#6366f1', accent: '#38bdf8', bg: '#09090b', type: 'dark' },
];

const ThemeContext = createContext({
  theme: 'royal',
  setTheme: () => {},
  toggleTheme: () => {},
  THEME_OPTIONS,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('taleemi_theme');
    if (saved && THEME_OPTIONS.some(t => t.id === saved)) {
      return saved;
    }
    // Default light theme is Royal Indigo
    localStorage.setItem('taleemi_theme', 'royal');
    return 'royal';
  });

  const setTheme = (newTheme) => {
    if (THEME_OPTIONS.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('taleemi_theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'royal' : 'dark';
      localStorage.setItem('taleemi_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    
    // Reset theme classes
    const allThemeClasses = ['light-mode', 'dark-mode', 'theme-royal', 'theme-ocean', 'theme-academic', 'theme-teal', 'theme-dark'];
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

