// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createPinia, setActivePinia } from 'pinia';
import { vi, beforeEach } from 'vitest';

// Setup Pinia
beforeEach(() => {
  setActivePinia(createPinia());
});

// Mock global APIs
vi.mock('@scada-editor/core', () => ({
  usePageStore: () => ({
    currentPageScaleFactor: 1,
    selectedGraphicIds: [],
    currentPage: {
      scale: 100,
    },
  }),
  useGraphicStore: () => ({
    sortedGraphics: [],
    selectedGraphics: [],
    selectedGraphicIds: [],
    alignGraphics: vi.fn(),
    distributeGraphics: vi.fn(),
    saveHistory: vi.fn(),
  }),
  displayToLogical: (pos: any) => pos,
  displayRectToLogical: (rect: any) => rect,
  SelectionMode: {
    SINGLE: 'single',
    BOX: 'box',
    ADDITIVE: 'additive',
    SUBTRACTIVE: 'subtractive',
  },
  keyboardService: {
    getCurrentKeyState: () => ({ ctrl: false, shift: false }),
    setContext: vi.fn(),
    registerShortcuts: vi.fn(),
    unregisterContext: vi.fn(),
  },
  eventBus: {
    on: vi.fn(() => vi.fn()),
    offNamespace: vi.fn(),
  },
  Events: {},
  useTheme: () => ({
    themeStyles: {},
  }),
}));

// Mock window and document
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 0)),
    cancelAnimationFrame: vi.fn(),
  },
  writable: true,
});

// Mock scroll methods
Object.defineProperty(global, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});
