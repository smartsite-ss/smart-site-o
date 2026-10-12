// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface IDataGenerator {
  next(currentValue: number, params: Record<string, number>): number;
  reset(): void;
}