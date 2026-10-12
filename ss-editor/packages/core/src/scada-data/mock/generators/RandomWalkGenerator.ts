// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IDataGenerator } from './IDataGenerator';

export class RandomWalkGenerator implements IDataGenerator {
  private _value = 50;

  next(currentValue: number, params: Record<string, number>): number {
    const { step = 1, min = 0, max = 100 } = params;
    if (!isNaN(currentValue)) this._value = currentValue;
    const delta = (Math.random() - 0.5) * 2 * step;
    this._value = Math.max(min, Math.min(max, this._value + delta));
    return Math.round(this._value * 100) / 100;
  }

  reset(): void { this._value = 50; }
}