// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getThemeColor } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { labelPropertySchema } from './labelPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultLabelProps = {
  ...buildDefaultsFromSchema(labelPropertySchema),
  textColor: getThemeColor('text') + 'FF',
};


@Graphic({
  type: 'label',
  name: i18n.global.t('label.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('label.description'),
  defaultProps: defaultLabelProps,
  defaultWidth: 100,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class LabelPlugin extends BasePlugin<InferSchemaProps<typeof labelPropertySchema>> {
  constructor(x = 0, y = 0, w = 100, h = 40) {
    super('label', x, y, w, h);
    this.setDefaultProps({ ...defaultLabelProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({ textColor: getThemeColor('text') + 'FF' } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (props.backgroundColor !== '#00000000') {
      ctx.fillStyle = props.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.fill();
    }

    if (Number(props.borderWidth) > 0 && props.borderColor !== '#00000000') {
      ctx.strokeStyle = props.borderColor;
      ctx.lineWidth = Number(props.borderWidth);
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.stroke();
    }

    if (props.textShadowColor && props.textShadowColor !== '#00000000') {
      ctx.shadowColor = props.textShadowColor;
      ctx.shadowBlur = Number(props.textShadowBlur);
      ctx.shadowOffsetX = Number(props.textShadowOffsetX);
      ctx.shadowOffsetY = Number(props.textShadowOffsetY);
    }

    const displayText = this.formatDisplayText(props.text, Number(props.decimalPlaces ?? 2));
    // 诊断：验证 Label 渲染时读取到的数据值
    if ((window as any).__labelRenderLog === undefined) (window as any).__labelRenderLog = {};
    const cnt = ((window as any).__labelRenderLog[this.id] || 0) + 1;
    (window as any).__labelRenderLog[this.id] = cnt;
    if (cnt <= 5 || cnt % 60 === 0) {
      console.log(`[Label.render] id=${this.id.slice(0,8)} text="${displayText.slice(0,30)}" cnt=${cnt} configText="${String(props.text || '').slice(0,30)}"`);
    }

    if (props.wordWrap) {
      this._drawMultilineText(ctx, displayText, props, width, height);
    } else {
      this._drawSinglelineText(ctx, displayText, props, width, height);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /** 按小数位数格式化值：若为有效数字则截断，否则原样返回 */
  private formatDisplayText(raw: string | number, decimalPlaces: number): string {
    const text = String(raw);
    const numValue = Number(text);
    if (text !== '' && !isNaN(numValue) && isFinite(numValue)) {
      return numValue.toFixed(decimalPlaces);
    }
    return text;
  }

  /** 单行文本 + 单位渲染 */
  private _drawSinglelineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    props: InferSchemaProps<typeof labelPropertySchema>,
    width: number,
    height: number,
  ): void {
    const align = String(props.textAlign);
    const padding = 10;

    // 测量主文本宽度
    const textFontStr = `${props.fontStyle} ${props.fontWeight} ${Number(props.fontSize)}px Arial`;
    ctx.font = textFontStr;
    const textWidth = ctx.measureText(String(text)).width;

    // 测量单位文本宽度
    const unitText = String(props.unit ?? '');
    let unitWidth = 0;
    let unitFontStr = '';
    if (unitText) {
      unitFontStr = `${props.fontStyle} ${props.fontWeight} ${Number(props.unitFontSize)}px Arial`;
      ctx.font = unitFontStr;
      unitWidth = ctx.measureText(unitText).width;
    }

    const unitGap = Number(props.unitGap ?? 4);
    const totalWidth = textWidth + (unitText ? unitGap + unitWidth : 0);

    // 根据对齐计算起始 x
    let startX: number;
    if (align === 'center') {
      startX = Math.max(0, (width - totalWidth) / 2);
    } else if (align === 'right') {
      startX = Math.max(0, width - padding - totalWidth);
    } else {
      startX = padding;
    }

    const textY = height / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = props.verticalAlignment as CanvasTextBaseline;

    // 绘制主文本
    ctx.font = textFontStr;
    ctx.fillStyle = String(props.textColor);
    ctx.fillText(String(text), startX, textY);

    // 绘制单位
    if (unitText) {
      ctx.font = unitFontStr;
      ctx.fillStyle = String(props.unitFontColor);
      ctx.fillText(unitText, startX + textWidth + unitGap, textY);
    }
  }

  private _drawMultilineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    props: InferSchemaProps<typeof labelPropertySchema>,
    width: number,
    _height: number,
  ): void {
    const fontStr = `${props.fontStyle} ${props.fontWeight} ${Number(props.fontSize)}px Arial`;
    const padding = 10;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineHeight = Number(props.fontSize) * Number(props.lineHeight);
    const maxWidth = width - padding * 2;

    const unitText = String(props.unit ?? '');
    const unitGap = Number(props.unitGap ?? 4);

    // 预留最后一行单位空间
    let unitReservedWidth = 0;
    if (unitText) {
      const unitFontStr = `${props.fontStyle} ${props.fontWeight} ${Number(props.unitFontSize)}px Arial`;
      ctx.font = unitFontStr;
      unitReservedWidth = ctx.measureText(unitText).width + unitGap;
    }

    const words = text.split('');
    const lines: string[] = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      ctx.font = fontStr;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        lines.push(line);
        line = words[i];
        if (Number(props.maxLines) > 0 && lines.length >= Number(props.maxLines)) break;
      } else {
        line = testLine;
      }
    }
    const isLastLine = Number(props.maxLines) <= 0 || lines.length < Number(props.maxLines);
    if (line.length > 0 && isLastLine) {
      // 最后一行：截断以容纳单位
      if (unitText && unitReservedWidth > 0) {
        ctx.font = fontStr;
        while (ctx.measureText(line).width + unitReservedWidth > maxWidth && line.length > 0) {
          line = line.slice(0, -1);
        }
      }
      lines.push(line);
    }

    // 绘制非最后一行
    ctx.font = fontStr;
    ctx.fillStyle = String(props.textColor);
    for (let i = 0; i < lines.length - 1; i++) {
      ctx.fillText(lines[i], padding, padding + i * lineHeight);
    }

    // 最后一行：主文本 + 单位（独立字体/颜色）
    const lastIdx = lines.length - 1;
    if (lastIdx >= 0) {
      const lastLine = lines[lastIdx];
      const lastY = padding + lastIdx * lineHeight;
      ctx.font = fontStr;
      ctx.fillStyle = String(props.textColor);
      ctx.fillText(lastLine, padding, lastY);

      if (unitText) {
        const mainWidth = ctx.measureText(lastLine).width;
        const unitFontStr = `${props.fontStyle} ${props.fontWeight} ${Number(props.unitFontSize)}px Arial`;
        ctx.font = unitFontStr;
        ctx.fillStyle = String(props.unitFontColor);
        ctx.fillText(unitText, padding + mainWidth + unitGap, lastY);
      }
    }
  }
}