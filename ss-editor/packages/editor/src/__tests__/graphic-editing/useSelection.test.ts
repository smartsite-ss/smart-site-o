// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSelection } from '../../composables/useSelection';

const { mockSelectGraphic, mockRemoveGraphic, mockDuplicateGraphic, mockSelectMultipleGraphics } = vi.hoisted(() => ({
  mockSelectGraphic: vi.fn(),
  mockRemoveGraphic: vi.fn(),
  mockDuplicateGraphic: vi.fn(),
  mockSelectMultipleGraphics: vi.fn(),
}));

const mockCurrentPage = {
  get selectedGraphicId() { return 'graphic-1'; },
  get selectedGraphicIds() { return ['graphic-1']; },
  get graphics() { return [{ id: 'graphic-1', type: 'rectangle' }, { id: 'graphic-2', type: 'circle' }]; },
  selectGraphic: mockSelectGraphic,
  selectMultipleGraphics: mockSelectMultipleGraphics,
  removeGraphic: mockRemoveGraphic,
};

vi.mock('@scada-editor/core', () => ({
  useGraphicStore: () => ({
    selectedGraphicId: 'graphic-1',
    selectedGraphic: { id: 'graphic-1', type: 'rectangle' },
    graphics: [
      { id: 'graphic-1', type: 'rectangle' },
      { id: 'graphic-2', type: 'circle' },
    ],
    duplicateGraphic: mockDuplicateGraphic,
  }),
  useCurrentPage: () => mockCurrentPage,
}));

describe('useSelection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockSelectGraphic.mockClear();
    mockSelectMultipleGraphics.mockClear();
    mockRemoveGraphic.mockClear();
    mockDuplicateGraphic.mockClear();
  });

  it('should return selected graphic and id', () => {
    const selection = useSelection();
    expect(selection.selectedGraphic.value).toEqual({ id: 'graphic-1', type: 'rectangle' });
    expect(selection.selectedGraphicId.value).toBe('graphic-1');
  });

  it('should select graphic', () => {
    const selection = useSelection();
    selection.selectGraphic('graphic-2');
    expect(mockSelectGraphic).toHaveBeenCalledWith('graphic-2');
  });

  it('should deselect graphic', () => {
    const selection = useSelection();
    selection.deselectGraphic();
    expect(mockSelectGraphic).toHaveBeenCalledWith(null);
  });

  it('should check if graphic is selected', () => {
    const selection = useSelection();
    expect(selection.isSelected('graphic-1')).toBe(true);
    expect(selection.isSelected('graphic-2')).toBe(false);
  });

  it('should select all graphics', () => {
    const selection = useSelection();
    selection.selectAllGraphics();
    expect(mockSelectMultipleGraphics).toHaveBeenCalledWith(['graphic-1', 'graphic-2']);
  });

  it('should delete selected graphic', () => {
    const selection = useSelection();
    selection.deleteSelectedGraphic();
    expect(mockRemoveGraphic).toHaveBeenCalledWith('graphic-1');
  });

  it('should duplicate selected graphic', () => {
    const selection = useSelection();
    selection.duplicateSelectedGraphic();
    expect(mockDuplicateGraphic).toHaveBeenCalledWith('graphic-1');
  });
});