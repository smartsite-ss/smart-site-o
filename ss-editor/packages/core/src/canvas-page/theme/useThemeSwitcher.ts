// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed } from 'vue';
import { useTheme } from './useTheme';
import type { ThemeName } from './config/themes';
import { i18n } from '../../locales';

const t = (key: string) => i18n.global.t(key);

interface ThemeMeta {
  name: ThemeName;
  label: string;
  category: 'light' | 'dark';
  description: string;
}

const themeMetaMap: Record<string, ThemeMeta> = {
  light: { name: 'light', label: t('globalTools.lightTheme'), category: 'light', description: t('globalTools.themeDescriptions.lightThemeDesc') },
  dark: { name: 'dark', label: t('globalTools.darkTheme'), category: 'dark', description: t('globalTools.themeDescriptions.darkThemeDesc') },
  'high-contrast': { name: 'high-contrast', label: t('globalTools.highContrast'), category: 'light', description: t('globalTools.themeDescriptions.highContrastDesc') },
  blue: { name: 'blue', label: t('globalTools.blue'), category: 'light', description: t('globalTools.themeDescriptions.blueDesc') },
  'tech-dark-blue': { name: 'tech-dark-blue', label: t('globalTools.techDarkBlue'), category: 'dark', description: t('globalTools.themeDescriptions.techDarkBlueDesc') },
  'tech-light-blue': { name: 'tech-light-blue', label: t('globalTools.techLightBlue'), category: 'light', description: t('globalTools.themeDescriptions.techLightBlueDesc') },
  'blue-light': { name: 'blue-light', label: t('globalTools.blueLight'), category: 'light', description: t('globalTools.themeDescriptions.blueLightDesc') },
  'blue-dark': { name: 'blue-dark', label: t('globalTools.blueDark'), category: 'dark', description: t('globalTools.themeDescriptions.blueDarkDesc') },
  'green-tech': { name: 'green-tech', label: t('globalTools.greenTech'), category: 'dark', description: t('globalTools.themeDescriptions.greenTechDesc') },
  'orange-warm': { name: 'orange-warm', label: t('globalTools.orangeWarm'), category: 'light', description: t('globalTools.themeDescriptions.orangeWarmDesc') },
  enterprise: { name: 'enterprise', label: t('globalTools.enterprise'), category: 'light', description: t('globalTools.themeDescriptions.enterpriseDesc') },
};

export function useThemeSwitcher() {
  const { currentThemeName, setTheme, availableThemes } = useTheme();
  const showSwitcher = ref(false);

  const themes = computed(() => {
    return availableThemes.value
      .map((name) => themeMetaMap[name] || { name, label: name, category: 'light' as const, description: '' })
      .sort((a, b) => {
        if (a.category !== b.category) return a.category === 'light' ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
  });

  const lightThemes = computed(() => themes.value.filter((t) => t.category === 'light'));
  const darkThemes = computed(() => themes.value.filter((t) => t.category === 'dark'));

  const previewTheme = (name: ThemeName) => {
    setTheme(name);
  };

  const toggleSwitcher = () => {
    showSwitcher.value = !showSwitcher.value;
  };

  const currentMeta = computed(() => themeMetaMap[currentThemeName.value] || { label: currentThemeName.value });

  return {
    currentThemeName,
    currentMeta,
    themes,
    lightThemes,
    darkThemes,
    showSwitcher,
    setTheme,
    previewTheme,
    toggleSwitcher,
  };
}