// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component } from 'vue';

class GraphicComponentRegistryImpl {
  private components: Map<string, Component> = new Map();

  register(name: string, component: Component): void {
    if (this.components.has(name)) {
      console.debug(`[GraphicComponentRegistry] Component "${name}" already registered, overwriting.`);
    }
    this.components.set(name, component);
  }

  get(name: string): Component | undefined {
    return this.components.get(name);
  }

  has(name: string): boolean {
    return this.components.has(name);
  }

  getAll(): Record<string, Component> {
    const result: Record<string, Component> = {};
    this.components.forEach((comp, name) => {
      result[name] = comp;
    });
    return result;
  }
}

export const GraphicComponentRegistry = new GraphicComponentRegistryImpl();