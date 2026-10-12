// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { AnimationTimer } from './AnimationTimer';
export { SchemaValidator } from './SchemaValidator';
export type { ValidationError, ValidationResult, SchemaValidationError } from './SchemaValidator';
export { SchemaMigrationEngine } from './SchemaMigrationEngine';
export type { MigrationSource, MigrationResult } from './SchemaMigrationEngine';
export { ThemeProvider } from './ThemeProvider';
export type { IThemeEngine } from './ThemeProvider';
export { ThemeSwitcher } from './ThemeSwitcher';
export type { ThemeSwitcherOptions } from './ThemeSwitcher';
export { generateThemeCSS, generateAllThemeCSS } from './css-themes';

// Theme engine (unified from @scada-editor/core)
export { ThemeManager, themeManager } from './ThemeManager';
export { ThemeRegistry, themeRegistry } from './ThemeRegistry';
export type { ThemeRegistration } from './ThemeRegistry';
export * from './theme-config';

export { I18nProvider } from './I18nProvider';
export type { SupportedLocale, I18nResource } from './I18nProvider';
export { LanguageSwitcher } from './LanguageSwitcher';
export type { LanguageSwitcherOptions } from './LanguageSwitcher';
export { ProjectMigration } from './ProjectMigration';
export type { ProjectData, ProjectPageData, ProjectGraphicData, MigrationReport } from './ProjectMigration';
export { PluginCodeGenerator } from './PluginCodeGenerator';
export type { GenerateOptions, GenerateResult } from './PluginCodeGenerator';
export { ScaffoldGenerator } from './ScaffoldGenerator';
export type { ScaffoldConfig } from './ScaffoldGenerator';
export { PluginManifestValidator } from './PluginManifestValidator';
export type { ManifestValidationResult } from './PluginManifestValidator';