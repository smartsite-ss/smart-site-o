// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { CanvasInteractionOptions } from '../../types';
import type { DrawCanvasCallback } from '@scada-editor/core';

export interface HandleClickResult {
  type: 'resize' | 'rotate';
  handle: string;
}

export type { CanvasInteractionOptions, DrawCanvasCallback };