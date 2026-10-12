// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ThemeColors {
  background: string;
  surface: string;
  elevated: string;
  backDrop: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  border: string;
  borderLight: string;
  borderFocus: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface IndustrialColors {
  pipeFlowing: string;
  pipeStopped: string;
  pipeBlocked: string;
  tankNormal: string;
  tankHigh: string;
  tankLow: string;
  gaugeNormal: string;
  gaugeWarn: string;
  gaugeAlarm: string;
  valveOpen: string;
  valveClosed: string;
  alarmCritical: string;
  alarmMajor: string;
  alarmMinor: string;
}

let cachedColors: ThemeColors | null = null;
let cachedIndustrial: IndustrialColors | null = null;
let cachedTheme: string | null = null;

const fallback: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#CCCCCC',
  border: '#CCCCCC',
  borderLight: '#E0E0E0',
  borderFocus: '#2196F3',
  primary: '#2196F3',
  secondary: '#4CAF50',
  accent: '#FF9800',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
};

const industrialFallback: IndustrialColors = {
  pipeFlowing: '#2196F3',
  pipeStopped: '#9E9E9E',
  pipeBlocked: '#F44336',
  tankNormal: '#2196F3',
  tankHigh: '#FFC107',
  tankLow: '#F44336',
  gaugeNormal: '#2196F3',
  gaugeWarn: '#FFC107',
  gaugeAlarm: '#F44336',
  valveOpen: '#4CAF50',
  valveClosed: '#9E9E9E',
  alarmCritical: '#F44336',
  alarmMajor: '#FF9800',
  alarmMinor: '#FFC107',
};

const cssVarMap: Record<keyof ThemeColors, string> = {
  background: '--background',
  surface: '--surface',
  elevated: '--elevated',
  backDrop: '--backdrop',
  text: '--text',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  textDisabled: '--text-disabled',
  border: '--border',
  borderLight: '--border-light',
  borderFocus: '--border-focus',
  primary: '--primary',
  secondary: '--secondary',
  accent: '--accent',
  success: '--status-success',
  warning: '--status-warning',
  error: '--status-error',
  info: '--status-info',
};

const industrialCssVarMap: Record<keyof IndustrialColors, string> = {
  pipeFlowing: '--industrial-pipe-flowing',
  pipeStopped: '--industrial-pipe-stopped',
  pipeBlocked: '--industrial-pipe-blocked',
  tankNormal: '--industrial-tank-normal',
  tankHigh: '--industrial-tank-high',
  tankLow: '--industrial-tank-low',
  gaugeNormal: '--industrial-gauge-normal',
  gaugeWarn: '--industrial-gauge-warn',
  gaugeAlarm: '--industrial-gauge-alarm',
  valveOpen: '--industrial-valve-open',
  valveClosed: '--industrial-valve-closed',
  alarmCritical: '--industrial-alarm-critical',
  alarmMajor: '--industrial-alarm-major',
  alarmMinor: '--industrial-alarm-minor',
};

export function getThemeColors(): ThemeColors {
  const themeAttr = document.documentElement.getAttribute('data-theme') || 'dark';
  if (cachedTheme === themeAttr && cachedColors) {
    return cachedColors;
  }

  const styles = getComputedStyle(document.documentElement);
  const result = {} as ThemeColors;

  for (const [key, varName] of Object.entries(cssVarMap)) {
    const value = styles.getPropertyValue(varName).trim();
    result[key as keyof ThemeColors] = value || fallback[key as keyof ThemeColors];
  }

  cachedColors = result;
  cachedTheme = themeAttr;
  return result;
}

export function getIndustrialColors(): IndustrialColors {
  const themeAttr = document.documentElement.getAttribute('data-theme') || 'dark';
  if (cachedTheme === themeAttr && cachedIndustrial) {
    return cachedIndustrial;
  }

  const styles = getComputedStyle(document.documentElement);
  const result = {} as IndustrialColors;

  for (const [key, varName] of Object.entries(industrialCssVarMap)) {
    const value = styles.getPropertyValue(varName).trim();
    result[key as keyof IndustrialColors] = value || industrialFallback[key as keyof IndustrialColors];
  }

  cachedIndustrial = result;
  return result;
}

export function getThemeColor(key: keyof ThemeColors): string {
  return getThemeColors()[key];
}

export function getIndustrialColor(key: keyof IndustrialColors): string {
  return getIndustrialColors()[key];
}

export function getThemeTextColor(): string {
  return getThemeColor('text');
}

export function getThemeBackgroundColor(): string {
  return getThemeColor('background');
}

export function getThemeSurfaceColor(): string {
  return getThemeColor('surface');
}

export function getThemeBorderColor(): string {
  return getThemeColor('border');
}

export function invalidateThemeCache(): void {
  cachedColors = null;
  cachedIndustrial = null;
  cachedTheme = null;
}

export function isDarkTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  return theme === 'dark' || theme === 'tech-dark-blue' || theme === 'blue-dark' || theme === 'green-tech';
}