// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, createApp } from 'vue';
/// <reference types="jsdom" />
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JSDOM } = require('jsdom');
import { useRuler, type UseRulerOptions } from '../../canvas-page/design-canvas/ruler/useRuler';

function createRealDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
  return { document: dom.window.document, window: dom.window };
}

function createRulerOptions(overrides: Partial<UseRulerOptions> = {}): UseRulerOptions {
  return {
    orientation: 'vertical',
    canvasSize: 1080,
    scrollOffset: 0,
    scale: 1,
    mousePosition: null,
    onCreateGuideLine: vi.fn(),
    onUpdateMousePosition: vi.fn(),
    onDeleteLastGuideLine: vi.fn(),
    ...overrides,
  };
}

let realDoc: Document;
let realWin: Window & typeof globalThis;

function mountRulerComponent(options: UseRulerOptions) {
  let rulerResult: ReturnType<typeof useRuler> | undefined;

  const app = createApp(
    defineComponent({
      setup() {
        rulerResult = useRuler(options);
        const { rulerRef, rulerTrack } = rulerResult!;
        return () =>
          h('div', { ref: rulerRef, class: 'ruler-element' }, [
            h('div', { ref: rulerTrack, class: 'ruler-track' }),
          ]);
      },
    }),
  );

  const container = realDoc.createElement('div');
  realDoc.body.appendChild(container);
  app.mount(container);

  return {
    app,
    container,
    result: rulerResult!,
    getRulerEl: () => container.querySelector('.ruler-element') as HTMLElement,
    getTrackEl: () => container.querySelector('.ruler-track') as HTMLElement,
  };
}

function mockGetBoundingClientRect(el: HTMLElement, rect: Partial<DOMRect> = {}) {
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 100,
    bottom: 600,
    width: 100,
    height: 600,
    ...rect,
    toJSON: () => ({}),
  }));
}

