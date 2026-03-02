import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeConfig {
  theme: Theme;
  primaryColor?: string;
}

export function useTheme() {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    theme: 'light',
    primaryColor: '#4f46e5', // indigo-600
  });

  useEffect(() => {
    // Carregar do localStorage
    const saved = localStorage.getItem('themeConfig');
    if (saved) {
      const config = JSON.parse(saved);
      setThemeConfig(config);
      applyTheme(config);
    } else {
      applyTheme(themeConfig);
    }
  }, []);

  const applyTheme = (config: ThemeConfig) => {
    const html = document.documentElement;

    // Aplicar tema dark/light
    if (config.theme === 'dark') {
      html.classList.add('dark');
    } else if (config.theme === 'light') {
      html.classList.remove('dark');
    } else {
      // Auto: detectar preferência do sistema
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }

    // Aplicar cor primária
    if (config.primaryColor) {
      html.style.setProperty('--color-primary', config.primaryColor);
    }
  };

  const setTheme = (theme: Theme) => {
    const newConfig = { ...themeConfig, theme };
    setThemeConfig(newConfig);
    localStorage.setItem('themeConfig', JSON.stringify(newConfig));
    applyTheme(newConfig);
  };

  const setPrimaryColor = (color: string) => {
    const newConfig = { ...themeConfig, primaryColor: color };
    setThemeConfig(newConfig);
    localStorage.setItem('themeConfig', JSON.stringify(newConfig));
    applyTheme(newConfig);
  };

  return {
    ...themeConfig,
    setTheme,
    setPrimaryColor,
  };
}

// Preset colors
export const PRESET_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Blue', value: '#0ea5e9' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
];
