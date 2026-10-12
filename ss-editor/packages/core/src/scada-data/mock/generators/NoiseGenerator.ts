// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IDataGenerator } from './IDataGenerator';

export class NoiseGenerator implements IDataGenerator {
  next(_currentValue: number, params: Record<string, number>): number {
    const { base = 50, noiseAmplitude = 5 } = params;
    const noise = (Math.random() - 0.5) * 2 * noiseAmplitude;
    return Math.round((base + noise) * 100) / 100;
  }

  reset(): void {}
}