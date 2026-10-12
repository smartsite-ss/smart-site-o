// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { AlignmentManager } from '../../../../src/graphic-editing/managers/AlignmentManager';

describe('AlignmentManager', () => {
  let manager: AlignmentManager;

  beforeEach(() => {
    manager = new AlignmentManager();
  });

  it('should be defined', () => {
    expect(manager).toBeDefined();
  });

  it('should have initial state', () => {
    expect(manager.alignLeft).toBeDefined();
    expect(manager.alignRight).toBeDefined();
    expect(manager.alignTop).toBeDefined();
    expect(manager.alignBottom).toBeDefined();
  });
});