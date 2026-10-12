// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { CssDomPlugin } from '../base/CssDomPlugin';

type CssPluginConstructor<TProps extends Record<string, any>> = new (
  type: string, x?: number, y?: number, w?: number, h?: number
) => CssDomPlugin<TProps>;

export class CssDomTestHarness<TProps extends Record<string, any>> {
  private _plugin: CssDomPlugin<TProps>;
  private _container: HTMLElement;

  constructor(
    PluginClass: CssPluginConstructor<TProps>,
    props?: Partial<TProps>,
  ) {
    this._container = document.createElement('div');
    document.body.appendChild(this._container);
    this._plugin = new PluginClass('__test__', 0, 0, 100, 100);
    if (props) {
      (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(props);
    }
    this._plugin.mount(this._container);
  }

  getComputedStyle(selector: string): CSSStyleDeclaration {
    const el = this._container.querySelector(selector) as HTMLElement;
    if (!el) throw new Error(`Element "${selector}" not found`);
    return window.getComputedStyle(el);
  }

  assertCssVariable(selector: string, variable: string, expected: string): void {
    const el = this._container.querySelector(selector) as HTMLElement;
    if (!el) throw new Error(`Element "${selector}" not found`);
    const value = window.getComputedStyle(el).getPropertyValue(variable).trim();
    if (value !== expected) {
      throw new Error(`CSS variable "${variable}" on "${selector}" expected "${expected}" but got "${value}"`);
    }
  }

  querySelector(selector: string): Element | null {
    return this._container.querySelector(selector);
  }

  update(props: Partial<TProps>): void {
    (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(props);
    this._plugin.update(props);
  }

  get plugin(): CssDomPlugin<TProps> {
    return this._plugin;
  }

  destroy(): void {
    this._plugin.unmount();
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}