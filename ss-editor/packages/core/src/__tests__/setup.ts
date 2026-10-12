// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { vi, afterEach } from 'vitest';
import { randomFillSync } from 'crypto';

// Polyfill crypto.getRandomValues for uuid in Node.js environment
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
  (globalThis as any).crypto = {
    getRandomValues: (buffer: Uint8Array) => randomFillSync(buffer),
  };
}

// 模拟 vue，避免 @vite/env 虚拟模块加载失败
vi.mock('vue', () => ({
  default: {},
  markRaw: (v: any) => v,
  toRaw: (v: any) => v,
  reactive: (v: any) => v,
  watch: () => {},
  ref: (v: any) => ({ value: v, __v_isRef: true }),
  computed: (fn: any) => ({ value: fn(), __v_isRef: true }),
  defineComponent: (v: any) => v,
  h: () => ({}),
  createApp: () => ({
    component: () => {},
    mount: () => ({}),
    unmount: () => {},
    use: () => ({}),
  }),
  nextTick: () => Promise.resolve(),
  onMounted: () => {},
  onUnmounted: () => {},
  shallowRef: (v: any) => ({ value: v, __v_isRef: true }),
  isRef: (v: any) => v !== null && typeof v === 'object' && v.__v_isRef === true,
  unref: (v: any) => (v !== null && typeof v === 'object' && v.__v_isRef === true ? v.value : v),
  readonly: (v: any) => v,
  shallowReactive: (v: any) => v,
  isReactive: () => false,
}));

// 模拟 vue-i18n，避免模块加载时初始化失败
vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key,
      locale: { value: 'zh-CN' },
      te: () => true,
    },
    install: () => {},
  }),
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'zh-CN' },
  }),
}));

vi.mock('konva', () => {
  const mockNode = () => ({
    add: vi.fn(),
    destroy: vi.fn(),
    draw: vi.fn(),
    getLayer: vi.fn(() => null),
    getParent: vi.fn(() => null),
    getAttr: vi.fn(),
    setAttr: vi.fn(),
    getAttrs: vi.fn(() => ({})),
    setAttrs: vi.fn(),
    getPosition: vi.fn(() => ({ x: 0, y: 0 })),
    setPosition: vi.fn(),
    getSize: vi.fn(() => ({ width: 0, height: 0 })),
    setSize: vi.fn(),
    getClientRect: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    getAbsolutePosition: vi.fn(() => ({ x: 0, y: 0 })),
    show: vi.fn(),
    hide: vi.fn(),
    isVisible: vi.fn(() => true),
    toObject: vi.fn(() => ({})),
    clone: vi.fn(),
    getClassName: vi.fn(() => 'Shape'),
    fire: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    moveTo: vi.fn(),
    cache: vi.fn(),
    clearCache: vi.fn(),
    getSelfRect: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    findOne: vi.fn(() => null),
    find: vi.fn(() => []),
    setZIndex: vi.fn(),
    getZIndex: vi.fn(() => 0),
  });

  return {
    default: {
      Stage: vi.fn().mockImplementation(() => ({
        ...mockNode(),
        getLayers: vi.fn(() => []),
        container: vi.fn(() => ({})),
        content: document.createElement('div'),
        width: vi.fn(() => 800),
        height: vi.fn(() => 600),
        getPointerPosition: vi.fn(() => ({ x: 0, y: 0 })),
        getStage: vi.fn(() => ({})),
      })),
      Layer: vi.fn().mockImplementation(() => ({
        ...mockNode(),
        getChildren: vi.fn(() => []),
        getIntersection: vi.fn(() => null),
        getAllIntersections: vi.fn(() => []),
        batchDraw: vi.fn(),
        clear: vi.fn(),
        clearBeforeDraw: vi.fn(),
      })),
      Rect: vi.fn().mockImplementation(() => mockNode()),
      Text: vi.fn().mockImplementation(() => mockNode()),
      Circle: vi.fn().mockImplementation(() => mockNode()),
      Line: vi.fn().mockImplementation(() => mockNode()),
      Arrow: vi.fn().mockImplementation(() => mockNode()),
      Ellipse: vi.fn().mockImplementation(() => mockNode()),
      Image: vi.fn().mockImplementation(() => mockNode()),
      Group: vi.fn().mockImplementation(() => ({
        ...mockNode(),
        getChildren: vi.fn(() => []),
        toObject: vi.fn(() => ({ attrs: {} })),
      })),
      Transformer: vi.fn().mockImplementation(() => ({
        ...mockNode(),
        attachTo: vi.fn(),
        detach: vi.fn(),
        getNodes: vi.fn(() => []),
        forceUpdate: vi.fn(),
        boundBoxFunc: vi.fn(),
        nodes: vi.fn(() => []),
      })),
      Shape: mockNode,
    },
  };
});

vi.mock('uuid', () => {
  let counter = 0;
  return {
    v4: vi.fn(() => `mock-uuid-${++counter}`),
    default: { v4: vi.fn(() => `mock-uuid-${++counter}`) },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

if (typeof window === 'undefined') {
  (globalThis as any).window = {
    setInterval,
    setTimeout,
    clearInterval,
    clearTimeout,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number,
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  };
}