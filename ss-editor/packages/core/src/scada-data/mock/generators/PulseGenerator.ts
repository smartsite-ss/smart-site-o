// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IDataGenerator } from './IDataGenerator';

export class PulseGenerator implements IDataGenerator {
  private _startTime = Date.now();

  next(_currentValue: number, params: Record<string, number>): number {
    const { low = 0, high = 1, period = 2000, dutyCycle = 0.5 } = params;
    const elapsed = Date.now() - this._startTime;
    return (elapsed % period) / period < dutyCycle ? high : low;
  }

  reset(): void { this._startTime = Date.now(); }
}