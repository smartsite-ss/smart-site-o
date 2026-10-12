// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export function useArrayColor(
  values: Record<string, any>,
  key: string,
  defaults: string[],
) {
  const getItem = (index: number): string => {
    const arr = values[key];
    if (Array.isArray(arr)) return arr[index] || '';
    return defaults[index] || '';
  };

  const update = (index: number, color: string) => {
    const current = values[key];
    const arr = Array.isArray(current) ? [...current] : [...defaults];
    arr[index] = color;
    values[key] = arr;
  };

  return { getItem, update };
}