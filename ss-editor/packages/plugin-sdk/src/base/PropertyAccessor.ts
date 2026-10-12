// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface PropertyAccessorOptions<T> {
  styleKeys?: (keyof T)[];
  getStyleFn?: () => Record<string, any>;
  setStyleFn?: (updates: Record<string, any>) => void;
  customGetters?: Partial<Record<keyof T, () => any>>;
  customSetters?: Partial<Record<keyof T, (value: any) => void>>;
}

export function createPropertyAccessor<T extends Record<string, any>>(
  getPropsFn: (key: string, defaultVal: any) => any,
  setPropsFn: (key: string, value: any) => void,
  defaults: Partial<T>,
  options?: PropertyAccessorOptions<T>,
) {
  const styleKeySet = new Set(options?.styleKeys ?? []);
  const customGetKeys = options?.customGetters ? Object.keys(options.customGetters) : [];
  const customSetKeys = options?.customSetters ? Object.keys(options.customSetters) : [];

  return {
    get(): T {
      const result: any = {};
      const styleValues = options?.getStyleFn ? options.getStyleFn() : null;
      for (const key of Object.keys(defaults)) {
        if (customGetKeys.includes(key) && options?.customGetters?.[key as keyof T]) {
          result[key] = options.customGetters[key as keyof T]!();
        } else if (styleKeySet.has(key as keyof T) && styleValues) {
          result[key] = styleValues[key] ?? defaults[key];
        } else {
          result[key] = getPropsFn(key, defaults[key]);
        }
      }
      return result as T;
    },
    set(props: Partial<T>): void {
      const styleUpdates: Record<string, any> = {};

      Object.entries(props).forEach(([key, value]) => {
        if (value === undefined) return;
        if (customSetKeys.includes(key) && options?.customSetters?.[key as keyof T]) {
          options.customSetters[key as keyof T]!(value);
        } else if (styleKeySet.has(key as keyof T)) {
          styleUpdates[key] = value;
        } else {
          setPropsFn(key, value);
        }
      });

      if (Object.keys(styleUpdates).length > 0 && options?.setStyleFn) {
        options.setStyleFn(styleUpdates);
      }
    },
  };
}