// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 颜色设计令牌

export const colors = {
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  secondary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  accent: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  background: {
    light: '#F5F5F5',
    surface: '#FFFFFF',
    dark: '#14181E',
    darkSurface: '#1C2128',
  },

  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#E8EDF2',
    lightSecondary: '#8B95A5',
  },

  border: {
    light: '#E0E0E0',
    medium: '#CCCCCC',
    dark: '#2E3540',
    darkLight: '#242A33',
  },

  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
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

export const colorUtils = {
  getThemeColor: (theme: 'light' | 'dark' | 'blue', color: keyof typeof colors, _shade?: string | number) => {
    if (theme === 'dark') {
      switch (color) {
        case 'background':
          return colors.background.dark;
        case 'text':
          return colors.text.light;
        case 'border':
          return colors.border.dark;
        default:
          return (colors as any)[color]?.[500] || colors.primary[500];
      }
    } else if (theme === 'blue') {
      switch (color) {
        case 'background':
          return colors.primary[50];
        case 'text':
          return colors.primary[900];
        case 'border':
          return colors.primary[100];
        default:
          return (colors as any)[color]?.[600] || colors.primary[600];
      }
    } else {
      switch (color) {
        case 'background':
          return colors.background.light;
        case 'text':
          return colors.text.primary;
        case 'border':
          return colors.border.medium;
        default:
          return (colors as any)[color]?.[500] || colors.primary[500];
      }
    }
  },
};