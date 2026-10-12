// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IDataGenerator } from './IDataGenerator';

export class SinWaveGenerator implements IDataGenerator {
  private _startTime = Date.now();

  next(_currentValue: number, params: Record<string, number>): number {
    const { amplitude = 10, period = 5000, offset = 50 } = params;
    const elapsed = Date.now() - this._startTime;
    const result = amplitude * Math.sin((elapsed / period) * Math.PI * 2) + offset;
    return Math.round(result * 100) / 100;
  }

  reset(): void { this._startTime = Date.now(); }
}