// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getThemeColor } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { multiChartPropertySchema } from './multiChartPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultMultiChartProps = {
  ...buildDefaultsFromSchema(multiChartPropertySchema),
  titleColor: getThemeColor('text') + 'FF',
};

// Default data for demo purposes
const DEFAULT_BAR_DATA = [
  { label: 'A', value: 65 },
  { label: 'B', value: 45 },
  { label: 'C', value: 80 },
  { label: 'D', value: 55 },
  { label: 'E', value: 70 },
];

const DEFAULT_PIE_DATA = [
  { label: 'A', value: 30 },
  { label: 'B', value: 25 },
  { label: 'C', value: 20 },
  { label: 'D', value: 15 },
  { label: 'E', value: 10 },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

@Graphic({
  type: 'multi-chart',
  name: i18n.global.t('multiChart.label'),
  category: 'chart',
  version: pkg.version,
  primaryCategory: 'chart',
  description: i18n.global.t('multiChart.description'),
  defaultProps: defaultMultiChartProps,
  defaultWidth: 400,
  defaultHeight: 300,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class MultiChartPlugin extends BasePlugin<InferSchemaProps<typeof multiChartPropertySchema>> {
  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('multi-chart', x, y, w, h);
    this.setDefaultProps({ ...defaultMultiChartProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({ titleColor: getThemeColor('text') + 'FF' } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx as CanvasRenderingContext2D;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    // Shadow
    if (props.shadowColor !== '#00000000' && Number(props.shadowBlur) > 0) {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowOffsetX = Number(props.shadowOffsetX);
      ctx.shadowOffsetY = Number(props.shadowOffsetY);
      ctx.shadowBlur = Number(props.shadowBlur);
    }

    // Background
    if (props.backgroundColor !== '#00000000') {
      ctx.fillStyle = props.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.fill();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    if (Number(props.borderWidth) > 0) {
      ctx.strokeStyle = props.borderColor;
      ctx.lineWidth = Number(props.borderWidth);
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.stroke();
    }

    // Title
    const titleH = props.title ? Number(props.titleFontSize) + 10 : 0;
    if (props.title) {
      ctx.fillStyle = props.titleColor;
      ctx.font = `bold ${Number(props.titleFontSize)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(props.title, width / 2, 6);
    }

    const chartType = props.chartType || 'bar';
    switch (chartType) {
      case 'bar': this._drawBarChart(ctx, width, height, titleH, props); break;
      case 'pie': this._drawPieChart(ctx, width, height, titleH, props); break;
      case 'heatmap': this._drawHeatmap(ctx, width, height, titleH, props); break;
    }
  }

  private _drawBarChart(ctx: CanvasRenderingContext2D, w: number, h: number, titleH: number, props: InferSchemaProps<typeof multiChartPropertySchema>): void {
    const data = DEFAULT_BAR_DATA;
    const padding = { top: titleH + 10, right: 20, bottom: 40, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    if (chartW <= 0 || chartH <= 0) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barCount = data.length;
    const gap = Number(props.barGap);
    const barW = chartW / (barCount * (1 + gap));

    // Y axis
    ctx.strokeStyle = '#ADB5BD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = '#E9ECEF';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#6C757D';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH * i) / gridLines;
      const val = maxVal - (maxVal * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.fillText(Math.round(val).toString(), padding.left - 6, y);
    }

    // Bars
    for (let i = 0; i < barCount; i++) {
      const barH = (data[i].value / maxVal) * chartH;
      const x = padding.left + i * (barW + barW * gap) + (barW * gap) / 2;
      const y = padding.top + chartH - barH;

      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, props.barColor);
      grad.addColorStop(1, props.barColor + '99');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = '#495057';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(data[i].label, x + barW / 2, padding.top + chartH + 6);
    }

    // Legend
    if (props.showLegend) {
      this._drawSimpleLegend(ctx, w, padding.top + chartH + 28, [{ label: 'Value', color: props.barColor }]);
    }
  }

  private _drawPieChart(ctx: CanvasRenderingContext2D, w: number, h: number, titleH: number, props: InferSchemaProps<typeof multiChartPropertySchema>): void {
    const data = DEFAULT_PIE_DATA;
    const colors = (props.pieColors || '#4DABF7,#F06595,#FFD43B,#69DB7C,#DA77F2').split(',').map(c => c.trim());
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total <= 0) return;

    const cx = w / 2;
    const cy = titleH + (h - titleH) / 2;
    const outerR = Math.min(w, h - titleH) * 0.35;
    const innerR = outerR * Number(props.pieInnerRadius);

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (data[i].value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const color = colors[i % colors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      if (innerR > 0) {
        ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      }
      ctx.closePath();
      ctx.fill();

      // Stroke between slices
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Labels
      if (props.pieShowLabels) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = outerR * 0.65;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pct = Math.round((data[i].value / total) * 100);
        ctx.fillText(`${pct}%`, lx, ly);
      }

      startAngle = endAngle;
    }

    // Legend
    if (props.showLegend) {
      const legendY = cy + outerR + 20;
      const itemsPerRow = Math.min(data.length, 4);
      const itemW = w / itemsPerRow;
      for (let i = 0; i < data.length; i++) {
        const col = i % itemsPerRow;
        const row = Math.floor(i / itemsPerRow);
        const lx = 20 + col * itemW;
        const ly = legendY + row * 20;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(lx, ly - 4, 10, 8);
        ctx.fillStyle = '#495057';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(data[i].label, lx + 14, ly);
      }
    }
  }

  private _drawHeatmap(ctx: CanvasRenderingContext2D, w: number, h: number, titleH: number, props: InferSchemaProps<typeof multiChartPropertySchema>): void {
    const rows = Number(props.heatmapRows) || 5;
    const cols = Number(props.heatmapCols) || 5;
    const padding = { top: titleH + 10, right: 20, bottom: 30, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    if (chartW <= 0 || chartH <= 0) return;

    const cellW = chartW / cols;
    const cellH = chartH / rows;
    const cellGap = 2;

    const colorLow = props.heatmapColorLow || '#69DB7C';
    const colorHigh = props.heatmapColorHigh || '#E74C3C';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Generate pseudo-random demo data
        const seed = (r * cols + c) * 0.13;
        const value = (Math.sin(seed * 10) * 0.5 + 0.5) * 0.8 + 0.1;
        const color = interpolateColor(colorLow, colorHigh, value);

        const x = padding.left + c * cellW + cellGap;
        const y = padding.top + r * cellH + cellGap;
        const cw = cellW - cellGap * 2;
        const ch = cellH - cellGap * 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, ch, 2);
        ctx.fill();

        // Value text
        ctx.fillStyle = value > 0.5 ? '#FFFFFF' : '#333333';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((value * 100).toFixed(0), x + cw / 2, y + ch / 2);
      }
    }

    // Row labels
    ctx.fillStyle = '#495057';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      const y = padding.top + r * cellH + cellH / 2;
      ctx.fillText(`R${r + 1}`, padding.left - 3, y);
    }

    // Col labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < cols; c++) {
      const x = padding.left + c * cellW + cellW / 2;
      ctx.fillText(`C${c + 1}`, x, padding.top + chartH + 4);
    }

    // Legend
    if (props.showLegend) {
      const legendY = padding.top + chartH + 22;
      const legendW = 100;
      const legendH = 8;
      const legendX = padding.left + chartW - legendW;
      const grad = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
      grad.addColorStop(0, colorLow);
      grad.addColorStop(1, colorHigh);
      ctx.fillStyle = grad;
      ctx.fillRect(legendX, legendY, legendW, legendH);
      ctx.fillStyle = '#495057';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Low', legendX, legendY + legendH + 10);
      ctx.fillText('High', legendX + legendW, legendY + legendH + 10);
    }
  }

  private _drawSimpleLegend(ctx: CanvasRenderingContext2D, w: number, y: number, items: { label: string; color: string }[]): void {
    const itemW = 60;
    const startX = (w - itemW * items.length) / 2;
    for (let i = 0; i < items.length; i++) {
      const x = startX + itemW * i;
      ctx.fillStyle = items[i].color;
      ctx.fillRect(x, y - 4, 10, 8);
      ctx.fillStyle = '#495057';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i].label, x + 14, y);
    }
  }
}