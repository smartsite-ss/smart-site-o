// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, DrawContext } from '@scada-editor/plugin-sdk';

export interface TrendChartProps {
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  gridColor: string;
  axisColor: string;
  lineColors: string;
  lineWidth: number;
  showPoints: boolean;
  pointRadius: number;
  showLegend: boolean;
  legendPosition: string;
  maxPens: number;
  timeWindow: number;
  showTooltip: boolean;
  yAxisLabel: string;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}

interface DataPoint {
  time: number;
  value: number;
}

interface PenData {
  label: string;
  color: string;
  values: DataPoint[];
  currentValue: number | null;
}

const DEFAULT_COLORS = [
  '#4dabf7', '#f06595', '#ffd43b', '#69db7c',
  '#da77f2', '#ff922b', '#20c997', '#748ffc',
];

export class TrendChartPlugin extends BasePlugin<TrendChartProps> {
  private pens: PenData[] = [];
  private lastFrameTime = 0;

  override getDefaultProps(): TrendChartProps {
    return {
      title: '趋势图',
      titleColor: '#333333',
      titleFontSize: 14,
      titleFontWeight: 'bold',
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 4,
      gridColor: '#e9ecef',
      axisColor: '#495057',
      lineColors: DEFAULT_COLORS.join(','),
      lineWidth: 2,
      showPoints: false,
      pointRadius: 3,
      showLegend: true,
      legendPosition: 'bottom',
      maxPens: 4,
      timeWindow: 60,
      showTooltip: true,
      yAxisLabel: '',
      shadowColor: 'transparent',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
    };
  }

  private getColors(): string[] {
    const colors = this.pluginProps.lineColors;
    if (!colors) return DEFAULT_COLORS;
    const parsed = colors.split(',').map((c) => c.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_COLORS;
  }

  private ensurePens(): void {
    const maxPens = this.pluginProps.maxPens || 4;
    const colors = this.getColors();
    if (this.pens.length === 0) {
      for (let i = 0; i < maxPens; i++) {
        this.pens.push({
          label: `Pen ${i + 1}`,
          color: colors[i % colors.length],
          values: [],
          currentValue: null,
        });
      }
    }
    while (this.pens.length < maxPens) {
      this.pens.push({
        label: `Pen ${this.pens.length + 1}`,
        color: colors[this.pens.length % colors.length],
        values: [],
        currentValue: null,
      });
    }
    while (this.pens.length > maxPens) {
      this.pens.pop();
    }
  }

  /** Push a new value to a pen's data buffer */
  pushValue(penIndex: number, value: number, label?: string): void {
    this.ensurePens();
    if (penIndex < 0 || penIndex >= this.pens.length) return;
    const pen = this.pens[penIndex];
    if (label) pen.label = label;
    pen.currentValue = value;
    const now = Date.now();
    pen.values.push({ time: now, value });
    // Trim old data
    const timeWindow = this.pluginProps.timeWindow || 60;
    const cutoff = now - timeWindow * 1000;
    pen.values = pen.values.filter((p) => p.time >= cutoff);
  }

  /** Get data for rendering, applying LTTB downsampling if needed */
  private getRenderData(pen: PenData, maxPoints: number): DataPoint[] {
    const data = pen.values;
    if (data.length <= maxPoints) return data;
    return this.lttbDownsample(data, maxPoints);
  }

  private lttbDownsample(data: DataPoint[], threshold: number): DataPoint[] {
    if (data.length <= threshold || threshold < 3) return data;
    const result: DataPoint[] = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0;
    result.push(data[0]);

    for (let i = 0; i < threshold - 2; i++) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
      const avgRangeStart = rangeStart;
      const avgRangeEnd = rangeEnd;

      let avgX = 0;
      let avgY = 0;
      const avgCount = avgRangeEnd - avgRangeStart;
      if (avgCount <= 0) {
        const fallbackIndex = Math.min(rangeStart, data.length - 1);
        result.push(data[fallbackIndex]);
        a = fallbackIndex;
        continue;
      }

      for (let j = avgRangeStart; j < avgRangeEnd; j++) {
        avgX += data[j].time;
        avgY += data[j].value;
      }
      avgX /= avgCount;
      avgY /= avgCount;

      let maxArea = -1;
      let maxAreaIndex = rangeStart;
      const pointAX = data[a].time;
      const pointAY = data[a].value;
      const actualRangeEnd = Math.min(rangeEnd, data.length);

      for (let j = rangeStart; j < actualRangeEnd; j++) {
        const area = Math.abs(
          (pointAX - avgX) * (data[j].value - pointAY) -
          (pointAX - data[j].time) * (avgY - pointAY),
        ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          maxAreaIndex = j;
        }
      }
      result.push(data[maxAreaIndex]);
      a = maxAreaIndex;
    }
    result.push(data[data.length - 1]);
    return result;
  }

