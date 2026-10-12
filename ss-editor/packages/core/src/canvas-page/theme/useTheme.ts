// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { themeManager, type Theme, type ThemeName } from './ThemeManager';
import { getThemeColors, getIndustrialColors, type ThemeColors, type IndustrialColors } from './themeColors';

export function useTheme() {
  const theme = ref<Theme>(themeManager.getCurrentTheme());
  const colors = ref<ThemeColors>(getThemeColors());
  const industrialColors = ref<IndustrialColors>(getIndustrialColors());
  const currentThemeName = ref<string>(themeManager.getCurrentThemeName());

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = themeManager.subscribe((newTheme) => {
      theme.value = newTheme;
      colors.value = getThemeColors();
      industrialColors.value = getIndustrialColors();
      currentThemeName.value = themeManager.getCurrentThemeName();
    });
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  const setTheme = (name: ThemeName) => {
    themeManager.setTheme(name);
  };

  const switchTheme = (name: ThemeName) => {
    themeManager.setTheme(name);
  };

  const availableThemes = computed(() => themeManager.getAvailableThemeNames());

  const themeStyles = computed(() => {
    const currentTheme = theme.value;
    return {
      '--primary': currentTheme.primary,
      '--secondary': currentTheme.secondary,
      '--accent': currentTheme.accent,
      '--background': currentTheme.background,
      '--surface': currentTheme.surface,
      '--header-background': currentTheme.headerBackground,
      '--elevated': currentTheme.elevated,
      '--backdrop': currentTheme.backDrop,
      '--text': currentTheme.text,
      '--text-secondary': currentTheme.textSecondary,
      '--text-tertiary': currentTheme.textTertiary,
      '--text-disabled': currentTheme.textDisabled,
      '--header-text': currentTheme.headerText,
      '--border': currentTheme.border,
      '--border-light': currentTheme.borderLight,
      '--border-focus': currentTheme.borderFocus,
      '--button-background': currentTheme.button.background,
      '--button-hover': currentTheme.button.hover,
      '--button-active': currentTheme.button.active,
      '--button-text': currentTheme.button.text,
      '--control-button-background': currentTheme.controlButton.background,
      '--control-button-hover': currentTheme.controlButton.hover,
      '--control-button-active': currentTheme.controlButton.active,
      '--control-button-text': currentTheme.controlButton.text,
      '--control-button-border': currentTheme.controlButton.border,
      '--status-success': currentTheme.status.success,
      '--status-warning': currentTheme.status.warning,
      '--status-error': currentTheme.status.error,
      '--status-info': currentTheme.status.info,
      '--radius-sm': currentTheme.radius.sm,
      '--radius-md': currentTheme.radius.md,
      '--radius-lg': currentTheme.radius.lg,
      '--radius-xl': currentTheme.radius.xl,
      '--shadow-small': currentTheme.shadow.small,
      '--shadow-medium': currentTheme.shadow.medium,
      '--shadow-large': currentTheme.shadow.large,
      '--shadow-card': currentTheme.shadow.card,
      '--shadow-modal': currentTheme.shadow.modal,
      '--shadow-dropdown': currentTheme.shadow.dropdown,
      '--transition-fast': currentTheme.transition.fast,
      '--transition-normal': currentTheme.transition.normal,
      '--transition-slow': currentTheme.transition.slow,
      '--transition-theme': currentTheme.transition.theme,
    };
  });

  const isDark = computed(() => {
    const name = currentThemeName.value;
    return name === 'dark' || name === 'tech-dark-blue' || name === 'blue-dark' || name === 'green-tech';
  });

  return {
    theme,
    colors,
    industrialColors,
    currentThemeName,
    setTheme,
    switchTheme,
    availableThemes,
    themeStyles,
    isDark,
  };
}