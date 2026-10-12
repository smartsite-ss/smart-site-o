// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 主题配置

export interface ButtonTokens {
  background: string;
  hover: string;
  active: string;
  text: string;
}

export interface ControlButtonTokens extends ButtonTokens {
  border: string;
}

export interface StatusTokens {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ShadowTokens {
  small: string;
  medium: string;
  large: string;
  card: string;
  modal: string;
  dropdown: string;
}

export interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
  theme: string;
}

export interface IndustrialTokens {
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

export interface Theme {
  primary: string;
  secondary: string;
  accent: string;

  background: string;
  surface: string;
  headerBackground: string;
  elevated: string;
  backDrop: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  headerText: string;

  border: string;
  borderLight: string;
  borderFocus: string;

  button: ButtonTokens;
  controlButton: ControlButtonTokens;
  status: StatusTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
  transition: TransitionTokens;
  industrial?: IndustrialTokens;
}

// ============================================================
// 轻色系列
// ============================================================

export const lightTheme: Theme = {
  primary: '#2196F3',
  secondary: '#4CAF50',
  accent: '#FF9800',

  background: '#F5F5F5',
  surface: '#FFFFFF',
  headerBackground: '#2196F3',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#CCCCCC',
  headerText: '#FFFFFF',

  border: '#CCCCCC',
  borderLight: '#E0E0E0',
  borderFocus: '#2196F3',

  button: {
    background: '#2196F3',
    hover: '#1976D2',
    active: '#1565C0',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#E3F2FD',
    active: '#2196F3',
    text: '#333333',
    border: '#CCCCCC',
  },

  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.15)',
    large: '0 8px 16px rgba(0, 0, 0, 0.2)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.2)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  },

  industrial: {
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
  },
};

export const highContrastTheme: Theme = {
  primary: '#0066cc',
  secondary: '#009933',
  accent: '#ff6600',

  background: '#ffffff',
  surface: '#f8f8f8',
  headerBackground: '#0066cc',
  elevated: '#ffffff',
  backDrop: 'rgba(0, 0, 0, 0.5)',

  text: '#000000',
  textSecondary: '#333333',
  textTertiary: '#555555',
  textDisabled: '#888888',
  headerText: '#ffffff',

  border: '#000000',
  borderLight: '#666666',
  borderFocus: '#0066cc',

  button: {
    background: '#0066cc',
    hover: '#0052a3',
    active: '#003d7a',
    text: '#ffffff',
  },

  controlButton: {
    background: '#ffffff',
    hover: '#e6f2ff',
    active: '#0066cc',
    text: '#000000',
    border: '#000000',
  },

  status: {
    success: '#009933',
    warning: '#ff6600',
    error: '#cc0000',
    info: '#0066cc',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(0, 0, 0, 0.2)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.3)',
    large: '0 8px 16px rgba(0, 0, 0, 0.4)',
    card: '0 2px 8px rgba(0, 0, 0, 0.15)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.3)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#0066cc',
    pipeStopped: '#666666',
    pipeBlocked: '#cc0000',
    tankNormal: '#0066cc',
    tankHigh: '#ff6600',
    tankLow: '#cc0000',
    gaugeNormal: '#0066cc',
    gaugeWarn: '#ff6600',
    gaugeAlarm: '#cc0000',
    valveOpen: '#009933',
    valveClosed: '#666666',
    alarmCritical: '#cc0000',
    alarmMajor: '#ff6600',
    alarmMinor: '#0066cc',
  },
};