  render(dc: DrawContext): void {
    this.ensurePens();
    const { width, height } = this.getSize();
    if (width <= 0 || height <= 0) return;

    const props = this.pluginProps;
    const ctx = dc.ctx;

    // Shadow
    if (props.shadowColor !== 'transparent' && props.shadowBlur > 0) {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowOffsetX = props.shadowOffsetX;
      ctx.shadowOffsetY = props.shadowOffsetY;
      ctx.shadowBlur = props.shadowBlur;
    }

    // Background
    dc.fillRoundedRect(
      { x: 0, y: 0, width, height },
      props.borderRadius,
      props.backgroundColor,
    );

    // Reset shadow for remaining drawing
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    if (props.borderWidth > 0) {
      const origDash = ctx.getLineDash();
      if (props.borderStyle === 'dashed') ctx.setLineDash([6, 3]);
      else if (props.borderStyle === 'dotted') ctx.setLineDash([2, 2]);
      dc.strokeRoundedRect(
        { x: 0, y: 0, width, height },
        props.borderRadius,
        props.borderColor,
        props.borderWidth,
      );
      ctx.setLineDash(origDash);
    }

    // Padding
    const padding = { top: 40, right: 20, bottom: 50, left: 60 };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (chartW <= 0 || chartH <= 0) return;

    // Title
    dc.drawText(props.title, width / 2, 18, {
      color: props.titleColor,
      fontSize: props.titleFontSize,
      fontWeight: props.titleFontWeight as any,
      align: 'center',
    });

    // Compute Y range
    let yMin = Infinity;
    let yMax = -Infinity;
    const maxRenderPoints = Math.max(chartW / 2, 100);
    const allRenderData: DataPoint[][] = [];

    for (const pen of this.pens) {
      const data = this.getRenderData(pen, maxRenderPoints);
      allRenderData.push(data);
      for (const p of data) {
        if (p.value < yMin) yMin = p.value;
        if (p.value > yMax) yMax = p.value;
      }
    }
    if (!isFinite(yMin)) { yMin = 0; yMax = 100; }
    if (yMin === yMax) { yMin -= 10; yMax += 10; }
    const yRange = yMax - yMin || 1;

    // Grid lines (horizontal)
    const gridLines = 5;
    ctx.strokeStyle = props.gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartY + (chartH * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartW, y);
      ctx.stroke();

      // Y axis labels
      const val = yMax - (yRange * i) / gridLines;
      dc.drawText(val.toFixed(1), chartX - 8, y, {
        color: props.axisColor,
        fontSize: 10,
        align: 'right',
      });
    }

    // Y axis label
    if (props.yAxisLabel) {
      ctx.save();
      ctx.translate(12, chartY + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      dc.drawText(props.yAxisLabel, 0, 0, {
        color: props.axisColor,
        fontSize: 11,
        align: 'center',
      });
      ctx.restore();
    }

    // X axis
    const timeWindow = props.timeWindow || 60;
    const now = Date.now();
    const xMin = now - timeWindow * 1000;
    const xRange = timeWindow * 1000;

    // Time labels
    const xLabelCount = 5;
    for (let i = 0; i <= xLabelCount; i++) {
      const t = xMin + (xRange * i) / xLabelCount;
      const d = new Date(t);
      const label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      const x = chartX + (chartW * i) / xLabelCount;
      dc.drawText(label, x, chartY + chartH + 16, {
        color: props.axisColor,
        fontSize: 10,
        align: 'center',
      });
    }

    // Draw trend lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartX, chartY, chartW, chartH);
    ctx.clip();

    for (let pi = 0; pi < allRenderData.length; pi++) {
      const data = allRenderData[pi];
      if (data.length < 2) continue;

      const pen = this.pens[pi];
      ctx.strokeStyle = pen.color;
      ctx.lineWidth = props.lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      let firstPoint = true;
      for (const p of data) {
        const x = chartX + ((p.time - xMin) / xRange) * chartW;
        const y = chartY + chartH - ((p.value - yMin) / yRange) * chartH;
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw data points
      if (props.showPoints && data.length > 0) {
        ctx.fillStyle = pen.color;
        for (const p of data) {
          const x = chartX + ((p.time - xMin) / xRange) * chartW;
          const y = chartY + chartH - ((p.value - yMin) / yRange) * chartH;
          ctx.beginPath();
          ctx.arc(x, y, props.pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Current value display
      if (pen.currentValue !== null && data.length > 0) {
        const lastPoint = data[data.length - 1];
        const lx = chartX + ((lastPoint.time - xMin) / xRange) * chartW;
        const ly = chartY + chartH - ((lastPoint.value - yMin) / yRange) * chartH;
        dc.drawText(pen.currentValue.toFixed(2), lx + 10, ly, {
          color: pen.color,
          fontSize: 11,
          fontWeight: 'bold',
          align: 'left',
        });
      }
    }
    ctx.restore();

    // Legend
    if (props.showLegend && this.pens.length > 0) {
      const legendY = chartY + chartH + 30;
      const legendItemWidth = Math.min(chartW / this.pens.length, 120);
      const startX = chartX + (chartW - legendItemWidth * this.pens.length) / 2;

      for (let i = 0; i < this.pens.length; i++) {
        const pen = this.pens[i];
        const x = startX + legendItemWidth * i;
        // Color swatch
        ctx.fillStyle = pen.color;
        ctx.fillRect(x, legendY - 4, 12, 8);
        // Label
        const displayLabel = pen.label.length > 10
          ? pen.label.slice(0, 9) + '…'
          : pen.label;
        dc.drawText(displayLabel, x + 16, legendY, {
          color: props.axisColor,
          fontSize: 10,
          align: 'left',
        });
      }
    }
  }
}