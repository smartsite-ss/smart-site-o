// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export function safeCopyObject(obj: any, visited = new WeakMap()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj)) {
    return null;
  }
  visited.set(obj, true);

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => safeCopyObject(item, visited));
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = safeCopyObject(obj[key], visited);
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result;
}