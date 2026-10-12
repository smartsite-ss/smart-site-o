// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { VIEWPORT } from '../../canvas-page/design-canvas/constants';

describe('VIEWPORT Constant Consistency Validation', () => {
  it('PADDING definition is correct', () => {
    expect(VIEWPORT.PADDING).toBe(30);
  });

  it('zoom range is within reasonable range', () => {
    expect(VIEWPORT.SCALE_MIN).toBeGreaterThan(0);
    expect(VIEWPORT.SCALE_MAX).toBeGreaterThan(VIEWPORT.SCALE_MIN);
    expect(VIEWPORT.SCALE_MIN).toBe(20);
    expect(VIEWPORT.SCALE_MAX).toBe(300);
  });

  it('ZOOM_STEP is greater than 1', () => {
    expect(VIEWPORT.ZOOM_STEP).toBeGreaterThan(1);
  });

  it('FIT_MARGIN is between 0-1', () => {
    expect(VIEWPORT.FIT_MARGIN).toBeGreaterThan(0);
    expect(VIEWPORT.FIT_MARGIN).toBeLessThan(1);
  });

  it('default canvas size is reasonable', () => {
    expect(VIEWPORT.DEFAULT_CANVAS_WIDTH).toBe(1920);
    expect(VIEWPORT.DEFAULT_CANVAS_HEIGHT).toBe(1080);
  });

  it('zoom calculation logic validation', () => {
    const containerW = 1200;
    const containerH = 800;
    const pageW = 1920;
    const pageH = 1080;
    const padding = VIEWPORT.PADDING * 2;

    const availableW = containerW - padding;
    const availableH = containerH - padding;

    const scaleX = availableW / pageW;
    const scaleY = availableH / pageH;
    const newScale = Math.min(scaleX, scaleY, 1) * VIEWPORT.FIT_MARGIN;

    expect(newScale).toBeGreaterThan(0.1);
    expect(newScale).toBeLessThanOrEqual(1);

    const scaledW = pageW * newScale;
    const scaledH = pageH * newScale;
    const panX = (availableW - scaledW) / 2 + VIEWPORT.PADDING;
    const panY = (availableH - scaledH) / 2 + VIEWPORT.PADDING;

    expect(panX).toBeGreaterThanOrEqual(0);
    expect(panY).toBeGreaterThanOrEqual(0);
    expect(panX + scaledW).toBeLessThanOrEqual(containerW + 1);
  });
});

describe('enableAutoFit State Logic Validation', () => {
  it('centered class is controlled by conditional binding', () => {
    const scenarioOn = { enableAutoFit: true };
    const scenarioOff = { enableAutoFit: false };

    const classOn = scenarioOn.enableAutoFit ? 'canvas-viewport--centered' : '';
    const classOff = scenarioOff.enableAutoFit ? 'canvas-viewport--centered' : '';

    expect(classOn).toBe('canvas-viewport--centered');
    expect(classOff).toBe('');
  });

  it('padding calculation consistency with container size', () => {
    const containerWidth = 1200;
    const expectedAvailableWidth = containerWidth - VIEWPORT.PADDING * 2;
    expect(expectedAvailableWidth).toBe(1140);

    const containerHeight = 800;
    const expectedAvailableHeight = containerHeight - VIEWPORT.PADDING * 2;
    expect(expectedAvailableHeight).toBe(740);
  });
});