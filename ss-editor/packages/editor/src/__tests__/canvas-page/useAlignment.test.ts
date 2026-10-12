// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAlignment } from '../../composables/useCanvasInteraction/useAlignment';

const mockAlignGraphics = vi.fn();
const mockDistributeGraphics = vi.fn();

const mockCurrentPage = {
  alignGraphics: mockAlignGraphics,
  distributeGraphics: mockDistributeGraphics,
};

vi.mock('@scada-editor/core', () => ({
  useCurrentPage: () => mockCurrentPage,
}));

describe('useAlignment', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockAlignGraphics.mockClear();
    mockDistributeGraphics.mockClear();
  });

  it('should export all alignment functions', () => {
    const alignment = useAlignment();
    expect(typeof alignment.alignLeft).toBe('function');
    expect(typeof alignment.alignRight).toBe('function');
    expect(typeof alignment.alignTop).toBe('function');
    expect(typeof alignment.alignBottom).toBe('function');
    expect(typeof alignment.alignCenter).toBe('function');
    expect(typeof alignment.alignMiddle).toBe('function');
  });

  it('should export all distribution functions', () => {
    const alignment = useAlignment();
    expect(typeof alignment.distributeHorizontal).toBe('function');
    expect(typeof alignment.distributeVertical).toBe('function');
  });

  it('should call alignGraphics with correct parameters', () => {
    const drawCanvas = vi.fn();
    const alignment = useAlignment();
    alignment.alignLeft(drawCanvas);
    expect(mockAlignGraphics).toHaveBeenCalledWith('left');
    expect(drawCanvas).toHaveBeenCalled();
  });

  it('should call distributeGraphics with correct parameters', () => {
    const drawCanvas = vi.fn();
    const alignment = useAlignment();
    alignment.distributeHorizontal(drawCanvas);
    expect(mockDistributeGraphics).toHaveBeenCalledWith('horizontal');
    expect(drawCanvas).toHaveBeenCalled();
  });
});