export const blueTheme: Theme = {
  primary: '#1976D2',
  secondary: '#64B5F6',
  accent: '#FF9800',

  background: '#E3F2FD',
  surface: '#FFFFFF',
  headerBackground: '#1976D2',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#1A237E',
  textSecondary: '#424242',
  textTertiary: '#757575',
  textDisabled: '#BDBDBD',
  headerText: '#FFFFFF',

  border: '#BBDEFB',
  borderLight: '#E3F2FD',
  borderFocus: '#1976D2',

  button: {
    background: '#1976D2',
    hover: '#1565C0',
    active: '#0D47A1',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#E3F2FD',
    active: '#1976D2',
    text: '#1A237E',
    border: '#BBDEFB',
  },

  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#1976D2',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(25, 118, 210, 0.1)',
    medium: '0 4px 8px rgba(25, 118, 210, 0.15)',
    large: '0 8px 16px rgba(25, 118, 210, 0.2)',
    card: '0 2px 8px rgba(25, 118, 210, 0.08)',
    modal: '0 8px 32px rgba(25, 118, 210, 0.18)',
    dropdown: '0 4px 12px rgba(25, 118, 210, 0.1)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#1976D2',
    pipeStopped: '#9E9E9E',
    pipeBlocked: '#F44336',
    tankNormal: '#1976D2',
    tankHigh: '#FFC107',
    tankLow: '#F44336',
    gaugeNormal: '#1976D2',
    gaugeWarn: '#FFC107',
    gaugeAlarm: '#F44336',
    valveOpen: '#4CAF50',
    valveClosed: '#9E9E9E',
    alarmCritical: '#F44336',
    alarmMajor: '#FF9800',
    alarmMinor: '#FFC107',
  },
};

export const techLightBlueTheme: Theme = {
  primary: '#3B82F6',
  secondary: '#60A5FA',
  accent: '#F59E0B',

  background: '#F0F9FF',
  surface: '#FFFFFF',
  headerBackground: '#3B82F6',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',
  headerText: '#FFFFFF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#3B82F6',

  button: {
    background: '#3B82F6',
    hover: '#2563EB',
    active: '#1D4ED8',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#F0F9FF',
    active: '#3B82F6',
    text: '#1E293B',
    border: '#E2E8F0',
  },

  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(59, 130, 246, 0.1)',
    medium: '0 4px 8px rgba(59, 130, 246, 0.15)',
    large: '0 8px 16px rgba(59, 130, 246, 0.2)',
    card: '0 2px 8px rgba(59, 130, 246, 0.08)',
    modal: '0 8px 32px rgba(59, 130, 246, 0.18)',
    dropdown: '0 4px 12px rgba(59, 130, 246, 0.1)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#3B82F6',
    pipeStopped: '#94A3B8',
    pipeBlocked: '#EF4444',
    tankNormal: '#3B82F6',
    tankHigh: '#F59E0B',
    tankLow: '#EF4444',
    gaugeNormal: '#3B82F6',
    gaugeWarn: '#F59E0B',
    gaugeAlarm: '#EF4444',
    valveOpen: '#22C55E',
    valveClosed: '#94A3B8',
    alarmCritical: '#EF4444',
    alarmMajor: '#F59E0B',
    alarmMinor: '#F59E0B',
  },
};

export const blueLightTheme: Theme = {
  primary: '#4A90A4',
  secondary: '#7CB342',
  accent: '#FF7043',

  background: '#F0F2F5',
  surface: '#FFFFFF',
  headerBackground: '#4A90A4',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#2C3E50',
  textSecondary: '#5D6D7E',
  textTertiary: '#95A5A6',
  textDisabled: '#BDC3C7',
  headerText: '#FFFFFF',

  border: '#D5D8DC',
  borderLight: '#EBEDEF',
  borderFocus: '#4A90A4',

  button: {
    background: '#4A90A4',
    hover: '#3A7A8C',
    active: '#2C6574',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#EEF2F4',
    active: '#4A90A4',
    text: '#2C3E50',
    border: '#D5D8DC',
  },

  status: {
    success: '#7CB342',
    warning: '#FFB300',
    error: '#E53935',
    info: '#4A90A4',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(74, 144, 164, 0.1)',
    medium: '0 4px 8px rgba(74, 144, 164, 0.15)',
    large: '0 8px 16px rgba(74, 144, 164, 0.2)',
    card: '0 2px 8px rgba(74, 144, 164, 0.08)',
    modal: '0 8px 32px rgba(74, 144, 164, 0.18)',
    dropdown: '0 4px 12px rgba(74, 144, 164, 0.1)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#4A90A4',
    pipeStopped: '#95A5A6',
    pipeBlocked: '#E53935',
    tankNormal: '#4A90A4',
    tankHigh: '#FFB300',
    tankLow: '#E53935',
    gaugeNormal: '#4A90A4',
    gaugeWarn: '#FFB300',
    gaugeAlarm: '#E53935',
    valveOpen: '#7CB342',
    valveClosed: '#95A5A6',
    alarmCritical: '#E53935',
    alarmMajor: '#FF7043',
    alarmMinor: '#FFB300',
  },
};

