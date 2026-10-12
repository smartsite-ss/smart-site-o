// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/// <reference types="vite/client" />

declare module 'virtual:bundled-plugins' {
  export const BUNDLED_CATEGORIES: string[];
  export const DIRECTORY_CATEGORIES: string[];
  export const bundledModules: Record<string, { default?: any }>;
}

declare module 'virtual:bundled-plugin-modules' {
  export const bundledPluginModules: Record<string, any>;
}

declare module 'virtual:plugin-icons' {
  export const bundledPngModules: Record<string, { default: string }>;
  export const bundledJpgModules: Record<string, { default: string }>;
  export const bundledIndexModules: Record<string, any>;
}