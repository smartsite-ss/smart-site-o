// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { naiveButtonPropertySchema } from './naiveButtonPropertySchema';
import { i18n, getThemeColor, registerLocaleModules} from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultNaiveButtonProps = buildDefaultsFromSchema(naiveButtonPropertySchema);


const TYPE_THEME_KEYS: Record<string, string> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'primary',
};

function getNaiveButtonBgColor(type: string, disabled: boolean): string {
  const themeKey = TYPE_THEME_KEYS[type] || 'primary';
  const color = getThemeColor(themeKey as any);
  return disabled ? color + '26' : color + 'FF';
}

function getNaiveButtonTextColor(_type: string, disabled: boolean): string {
  return disabled ? '#FFFFFFAA' : '#FFFFFFFF';
}

@Graphic({
  type: 'naive-button',
  name: i18n.global.t('naiveButton.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('naiveButton.description'),
  defaultProps: defaultNaiveButtonProps,
  defaultWidth: 100,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: false },
})
export class NaiveButtonPlugin extends BasePlugin<InferSchemaProps<typeof naiveButtonPropertySchema>> {
  componentName = 'NaiveButtonGraphic';
  getComponentProps = () => this.getNaiveButtonProps();

  constructor(x = 0, y = 0, w = 100, h = 40) {
    super('naive-button', x, y, w, h);
    this.setDefaultProps({ ...defaultNaiveButtonProps });
  }

  getNaiveButtonProps(): InferSchemaProps<typeof naiveButtonPropertySchema> {
    return { ...this.pluginProps };
  }

  setNaiveButtonProps(partial: Partial<InferSchemaProps<typeof naiveButtonPropertySchema>>): void {
    this.setPluginProps(partial);
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({} as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    const bgColor = getNaiveButtonBgColor(props.type, props.disabled);

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    const borderRadius = props.round || props.circle ? height / 2 : 4;
    ctx.roundRect(0, 0, width, height, borderRadius);
    ctx.fill();

    ctx.fillStyle = getNaiveButtonTextColor(props.type, props.disabled);
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(props.text, width / 2, height / 2);
  }
}