export const enterpriseTheme: Theme = {
  primary: '#1677FF',
  secondary: '#52C41A',
  accent: '#FA8C16',

  background: '#F5F7FA',
  surface: '#FFFFFF',
  headerBackground: '#1677FF',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#1F1F1F',
  textSecondary: '#595959',
  textTertiary: '#8C8C8C',
  textDisabled: '#BFBFBF',
  headerText: '#FFFFFF',

  border: '#D9D9D9',
  borderLight: '#F0F0F0',
  borderFocus: '#1677FF',

  button: {
    background: '#1677FF',
    hover: '#4096FF',
    active: '#0958D9',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#E6F4FF',
    active: '#1677FF',
    text: '#1F1F1F',
    border: '#D9D9D9',
  },

  status: {
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4D4F',
    info: '#1677FF',
  },

  radius: { sm: '2px', md: '6px', lg: '10px', xl: '14px' },

  shadow: {
    small: '0 2px 4px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
    large: '0 8px 16px rgba(0, 0, 0, 0.15)',
    card: '0 2px 8px rgba(0, 0, 0, 0.06)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.16)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#1677FF',
    pipeStopped: '#8C8C8C',
    pipeBlocked: '#FF4D4F',
    tankNormal: '#1677FF',
    tankHigh: '#FAAD14',
    tankLow: '#FF4D4F',
    gaugeNormal: '#1677FF',
    gaugeWarn: '#FAAD14',
    gaugeAlarm: '#FF4D4F',
    valveOpen: '#52C41A',
    valveClosed: '#8C8C8C',
    alarmCritical: '#FF4D4F',
    alarmMajor: '#FA8C16',
    alarmMinor: '#FAAD14',
  },
};

export const orangeWarmTheme: Theme = {
  primary: '#FA8C16',
  secondary: '#13C2C2',
  accent: '#FADB14',

  background: '#FFF7E6',
  surface: '#FFFFFF',
  headerBackground: '#FA8C16',
  elevated: '#FFFFFF',
  backDrop: 'rgba(0, 0, 0, 0.3)',

  text: '#3D2E1A',
  textSecondary: '#6B5840',
  textTertiary: '#9C8A6E',
  textDisabled: '#C4B8A0',
  headerText: '#FFFFFF',

  border: '#FFD8A8',
  borderLight: '#FFF0DB',
  borderFocus: '#FA8C16',

  button: {
    background: '#FA8C16',
    hover: '#E07A0A',
    active: '#C56A08',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#FFFFFF',
    hover: '#FFF3E0',
    active: '#FA8C16',
    text: '#3D2E1A',
    border: '#FFD8A8',
  },

  status: {
    success: '#13C2C2',
    warning: '#FADB14',
    error: '#F5222D',
    info: '#FA8C16',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(250, 140, 22, 0.1)',
    medium: '0 4px 8px rgba(250, 140, 22, 0.15)',
    large: '0 8px 16px rgba(250, 140, 22, 0.2)',
    card: '0 2px 8px rgba(250, 140, 22, 0.06)',
    modal: '0 8px 32px rgba(250, 140, 22, 0.16)',
    dropdown: '0 4px 12px rgba(250, 140, 22, 0.1)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#FA8C16',
    pipeStopped: '#9C8A6E',
    pipeBlocked: '#F5222D',
    tankNormal: '#FA8C16',
    tankHigh: '#FADB14',
    tankLow: '#F5222D',
    gaugeNormal: '#FA8C16',
    gaugeWarn: '#FADB14',
    gaugeAlarm: '#F5222D',
    valveOpen: '#13C2C2',
    valveClosed: '#9C8A6E',
    alarmCritical: '#F5222D',
    alarmMajor: '#FA8C16',
    alarmMinor: '#FADB14',
  },
};

// ============================================================
// 暗色系列
// ============================================================

