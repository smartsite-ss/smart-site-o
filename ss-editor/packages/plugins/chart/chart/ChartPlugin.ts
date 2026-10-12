// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getThemeColor } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { chartPropertySchema } from './chartPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultChartProps = {
  ...buildDefaultsFromSchema(chartPropertySchema),
  titleColor: getThemeColor('text') + 'FF',
};


@Graphic({
  type: 'chart',
  name: i18n.global.t('chart.label'),
  category: 'chart',
  version: pkg.version,
  primaryCategory: 'chart',
  description: i18n.global.t('chart.description'),
  defaultProps: defaultChartProps,
  defaultWidth: 400,
  defaultHeight: 300,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class ChartPlugin extends BasePlugin<InferSchemaProps<typeof chartPropertySchema>> {
  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('chart', x, y, w, h);
    this.setDefaultProps({ ...defaultChartProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({ titleColor: getThemeColor('text') + 'FF' } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (props.shadowColor !== '#00000000') {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowBlur = Number(props.shadowBlur);
      ctx.shadowOffsetX = Number(props.shadowOffsetX);
      ctx.shadowOffsetY = Number(props.shadowOffsetY);
    }

    ctx.fillStyle = props.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
    ctx.fill();

    if (Number(props.borderWidth) > 0) {
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

    ctx.fillStyle = props.titleColor;
    ctx.font = `${props.titleFontWeight} ${Number(props.titleFontSize)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(props.title, width / 2, 10);

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - Number(props.titleFontSize);

    ctx.strokeStyle = props.axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding + Number(props.titleFontSize));
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = props.gridColor;
    ctx.lineWidth = 0.5;

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yPos = padding + Number(props.titleFontSize) + (chartHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding, yPos);
      ctx.lineTo(width - padding, yPos);
      ctx.stroke();
    }

    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const xPos = padding + (chartWidth / xSteps) * i;
      ctx.beginPath();
      ctx.moveTo(xPos, padding + Number(props.titleFontSize));
      ctx.lineTo(xPos, height - padding);
      ctx.stroke();
    }

    const data = [50, 30, 70, 40, 60, 80];
    const dataPoints = data.length;
    const stepX = chartWidth / (dataPoints - 1);

    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding - (data[0] / 100) * chartHeight);

    for (let i = 1; i < dataPoints; i++) {
      const x = padding + stepX * i;
      const y = height - padding - (data[i] / 100) * chartHeight;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#2196F3';
    data.forEach((value, index) => {
      const x = padding + stepX * index;
      const y = height - padding - (value / 100) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}