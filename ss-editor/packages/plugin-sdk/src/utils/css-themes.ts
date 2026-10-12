// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ThemeProvider } from './ThemeProvider';

const ALL_THEMES = [
  'light', 'dark', 'high-contrast', 'blue',
  'tech-dark-blue', 'tech-light-blue',
  'blue-light', 'blue-dark', 'green-tech', 'orange-warm', 'enterprise',
];

export function generateThemeCSS(theme: string): string {
  const primary = ThemeProvider.getToken('--primary');
  const bg = ThemeProvider.getToken('--background');
  const isDark = ThemeProvider.currentTheme.includes('dark') || ThemeProvider.currentTheme === 'green-tech';

  return `
[data-theme="${theme}"] {
  --ss-color-primary: ${primary};
  --ss-color-success: ${isDark ? '#45B86C' : '#52C41A'};
  --ss-color-warning: #FAAD14;
  --ss-color-danger: #FF4D4F;
  --ss-color-info: #1677FF;

  --ss-bg-canvas: ${bg};
  --ss-bg-surface: var(--surface);
  --ss-border-default: var(--border);
  --ss-text-primary: var(--text);
  --ss-text-secondary: var(--text-secondary);

  --ss-pipe-flowing: var(--industrial-pipe-flowing);
  --ss-pipe-stopped: var(--industrial-pipe-stopped);
  --ss-pipe-blocked: var(--industrial-pipe-blocked);
  --ss-tank-normal: var(--industrial-tank-normal);
  --ss-tank-high: var(--industrial-tank-high);
  --ss-gauge-normal: var(--industrial-gauge-normal);
  --ss-gauge-warn: var(--industrial-gauge-warn);
}
`.trim();
}

export function generateAllThemeCSS(): string {
  return ALL_THEMES.map(generateThemeCSS).join('\n\n');
}