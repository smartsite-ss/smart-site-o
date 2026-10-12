// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLayout } from '../../composables/useLayout';

vi.mock('@scada-editor/core', () => {
  const mockLayout = {
    applyLayout: vi.fn(),
    update: vi.fn(),
  };
  
  return {
    usePageStore: () => ({
      currentPage: {
        id: 'page-1',
        layout: mockLayout,
      },
      setPageLayout: vi.fn(),
    }),
    useGraphicStore: () => ({
      graphics: [{ id: 'graphic-1', type: 'rectangle' }],
    }),
  };
});

describe('useLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should return current layout', () => {
    const layout = useLayout();
    expect(layout.currentLayout).toBeDefined();
  });

  it('should apply layout', () => {
    const layout = useLayout();
    layout.applyLayout();
  });

  it('should set page layout', () => {
    const layout = useLayout();
    layout.setPageLayout('grid');
  });

  it('should update layout properties', () => {
    const layout = useLayout();
    layout.updateLayoutProperties({ spacing: 10, columns: 5 });
  });
});