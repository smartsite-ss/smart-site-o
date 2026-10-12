// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  setSvgAttrs,
  s,
  r,
  p,
  l,
  poly,
  circle,
  iconMap,
} from '../../common/icons';

describe('SystemMenuIcon - icons module', () => {
  const defaultAttrs = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };

  beforeEach(() => {
    setSvgAttrs(defaultAttrs);
    setActivePinia(createPinia());
  });

  afterEach(() => {
    setSvgAttrs(defaultAttrs);
  });

  // --- Helper functions ---

  describe('svg helper: s()', () => {
    it('should create an svg VNode', () => {
      const vnode = s();
      expect(vnode.type).toBe('svg');
    });

    it('should include svgAttrs in props', () => {
      const vnode = s();
      expect(vnode.props).toEqual(defaultAttrs);
    });

    it('should include children', () => {
      const child = circle('12', '12', '3');
      const vnode = s(child);
      expect(vnode.children).toBeDefined();
    });
  });

  describe('rect helper: r()', () => {
    it('should create a rect VNode', () => {
      const vnode = r('3', '3', '7', '7');
      expect(vnode.type).toBe('rect');
      expect(vnode.props).toEqual({ x: '3', y: '3', width: '7', height: '7', rx: '0' });
    });

    it('should accept optional rx', () => {
      const vnode = r('4', '4', '16', '16', '2');
      expect(vnode.props!.rx).toBe('2');
    });
  });

  describe('path helper: p()', () => {
    it('should create a path VNode', () => {
      const vnode = p('M18 20V10');
      expect(vnode.type).toBe('path');
      expect(vnode.props).toEqual({ d: 'M18 20V10' });
    });
  });

  describe('line helper: l()', () => {
    it('should create a line VNode', () => {
      const vnode = l('9', '1', '9', '4');
      expect(vnode.type).toBe('line');
      expect(vnode.props).toEqual({ x1: '9', y1: '1', x2: '9', y2: '4' });
    });
  });

  describe('polyline helper: poly()', () => {
    it('should create a polyline VNode', () => {
      const vnode = poly('16 18 22 12 16 6');
      expect(vnode.type).toBe('polyline');
      expect(vnode.props).toEqual({ points: '16 18 22 12 16 6' });
    });
  });

  describe('circle helper: circle()', () => {
    it('should create a circle VNode', () => {
      const vnode = circle('12', '12', '3');
      expect(vnode.type).toBe('circle');
      expect(vnode.props).toEqual({ cx: '12', cy: '12', r: '3' });
    });
  });

  // --- setSvgAttrs ---

  describe('setSvgAttrs', () => {
    it('should update svg attrs for subsequent s() calls', () => {
      setSvgAttrs({ ...defaultAttrs, width: 32, height: 32 });
      const vnode = s();
      expect(vnode.props!.width).toBe(32);
      expect(vnode.props!.height).toBe(32);
    });
  });

  // --- Icon map entries ---

  describe('iconMap', () => {
    const allIcons = Object.keys(iconMap);

    it('should have all expected icons', () => {
      expect(allIcons).toContain('overview');
      expect(allIcons).toContain('projects');
      expect(allIcons).toContain('devices');
      expect(allIcons).toContain('plugins');
      expect(allIcons).toContain('alarms');
      expect(allIcons).toContain('scripts');
      expect(allIcons).toContain('reports');
      expect(allIcons).toContain('templates');
      expect(allIcons).toContain('settings');
      expect(allIcons).toContain('settings-sub');
      expect(allIcons).toContain('dict');
      expect(allIcons).toContain('info');
      expect(allIcons).toContain('device');
      expect(allIcons).toContain('plugin');
    });

    it('every icon should return an svg root', () => {
      for (const name of allIcons) {
        const vnode = iconMap[name]();
        expect(vnode.type).toBe('svg');
      }
    });

    it('every icon should have non-empty children', () => {
      for (const name of allIcons) {
        const vnode = iconMap[name]();
        if (Array.isArray(vnode.children)) {
          expect(vnode.children.length).toBeGreaterThan(0);
        } else if (typeof vnode.children === 'string') {
          expect(vnode.children.length).toBeGreaterThan(0);
        }
      }
    });

    it('overview should have 4 rect children', () => {
      const vnode = iconMap.overview();
      const children = vnode.children as any[];
      const rects = children.filter((c: any) => c && c.type === 'rect');
      expect(rects.length).toBe(4);
    });

    it('alarms should have 2 path children', () => {
      const vnode = iconMap.alarms();
      const children = vnode.children as any[];
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(paths.length).toBe(2);
    });

    it('reports should have 3 path children', () => {
      const vnode = iconMap.reports();
      const children = vnode.children as any[];
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(paths.length).toBe(3);
    });

    it('scripts should have 2 polyline children', () => {
      const vnode = iconMap.scripts();
      const children = vnode.children as any[];
      const polylines = children.filter((c: any) => c && c.type === 'polyline');
      expect(polylines.length).toBe(2);
    });

    it('settings should have 1 circle and 1 path child', () => {
      const vnode = iconMap.settings();
      const children = vnode.children as any[];
      const circles = children.filter((c: any) => c && c.type === 'circle');
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(circles.length).toBe(1);
      expect(paths.length).toBe(1);
    });

    it('templates should have 3 rect and 1 path children', () => {
      const vnode = iconMap.templates();
      const children = vnode.children as any[];
      const rects = children.filter((c: any) => c && c.type === 'rect');
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(rects.length).toBe(3);
      expect(paths.length).toBe(1);
    });

    it('devices should have 2 rect and 8 line children', () => {
      const vnode = iconMap.devices();
      const children = vnode.children as any[];
      const rects = children.filter((c: any) => c && c.type === 'rect');
      const lines = children.filter((c: any) => c && c.type === 'line');
      expect(rects.length).toBe(2);
      expect(lines.length).toBe(8);
    });

    it('device (alias) should have same structure as devices', () => {
      const devVnode = iconMap.devices();
      const devAliasVnode = iconMap.device();
      const devRects = (devVnode.children as any[]).filter((c: any) => c && c.type === 'rect');
      const aliasRects = (devAliasVnode.children as any[]).filter((c: any) => c && c.type === 'rect');
      expect(aliasRects.length).toBe(devRects.length);
    });

    it('plugin (alias) should have same structure as plugins', () => {
      const plugVnode = iconMap.plugins();
      const plugAliasVnode = iconMap.plugin();
      const plugPaths = (plugVnode.children as any[]).filter((c: any) => c && c.type === 'path');
      const aliasPaths = (plugAliasVnode.children as any[]).filter((c: any) => c && c.type === 'path');
      expect(aliasPaths.length).toBe(plugPaths.length);
    });

    it('settings-sub should have same structure as settings', () => {
      const settings = iconMap.settings();
      const settingsSub = iconMap['settings-sub']();
      const sCircles = (settings.children as any[]).filter((c: any) => c && c.type === 'circle');
      const ssCircles = (settingsSub.children as any[]).filter((c: any) => c && c.type === 'circle');
      expect(ssCircles.length).toBe(sCircles.length);
    });

    it('info should have 1 circle and 2 line children', () => {
      const vnode = iconMap.info();
      const children = vnode.children as any[];
      const circles = children.filter((c: any) => c && c.type === 'circle');
      const lines = children.filter((c: any) => c && c.type === 'line');
      expect(circles.length).toBe(1);
      expect(lines.length).toBe(2);
    });

    it('dict should have 2 path children', () => {
      const vnode = iconMap.dict();
      const children = vnode.children as any[];
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(paths.length).toBe(2);
    });

    it('projects should have 1 path child', () => {
      const vnode = iconMap.projects();
      const children = vnode.children as any[];
      const paths = children.filter((c: any) => c && c.type === 'path');
      expect(paths.length).toBe(1);
    });
  });
});