describe('useRuler - Guides', () => {
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeAll(() => {
    const dom = createRealDOM();
    realDoc = dom.document;
    realWin = dom.window as any;
  });

  beforeEach(() => {
    vi.stubGlobal('document', realDoc);
    vi.stubGlobal('window', realWin);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    void consoleErrorSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('orientation detection', () => {
    it('should compute top CSS for vertical guide line preview style', () => {
      const options = createRulerOptions({ orientation: 'vertical' });
      const { result } = mountRulerComponent(options);

      result.dragPosition.value = 500;
      const style = result.guideLinePreviewStyle.value;

      expect(style.top).toBeDefined();
      expect(style.left).toBeUndefined();
    });

    it('should compute left CSS for horizontal guide line preview style', () => {
      const options = createRulerOptions({ orientation: 'horizontal' });
      const { result } = mountRulerComponent(options);

      result.dragPosition.value = 300;
      const style = result.guideLinePreviewStyle.value;

      expect(style.left).toBeDefined();
      expect(style.top).toBeUndefined();
    });
  });

  describe('guideLinePreviewStyle', () => {
    it('should compute correct top CSS for vertical guide', () => {
      const options = createRulerOptions({
        orientation: 'vertical',
        scrollOffset: 100,
      });
      const { result } = mountRulerComponent(options);

      result.dragPosition.value = 500;
      const style = result.guideLinePreviewStyle.value;

      expect(style.top).toBe('400px');
    });

    it('should compute correct left CSS for horizontal guide', () => {
      const options = createRulerOptions({
        orientation: 'horizontal',
        scrollOffset: 50,
      });
      const { result } = mountRulerComponent(options);

      result.dragPosition.value = 350;
      const style = result.guideLinePreviewStyle.value;

      expect(style.left).toBe('300px');
    });
  });

  describe('axis value extraction', () => {
    it('should initialize axisValue as 0 for vertical ruler', () => {
      const options = createRulerOptions({ orientation: 'vertical' });
      const { result } = mountRulerComponent(options);

      expect(result.axisValue.value).toBe(0);
    });

    it('should initialize axisValue as 0 for horizontal ruler', () => {
      const options = createRulerOptions({ orientation: 'horizontal' });
      const { result } = mountRulerComponent(options);

      expect(result.axisValue.value).toBe(0);
    });
  });

  describe('guide line coordinate calculation', () => {
    it('should compute coord = clientY - rect.top + scrollOffset for vertical ruler', () => {
      const options = createRulerOptions({
        orientation: 'vertical',
        scrollOffset: 200,
      });
      const { getRulerEl, result } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 50, left: 0, height: 600, width: 30 });

      rulerEl.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 15, clientY: 350, bubbles: true }),
      );

      expect(result.dragPosition.value).toBe(500);
    });

    it('should compute coord = clientX - rect.left + scrollOffset for horizontal ruler', () => {
      const options = createRulerOptions({
        orientation: 'horizontal',
        scrollOffset: 150,
      });
      const { getRulerEl, result } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 0, left: 40, height: 30, width: 800 });

      rulerEl.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 490, clientY: 10, bubbles: true }),
      );

      expect(result.dragPosition.value).toBe(600);
    });

    it('should compute scroll offset in preview style: dragPosition - scrollOffset', () => {
      const options = createRulerOptions({
        orientation: 'vertical',
        scrollOffset: 300,
      });
      const { result } = mountRulerComponent(options);

      result.dragPosition.value = 700;
      const style = result.guideLinePreviewStyle.value;

      expect(style.top).toBe('400px');
    });
  });

  describe('error guards', () => {
    it('should warn when ruler element has zero dimensions during mousedown', () => {
      const options = createRulerOptions({ orientation: 'vertical' });
      const { getRulerEl } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 0, left: 0, width: 0, height: 0 });

      rulerEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('zero dimensions'),
      );
    });

    it('should keep rulerRef null when not bound to template ref', () => {
      const options = createRulerOptions({ orientation: 'horizontal' });
      let exposedRef: any = null;

      const app = createApp(
        defineComponent({
          setup() {
            const ruler = useRuler(options);
            exposedRef = ruler.rulerRef;
            return () => h('div');
          },
        }),
      );
      const c = realDoc.createElement('div');
      realDoc.body.appendChild(c);
      app.mount(c);

      expect(exposedRef.value).toBeNull();
    });

    it('should warn when coord is not finite', () => {
      const options = createRulerOptions({
        orientation: 'vertical',
        scrollOffset: NaN,
      });
      const { getRulerEl } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 0, left: 0, height: 600, width: 30 });

      rulerEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid coordinate'),
      );
    });
  });

  describe('drag state lifecycle', () => {
    it('should transition isDraggingNewGuide true→false during guide creation', () => {
      const onCreateGuideLine = vi.fn();
      const options = createRulerOptions({
        orientation: 'vertical',
        scrollOffset: 0,
        onCreateGuideLine,
      });
      const { getRulerEl, result } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 0, left: 0, height: 600, width: 30 });

      expect(result.isDraggingNewGuide.value).toBe(false);

      rulerEl.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 10, clientY: 200, bubbles: true }),
      );
      expect(result.isDraggingNewGuide.value).toBe(true);

      realDoc.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 12, clientY: 300, bubbles: true }),
      );
      expect(result.isDraggingNewGuide.value).toBe(true);

      realDoc.dispatchEvent(
        new MouseEvent('mouseup', { clientX: 12, clientY: 300, bubbles: true }),
      );
      expect(result.isDraggingNewGuide.value).toBe(false);
      expect(onCreateGuideLine).toHaveBeenCalled();
    });
  });

  describe('mouse leave behavior', () => {
    it('should not clear mouse position when actively dragging', () => {
      const onUpdateMousePosition = vi.fn();
      const options = createRulerOptions({
        orientation: 'vertical',
        onUpdateMousePosition,
      });
      const { getRulerEl } = mountRulerComponent(options);

      const rulerEl = getRulerEl();
      mockGetBoundingClientRect(rulerEl, { top: 0, left: 0, height: 600, width: 30 });

      rulerEl.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 10, clientY: 200, bubbles: true }),
      );

      rulerEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(onUpdateMousePosition).not.toHaveBeenCalledWith(null);
    });

    it('should clear mouse position when not dragging', () => {
      const onUpdateMousePosition = vi.fn();
      const options = createRulerOptions({
        orientation: 'vertical',
        onUpdateMousePosition,
      });
      const { getRulerEl } = mountRulerComponent(options);

      const rulerEl = getRulerEl();

      rulerEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(onUpdateMousePosition).toHaveBeenCalledWith(null);
    });
  });

  describe('RAF throttling', () => {
    it('should use requestAnimationFrame for mouse tracking', () => {
      vi.useFakeTimers();
      const onUpdateMousePosition = vi.fn();
      const options = createRulerOptions({
        orientation: 'vertical',
        onUpdateMousePosition,
      });
      const { getTrackEl } = mountRulerComponent(options);

      const trackEl = getTrackEl();
      mockGetBoundingClientRect(trackEl, { top: 0, left: 0, height: 600, width: 800 });

      trackEl.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 50, clientY: 300, bubbles: true }),
      );

      expect(onUpdateMousePosition).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(onUpdateMousePosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, y: 300 }),
      );
    });
  });

  describe('cleanup on unmount', () => {
    it('should run onUnmounted without errors and cancel pending RAF', () => {
      vi.useFakeTimers();
      const onUpdateMousePosition = vi.fn();
      const options = createRulerOptions({
        orientation: 'vertical',
        onUpdateMousePosition,
      });
      const { app, getTrackEl } = mountRulerComponent(options);

      const trackEl = getTrackEl();
      mockGetBoundingClientRect(trackEl, { top: 0, left: 0, height: 600, width: 800 });

      trackEl.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 50, clientY: 300, bubbles: true }),
      );

      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

      app.unmount();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('mouse indicator visibility', () => {
    it('should initialize showMouseIndicator as false', () => {
      const options = createRulerOptions({ orientation: 'vertical' });
      const { result } = mountRulerComponent(options);

      expect(result.showMouseIndicator.value).toBe(false);
    });
  });
});