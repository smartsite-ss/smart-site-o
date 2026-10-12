// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SvgDomPlugin } from '../base/SvgDomPlugin';

type SvgPluginConstructor<TProps extends Record<string, any>> = new (
  type: string, x?: number, y?: number, w?: number, h?: number
) => SvgDomPlugin<TProps>;

export class SvgDomTestHarness<TProps extends Record<string, any>> {
  private _plugin: SvgDomPlugin<TProps>;
  private _container: HTMLElement;

  constructor(
    PluginClass: SvgPluginConstructor<TProps>,
    props?: Partial<TProps>,
  ) {
    this._container = document.createElement('div');
    this._plugin = new PluginClass('__test__', 0, 0, 200, 150);
    if (props) {
      (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(props);
    }
    this._plugin.mount(this._container);
  }

  querySelector(selector: string): Element | null {
    return this._container.querySelector(selector);
  }

  assertAttribute(selector: string, attr: string, expected: string): void {
    const el = this.querySelector(selector);
    if (!el) {
      throw new Error(`Element "${selector}" not found`);
    }
    const value = el.getAttribute(attr);
    if (value !== expected) {
      throw new Error(`Attribute "${attr}" on "${selector}" expected "${expected}" but got "${value}"`);
    }
  }

  update(props: Partial<TProps>): void {
    (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(props);
    this._plugin.update(props);
  }

  getHtml(): string {
    return this._container.innerHTML;
  }

  get plugin(): SvgDomPlugin<TProps> {
    return this._plugin;
  }

  destroy(): void {
    this._plugin.unmount();
  }
}