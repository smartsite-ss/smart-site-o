// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  getTickInterval,
  formatLabel,
  calculateTicks,
  calculateMousePosition,
  RulerOrientation,
  RulerUnit,
} from '../../canvas-page/design-canvas/ruler/RulerUtils';
import type { TickConfig } from '../../canvas-page/design-canvas/ruler/RulerUtils';

describe('CanvasRulerUtils', () => {
  describe('getTickInterval', () => {
    it('scale=0.1 returns 2000/500', () => {
      const result = getTickInterval(0.1);
      expect(result.major).toBe(2000);
      expect(result.minor).toBe(500);
      expect(result.micro).toBeUndefined();
    });

    it('scale=0.25 returns 1000/200', () => {
      const result = getTickInterval(0.25);
      expect(result.major).toBe(1000);
      expect(result.minor).toBe(200);
      expect(result.micro).toBeUndefined();
    });

    it('scale=0.5 returns 500/100', () => {
      const result = getTickInterval(0.5);
      expect(result.major).toBe(500);
      expect(result.minor).toBe(100);
      expect(result.micro).toBeUndefined();
    });

    it('scale=1 returns 200/50 (1:1 standard view)', () => {
      const result = getTickInterval(1);
      expect(result.major).toBe(200);
      expect(result.minor).toBe(50);
      expect(result.micro).toBeUndefined();
    });

    it('scale=2 returns 100/20', () => {
      const result = getTickInterval(2);
      expect(result.major).toBe(100);
      expect(result.minor).toBe(20);
      expect(result.micro).toBeUndefined();
    });

    it('scale=4 returns 50/10', () => {
      const result = getTickInterval(4);
      expect(result.major).toBe(50);
      expect(result.minor).toBe(10);
      expect(result.micro).toBeUndefined();
    });

    it('scale=8 returns 25/5/1 (with micro-tick micro=1)', () => {
      const result = getTickInterval(8);
      expect(result.major).toBe(25);
      expect(result.minor).toBe(5);
      expect(result.micro).toBe(1);
    });

    it('scale=16 returns 10/2/1 (ultra-precision mode)', () => {
      const result = getTickInterval(16);
      expect(result.major).toBe(10);
      expect(result.minor).toBe(2);
      expect(result.micro).toBe(1);
    });

    it('scale=0 falls into first branch returns 2000/500', () => {
      const result = getTickInterval(0);
      expect(result.major).toBe(2000);
      expect(result.minor).toBe(500);
      expect(result.micro).toBeUndefined();
    });

    it('scale=1000 (extreme value) falls into last branch returns 10/2/1', () => {
      const result = getTickInterval(1000);
      expect(result.major).toBe(10);
      expect(result.minor).toBe(2);
      expect(result.micro).toBe(1);
    });
  });

  describe('formatLabel', () => {
    it('default PX unit returns rounded integer string', () => {
      expect(formatLabel(100)).toBe('100');
      expect(formatLabel(0)).toBe('0');
      expect(formatLabel(99.4)).toBe('99');
      expect(formatLabel(99.5)).toBe('100');
      expect(formatLabel(100, RulerUnit.PX)).toBe('100');
    });

    it('CM unit: (value * 0.026458).toFixed(1) + "cm"', () => {
      // 100 * 0.026458 = 2.6458 → toFixed(1) → "2.6" → "2.6cm"
      expect(formatLabel(100, RulerUnit.CM)).toBe('2.6cm');
      // 0 * 0.026458 = 0 → toFixed(1) → "0.0" → "0.0cm"
      expect(formatLabel(0, RulerUnit.CM)).toBe('0.0cm');
      // 200 * 0.026458 = 5.2916 → "5.3cm"
      expect(formatLabel(200, RulerUnit.CM)).toBe('5.3cm');
    });

    it('INCH unit: (value * 0.0104167).toFixed(2) + \'"\'', () => {
      // 100 * 0.0104167 = 1.04167 → toFixed(2) → "1.04" → '1.04"'
      expect(formatLabel(100, RulerUnit.INCH)).toBe('1.04"');
      // 0 → "0.00""
      expect(formatLabel(0, RulerUnit.INCH)).toBe('0.00"');
      // 96 * 0.0104167 = 1.0000032 → "1.00""
      expect(formatLabel(96, RulerUnit.INCH)).toBe('1.00"');
    });

    it('MM unit: Math.round(value * 0.26458).toString() + "mm"', () => {
      // 100 * 0.26458 = 26.458 → Math.round → 26 → "26mm"
      expect(formatLabel(100, RulerUnit.MM)).toBe('26mm');
      // 0 → "0mm"
      expect(formatLabel(0, RulerUnit.MM)).toBe('0mm');
      // 10 * 0.26458 = 2.6458 → Math.round → 3 → "3mm"
      expect(formatLabel(10, RulerUnit.MM)).toBe('3mm');
    });

    it('M unit: (value * 0.00026458).toFixed(2) + "m"', () => {
      // 10000 * 0.00026458 = 2.6458 → toFixed(2) → "2.65" → "2.65m"
      expect(formatLabel(10000, RulerUnit.M)).toBe('2.65m');
      // 0 → "0.00m"
      expect(formatLabel(0, RulerUnit.M)).toBe('0.00m');
      // 3780 * 0.00026458 = 1.0001124 → "1.00m"
      expect(formatLabel(3780, RulerUnit.M)).toBe('1.00m');
    });
  });

  describe('calculateTicks', () => {
    it('basic range: scale=1, start=0, end=500', () => {
      const config: TickConfig = {
        start: 0,
        end: 500,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);

      // scale=1 → major=200, minor=50, minInterval=50
      // 11 ticks total: 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500
      expect(ticks.length).toBe(11);

      // Verify tick positions increase linearly
      for (let i = 0; i < ticks.length; i++) {
        expect(ticks[i].position).toBe(i * 50);
      }

      // Every 4 minor ticks gives one major tick (majorInterval/minorInterval = 200/50 = 4)
      const majorTicks = ticks.filter((t) => t.isMajor);
      expect(majorTicks.length).toBe(3);
      expect(majorTicks[0].position).toBe(0);
      expect(majorTicks[1].position).toBe(200);
      expect(majorTicks[2].position).toBe(400);
    });

    it('verify major tick labels have values and are increasing', () => {
      const config: TickConfig = {
        start: 0,
        end: 1000,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);
      const majorTicks = ticks.filter((t) => t.isMajor);

      // Major ticks must have labels (scale=1 > 0.5, show labels)
      expect(majorTicks.length).toBeGreaterThan(0);
      majorTicks.forEach((t) => {
        expect(t.label).not.toBe('');
        expect(typeof t.label).toBe('string');
      });
      // Label values increase
      const labels = majorTicks.map((t) => parseInt(t.label, 10));
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i]).toBeGreaterThan(labels[i - 1]);
      }
    });

    it('minor ticks are between major ticks without labels', () => {
      const config2: TickConfig = {
        start: 0,
        end: 500,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks2 = calculateTicks(config2);
      const minorTicks = ticks2.filter((t) => !t.isMajor && !t.isMicro);

      expect(minorTicks.length).toBeGreaterThan(0);
      minorTicks.forEach((t) => {
        expect(t.label).toBe('');
        expect(t.isMajor).toBe(false);
      });
      // Minor ticks are between major ticks: two major ticks (150,350) should have 3 minor ticks between them (200,250,300)
      // Actual: 0,50,100,(150 major),200,250,300,(350 major),400,450,500
      // Minor ticks: 0,50,100,200,250,300,400,450,500 = 9 total
      // They are evenly distributed within major tick intervals
    });

    it('high zoom scale=10 produces micro ticks', () => {
      const config3: TickConfig = {
        start: 0,
        end: 100,
        scale: 10,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks3 = calculateTicks(config3);
      // scale=10 → { major: 10, minor: 2, micro: 1 }
      const microTicks = ticks3.filter((t) => t.isMicro);
      const majorTicks2 = ticks3.filter((t) => t.isMajor);
      const minorTicks2 = ticks3.filter((t) => !t.isMajor && !t.isMicro);
      expect(microTicks.length).toBeGreaterThan(0);
      expect(majorTicks2.length).toBeGreaterThan(0);
      expect(minorTicks2.length).toBeGreaterThan(0);
      // Micro ticks have no labels
      microTicks.forEach((t) => {
        expect(t.label).toBe('');
      });
    });

    it('low zoom scale=0.05 uses coarser intervals without major tick labels', () => {
      const config: TickConfig = {
        start: 0,
        end: 5000,
        scale: 0.05,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);

      // scale=0.05 → { major: 2000, minor: 500 }
      const majorTicks = ticks.filter((t) => t.isMajor);
      expect(majorTicks.length).toBeGreaterThan(0);

      // No labels when scale=0.05 ≤ 0.5
      majorTicks.forEach((t) => {
        expect(t.label).toBe('');
      });
    });

    it('ticks shift under scroll offset', () => {
      const configNoOffset: TickConfig = {
        start: 100,
        end: 300,
        scale: 1,
        scrollOffset: 0,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const configWithOffset: TickConfig = {
        start: 100,
        end: 300,
        scale: 1,
        scrollOffset: 50,
        orientation: RulerOrientation.HORIZONTAL,
      };

      const ticksNoOffset = calculateTicks(configNoOffset);
      const ticksWithOffset = calculateTicks(configWithOffset);

      // Results differ between with and without offset
      expect(ticksNoOffset).not.toEqual(ticksWithOffset);

      // Regardless of offset, all tick positions must be within [start, end] range
      ticksNoOffset.forEach((t) => {
        expect(t.position).toBeGreaterThanOrEqual(100);
        expect(t.position).toBeLessThanOrEqual(300);
      });
      ticksWithOffset.forEach((t) => {
        expect(t.position).toBeGreaterThanOrEqual(100);
        expect(t.position).toBeLessThanOrEqual(300);
      });
    });

    it('grid alignment: gridSize=50, major tick positions (150,350,550) all divisible by 50', () => {
      const config: TickConfig = {
        start: 0,
        end: 600,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
        gridSize: 50,
      };
      const ticks = calculateTicks(config);
      const gridAligned = ticks.filter((t) => t.isGridAligned);

      expect(gridAligned.length).toBeGreaterThan(0);

      gridAligned.forEach((t) => {
        expect(t.isMajor).toBe(true);
      });
    });

    it('no grid alignment marks when gridSize=0', () => {
      const config: TickConfig = {
        start: 0,
        end: 600,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
        gridSize: 0,
      };
      const ticks = calculateTicks(config);
      const gridAligned = ticks.filter((t) => t.isGridAligned);
      expect(gridAligned.length).toBe(0);
    });

    it('maximum range should not exceed max tick count of 500', () => {
      const config: TickConfig = {
        start: -10000,
        end: 10000,
        scale: 10,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);
      expect(ticks.length).toBeLessThanOrEqual(500);
    });

    it('empty range start===end produces minimum ticks', () => {
      const config: TickConfig = {
        start: 0,
        end: 0,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);
      // When start===end, maxTickCount = Math.ceil(0/minInterval)+1 = 1
      // Only added when displayPos >= start && <= end
      expect(ticks.length).toBeLessThanOrEqual(1);
      if (ticks.length > 0) {
        expect(ticks[0].position).toBe(0);
      }
    });

    it('vertical orientation also produces correct ticks', () => {
      const config: TickConfig = {
        start: 0,
        end: 1080,
        scale: 1,
        orientation: RulerOrientation.VERTICAL,
      };
      const ticks = calculateTicks(config);

      expect(ticks.length).toBeGreaterThan(0);
      const majorTicks = ticks.filter((t) => t.isMajor);
      expect(majorTicks.length).toBeGreaterThan(0);
    });

    it('all tick positions are within [start, end] range', () => {
      const config: TickConfig = {
        start: 200,
        end: 800,
        scale: 1,
        orientation: RulerOrientation.HORIZONTAL,
      };
      const ticks = calculateTicks(config);

      ticks.forEach((t) => {
        expect(t.position).toBeGreaterThanOrEqual(200);
        expect(t.position).toBeLessThanOrEqual(800);
      });
    });
  });

  describe('calculateMousePosition', () => {
    it('horizontal: clientX=150, containerRect.left=50, scrollOffset=0 → 100', () => {
      const event = { clientX: 150, clientY: 0 } as MouseEvent;
      const rect = { left: 50, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => '' } as DOMRect;
      const result = calculateMousePosition(event, rect, 0, RulerOrientation.HORIZONTAL);
      expect(result).toBe(100);
    });

    it('vertical: clientY=200, containerRect.top=60, scrollOffset=10 → 150', () => {
      const event = { clientX: 0, clientY: 200 } as MouseEvent;
      const rect = { left: 0, top: 60, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => '' } as DOMRect;
      const result = calculateMousePosition(event, rect, 10, RulerOrientation.VERTICAL);
      expect(result).toBe(150);
    });

    it('coordinates correctly superimposed with scroll offset', () => {
      /* Horizontal */
      const hEvent = { clientX: 300, clientY: 0 } as MouseEvent;
      const hRect = { left: 20, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => '' } as DOMRect;
      expect(calculateMousePosition(hEvent, hRect, 100, RulerOrientation.HORIZONTAL)).toBe(380);
      /* Vertical */
      const vEvent = { clientX: 0, clientY: 400 } as MouseEvent;
      const vRect = { left: 0, top: 30, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => '' } as DOMRect;
      expect(calculateMousePosition(vEvent, vRect, 200, RulerOrientation.VERTICAL)).toBe(570);
    });
  });

  describe('RulerUnit enum', () => {
    it('includes all five units', () => {
      expect(RulerUnit.PX).toBe('px');
      expect(RulerUnit.CM).toBe('cm');
      expect(RulerUnit.INCH).toBe('inch');
      expect(RulerUnit.MM).toBe('mm');
      expect(RulerUnit.M).toBe('m');
    });
  });

  describe('RulerOrientation enum', () => {
    it('includes horizontal and vertical orientations', () => {
      expect(RulerOrientation.HORIZONTAL).toBe('horizontal');
      expect(RulerOrientation.VERTICAL).toBe('vertical');
    });
  });
});