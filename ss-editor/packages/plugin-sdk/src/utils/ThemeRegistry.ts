// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Theme } from './theme-config';
import { themes as builtinThemes } from './theme-config';

export interface ThemeRegistration {
  name: string;
  theme: Theme;
  overrides?: boolean;
}

export class ThemeRegistry {
  private registry = new Map<string, Theme>();

  constructor() {
    for (const [name, theme] of Object.entries(builtinThemes)) {
      this.registry.set(name, theme);
    }
  }

  register(registration: ThemeRegistration): void {
    if (this.registry.has(registration.name) && !registration.overrides) {
      console.warn(`Theme "${registration.name}" already exists. Use overrides: true to replace.`);
      return;
    }
    this.registry.set(registration.name, registration.theme);
  }

  unregister(name: string): void {
    if (name in builtinThemes) {
      console.warn(`Cannot unregister built-in theme "${name}".`);
      return;
    }
    this.registry.delete(name);
  }

  get(name: string): Theme | undefined {
    return this.registry.get(name);
  }

  getAll(): Map<string, Theme> {
    return new Map(this.registry);
  }

  getNames(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const themeRegistry = new ThemeRegistry();