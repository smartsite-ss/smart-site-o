// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import CanvasRulers from '@/canvas-page/design-canvas/CanvasRulers.vue';

describe('CanvasRulers', () => {
  describe('Component definition', () => {
    it('should import component successfully', () => {
      expect(CanvasRulers).toBeDefined();
      expect(typeof CanvasRulers).toBe('object');
    });

    it('should have a component name', () => {
      const name = (CanvasRulers as any).__name || (CanvasRulers as any).name;
      expect(name).toBeTruthy();
    });

    it('should define required props', () => {
      const props = (CanvasRulers as any).props;
      expect(props).toBeDefined();
      expect(props.canvasWidth).toBeDefined();
      expect(props.canvasHeight).toBeDefined();
    });

    it('should define optional props and default values', () => {
      const props = (CanvasRulers as any).props;
      expect(props.showRuler).toBeDefined();
      expect(props.showRuler.default).toBe(true);
      expect(props.showReferenceLines).toBeDefined();
      expect(props.showReferenceLines.default).toBe(false);
      expect(props.scrollLeft).toBeDefined();
      expect(props.scrollLeft.default).toBe(0);
      expect(props.scrollTop).toBeDefined();
      expect(props.scrollTop.default).toBe(0);
    });

    it('should define emits', () => {
      const emits = (CanvasRulers as any).emits;
      expect(emits).toBeDefined();
    });
  });
});