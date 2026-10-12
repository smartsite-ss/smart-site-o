// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getThemeColor } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { buttonPropertySchema } from './buttonPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultButtonProps = {
  ...buildDefaultsFromSchema(buttonPropertySchema),
  backgroundColor: getThemeColor('primary') + 'FF',
  fontColor: '#FFFFFFFF',
  borderColor: getThemeColor('primary') + 'FF',
};


@Graphic({
  type: 'button',
  name: i18n.global.t('button.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('button.description'),
  defaultProps: defaultButtonProps,
  defaultWidth: 100,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: false },
})
export class ButtonPlugin extends BasePlugin<InferSchemaProps<typeof buttonPropertySchema>> {
  constructor(x = 0, y = 0, w = 100, h = 40) {
    super('button', x, y, w, h);
    this.setDefaultProps({ ...defaultButtonProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({
      backgroundColor: getThemeColor('primary') + 'FF',
      fontColor: '#FFFFFFFF',
      borderColor: getThemeColor('primary') + 'FF',
    } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (props.shadowColor && props.shadowColor !== '#00000000') {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowBlur = Number(props.shadowBlur);
      ctx.shadowOffsetX = Number(props.shadowOffsetX);
      ctx.shadowOffsetY = Number(props.shadowOffsetY);
    }

    ctx.fillStyle = props.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
    ctx.fill();

    if (Number(props.borderWidth) > 0 && props.borderColor !== '#00000000') {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
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

    const fontStr = `${props.fontWeight === 'bold' ? 'bold' : 'normal'} ${props.fontSize}px Arial`;
    let textX = width / 2;
    if (props.textAlign === 'left') {
      textX = 10;
    } else if (props.textAlign === 'right') {
      textX = width - 10;
    }
    ctx.fillStyle = props.fontColor;
    ctx.font = fontStr;
    ctx.textAlign = props.textAlign as CanvasTextAlign;
    ctx.textBaseline = 'middle';
    ctx.fillText(props.text, textX, height / 2);
  }
}