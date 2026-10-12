// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IDataGenerator } from './IDataGenerator';

export class RampGenerator implements IDataGenerator {
  private _startTime = Date.now();

  next(_currentValue: number, params: Record<string, number>): number {
    const { min = 0, max = 100, period = 10000 } = params;
    const elapsed = Date.now() - this._startTime;
    const result = min + (max - min) * ((elapsed % period) / period);
    return Math.round(result * 100) / 100;
  }

  reset(): void { this._startTime = Date.now(); }
}