export const darkTheme: Theme = {
  primary: '#4A90D9',
  secondary: '#5A6B7C',
  accent: '#F0A030',

  background: '#14181E',
  surface: '#1C2128',
  headerBackground: '#1C2128',
  elevated: '#252A33',
  backDrop: 'rgba(0, 0, 0, 0.6)',

  text: '#E8EDF2',
  textSecondary: '#8B95A5',
  textTertiary: '#5A6575',
  textDisabled: '#3D4552',
  headerText: '#E8EDF2',

  border: '#2E3540',
  borderLight: '#242A33',
  borderFocus: '#4A90D9',

  button: {
    background: '#4A90D9',
    hover: '#3A7BC4',
    active: '#2C6AAE',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#1C2128',
    hover: '#252A33',
    active: '#4A90D9',
    text: '#E8EDF2',
    border: '#2E3540',
  },

  status: {
    success: '#45B86C',
    warning: '#F0A030',
    error: '#E05555',
    info: '#4A90D9',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(0, 0, 0, 0.4)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.5)',
    large: '0 8px 16px rgba(0, 0, 0, 0.6)',
    card: '0 2px 8px rgba(0, 0, 0, 0.3)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.6)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },

  transition: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.4s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#4A90D9',
    pipeStopped: '#5A6575',
    pipeBlocked: '#E05555',
    tankNormal: '#4A90D9',
    tankHigh: '#F0A030',
    tankLow: '#E05555',
    gaugeNormal: '#4A90D9',
    gaugeWarn: '#F0A030',
    gaugeAlarm: '#E05555',
    valveOpen: '#45B86C',
    valveClosed: '#5A6575',
    alarmCritical: '#E05555',
    alarmMajor: '#F0A030',
    alarmMinor: '#4A90D9',
  },
};

export const techDarkBlueTheme: Theme = {
  primary: '#0A2463',
  secondary: '#3E92CC',
  accent: '#FFD166',

  background: '#0A1929',
  surface: '#172A3A',
  headerBackground: '#172A3A',
  elevated: '#1E3A5F',
  backDrop: 'rgba(0, 0, 0, 0.6)',

  text: '#FFFFFF',
  textSecondary: '#B8C4D9',
  textTertiary: '#6B7B95',
  textDisabled: '#3D4F6B',
  headerText: '#FFFFFF',

  border: '#2C3E50',
  borderLight: '#34495E',
  borderFocus: '#3E92CC',

  button: {
    background: '#0A2463',
    hover: '#1E3A8A',
    active: '#312E81',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#172A3A',
    hover: '#2C3E50',
    active: '#0A2463',
    text: '#FFFFFF',
    border: '#2C3E50',
  },

  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(10, 36, 99, 0.3)',
    medium: '0 4px 8px rgba(10, 36, 99, 0.4)',
    large: '0 8px 16px rgba(10, 36, 99, 0.5)',
    card: '0 2px 8px rgba(10, 36, 99, 0.25)',
    modal: '0 8px 32px rgba(10, 36, 99, 0.5)',
    dropdown: '0 4px 12px rgba(10, 36, 99, 0.3)',
  },

  transition: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#3E92CC',
    pipeStopped: '#6B7B95',
    pipeBlocked: '#EF4444',
    tankNormal: '#3E92CC',
    tankHigh: '#F59E0B',
    tankLow: '#EF4444',
    gaugeNormal: '#3E92CC',
    gaugeWarn: '#F59E0B',
    gaugeAlarm: '#EF4444',
    valveOpen: '#22C55E',
    valveClosed: '#6B7B95',
    alarmCritical: '#EF4444',
    alarmMajor: '#FFD166',
    alarmMinor: '#F59E0B',
  },
};

