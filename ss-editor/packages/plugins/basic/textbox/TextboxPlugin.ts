// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { textboxPropertySchema } from './textboxPropertySchema';
import { i18n, getThemeColor, registerLocaleModules} from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultTextboxProps = {
  ...buildDefaultsFromSchema(textboxPropertySchema),
  textColor: getThemeColor('text') + 'FF',
  backgroundColor: getThemeColor('surface') + 'FF',
  borderColor: getThemeColor('border') + 'FF',
};


@Graphic({
  type: 'textbox',
  name: i18n.global.t('textbox.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('textbox.description'),
  defaultProps: defaultTextboxProps,
  defaultWidth: 120,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class TextboxPlugin extends BasePlugin<InferSchemaProps<typeof textboxPropertySchema>> {
  constructor(x = 0, y = 0, w = 120, h = 40) {
    super('textbox', x, y, w, h);
    this.setDefaultProps({ ...defaultTextboxProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({
      textColor: getThemeColor('text') + 'FF',
      backgroundColor: getThemeColor('surface') + 'FF',
      borderColor: getThemeColor('border') + 'FF',
    } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    ctx.fillStyle = props.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
    ctx.fill();

    if (Number(props.borderWidth) > 0 && props.borderStyle !== 'none') {
      ctx.strokeStyle = props.borderColor;
      ctx.lineWidth = Number(props.borderWidth);
      if (props.borderStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (props.borderStyle === 'dotted') {
        ctx.setLineDash([2, 2]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = props.textColor;
    ctx.font = `${props.fontWeight} ${props.fontStyle} ${Number(props.fontSize)}px Arial`;
    ctx.textAlign = props.textAlign as CanvasTextAlign;
    ctx.textBaseline = 'top';

    const lines = props.text.split('\n');
    const padding = Number(props.padding);
    const lineHeight = Number(props.fontSize) * 1.5;

    lines.forEach((line, index) => {
      ctx.fillText(line, padding, padding + index * lineHeight);
    });
  }
}