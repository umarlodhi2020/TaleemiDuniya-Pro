import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Dark mode is PERMANENT default.
    // Light mode is TEMPORARY (session-only) — on reload, dark mode is restored.
    const saved = localStorage.getItem('taleemi_theme');
    // Only restore dark (permanent). Light is never saved permanently.
    if (saved === 'dark') return 'dark';
    // First visit or after reload → always dark
    localStorage.setItem('taleemi_theme', 'dark');
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      // Light mode: apply class but do NOT save to localStorage (temporary)
      root.classList.add('light-mode');
      body.classList.add('light-mode');
      root.classList.remove('dark-mode');
      body.classList.remove('dark-mode');
    } else {
      // Dark mode: apply class and save permanently
      localStorage.setItem('taleemi_theme', 'dark');
      root.classList.remove('light-mode');
      body.classList.remove('light-mode');
      root.classList.add('dark-mode');
      body.classList.add('dark-mode');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
