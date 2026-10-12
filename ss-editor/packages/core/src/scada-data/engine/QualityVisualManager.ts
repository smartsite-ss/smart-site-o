// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { QualityCode, QualityVisual } from '../types/quality.types';
import { QUALITY_VISUAL_MAP } from '../types/quality.types';

export class QualityVisualManager {
  private _overrides: Map<QualityCode, Partial<QualityVisual>> = new Map();

  configureOverride(code: QualityCode, visual: Partial<QualityVisual>): void { this._overrides.set(code, visual); }

  getVisualStyle(code: QualityCode): QualityVisual {
    const base = QUALITY_VISUAL_MAP[code] ? {
      borderColor: QUALITY_VISUAL_MAP[code].color,
      borderWidth: 2,
      borderStyle: QUALITY_VISUAL_MAP[code].borderStyle === 'dashed' ? 'dashed' : 'solid',
      opacity: QUALITY_VISUAL_MAP[code].opacity,
      overlayColor: '',
      pulseAnimation: QUALITY_VISUAL_MAP[code].borderStyle === 'dashed',
    } : { borderColor: '#9E9E9E', borderWidth: 1, borderStyle: 'solid', opacity: 1, overlayColor: '', pulseAnimation: false };
    const override = this._overrides.get(code);
    return override ? { ...base, ...override } : base;
  }

  clearOverrides(): void { this._overrides.clear(); }
}