export const blueDarkTheme: Theme = {
  primary: '#5BA0B5',
  secondary: '#6C9BC0',
  accent: '#F4A261',

  background: '#1A1D23',
  surface: '#21252B',
  headerBackground: '#21252B',
  elevated: '#2A2F38',
  backDrop: 'rgba(0, 0, 0, 0.6)',

  text: '#E0E6ED',
  textSecondary: '#9AA3B0',
  textTertiary: '#687382',
  textDisabled: '#424A55',
  headerText: '#E0E6ED',

  border: '#333842',
  borderLight: '#282C34',
  borderFocus: '#5BA0B5',

  button: {
    background: '#5BA0B5',
    hover: '#4A8C9F',
    active: '#3A7A8A',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#21252B',
    hover: '#2A2F38',
    active: '#5BA0B5',
    text: '#E0E6ED',
    border: '#333842',
  },

  status: {
    success: '#4CAF50',
    warning: '#F4A261',
    error: '#E06C75',
    info: '#5BA0B5',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(0, 0, 0, 0.35)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.45)',
    large: '0 8px 16px rgba(0, 0, 0, 0.55)',
    card: '0 2px 8px rgba(0, 0, 0, 0.3)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.55)',
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.35)',
  },

  transition: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.4s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#5BA0B5',
    pipeStopped: '#687382',
    pipeBlocked: '#E06C75',
    tankNormal: '#5BA0B5',
    tankHigh: '#F4A261',
    tankLow: '#E06C75',
    gaugeNormal: '#5BA0B5',
    gaugeWarn: '#F4A261',
    gaugeAlarm: '#E06C75',
    valveOpen: '#4CAF50',
    valveClosed: '#687382',
    alarmCritical: '#E06C75',
    alarmMajor: '#F4A261',
    alarmMinor: '#5BA0B5',
  },
};

export const greenTechTheme: Theme = {
  primary: '#00B96B',
  secondary: '#36CFC9',
  accent: '#FFC53D',

  background: '#0D1117',
  surface: '#161B22',
  headerBackground: '#161B22',
  elevated: '#1C2333',
  backDrop: 'rgba(0, 0, 0, 0.6)',

  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#576271',
  textDisabled: '#353C48',
  headerText: '#E6EDF3',

  border: '#2D3540',
  borderLight: '#21262D',
  borderFocus: '#00B96B',

  button: {
    background: '#00B96B',
    hover: '#009E5C',
    active: '#00854C',
    text: '#FFFFFF',
  },

  controlButton: {
    background: '#161B22',
    hover: '#1C2333',
    active: '#00B96B',
    text: '#E6EDF3',
    border: '#2D3540',
  },

  status: {
    success: '#00B96B',
    warning: '#FFC53D',
    error: '#F85149',
    info: '#58A6FF',
  },

  radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },

  shadow: {
    small: '0 2px 4px rgba(0, 185, 107, 0.2)',
    medium: '0 4px 8px rgba(0, 185, 107, 0.3)',
    large: '0 8px 16px rgba(0, 185, 107, 0.4)',
    card: '0 2px 8px rgba(0, 185, 107, 0.15)',
    modal: '0 8px 32px rgba(0, 185, 107, 0.35)',
    dropdown: '0 4px 12px rgba(0, 185, 107, 0.2)',
  },

  transition: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.4s ease',
    theme: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
  },

  industrial: {
    pipeFlowing: '#00B96B',
    pipeStopped: '#576271',
    pipeBlocked: '#F85149',
    tankNormal: '#00B96B',
    tankHigh: '#FFC53D',
    tankLow: '#F85149',
    gaugeNormal: '#00B96B',
    gaugeWarn: '#FFC53D',
    gaugeAlarm: '#F85149',
    valveOpen: '#36CFC9',
    valveClosed: '#576271',
    alarmCritical: '#F85149',
    alarmMajor: '#FFC53D',
    alarmMinor: '#00B96B',
  },
};

// ============================================================
// 主题映射
// ============================================================

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
  blue: blueTheme,
  'tech-dark-blue': techDarkBlueTheme,
  'tech-light-blue': techLightBlueTheme,
  'blue-light': blueLightTheme,
  'blue-dark': blueDarkTheme,
  'green-tech': greenTechTheme,
  'orange-warm': orangeWarmTheme,
  enterprise: enterpriseTheme,
};

export type ThemeName = keyof typeof themes;

export const defaultThemeName: ThemeName = 'dark';

export function getTheme(themeName: string): Theme {
  return themes[themeName] || lightTheme;
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}

export function getLightThemes(): ThemeName[] {
  return ['light', 'high-contrast', 'blue', 'tech-light-blue', 'blue-light', 'enterprise', 'orange-warm'];
}

export function getDarkThemes(): ThemeName[] {
  return ['dark', 'tech-dark-blue', 'blue-dark', 'green-tech'];
}