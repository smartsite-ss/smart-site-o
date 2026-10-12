// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { JsonPathUtil } from '../jsonpath.util';

describe('JsonPathUtil', () => {
  // -------------------------------------------------------------
  // extract() — 基础场景
  // -------------------------------------------------------------
  describe('extract 基础场景', () => {
    it('data 为 null 时应返回 undefined', () => {
      expect(JsonPathUtil.extract(null, '$.field')).toBeUndefined();
    });

    it('data 为 undefined 时应返回 undefined', () => {
      expect(JsonPathUtil.extract(undefined, '$.field')).toBeUndefined();
    });

    it('jsonPath 为空字符串时应原样返回 data', () => {
      const data = { a: 1 };
      expect(JsonPathUtil.extract(data, '')).toBe(data);
    });

    it('jsonPath 为非字符串时应原样返回 data', () => {
      const data = { a: 1 };
      expect(JsonPathUtil.extract(data, null)).toBe(data);
    });

    it('jsonPath 仅 $ 时应原样返回 data', () => {
      const data = { a: 1 };
      expect(JsonPathUtil.extract(data, '$')).toBe(data);
    });

    it('jsonPath 为 $. 时应原样返回 data', () => {
      const data = { a: 1 };
      expect(JsonPathUtil.extract(data, '$.')).toBe(data);
    });
  });

  // -------------------------------------------------------------
  // extract() — 根字段
  // -------------------------------------------------------------
  describe('extract 根字段', () => {
    it('应提取顶层字段 $.field', () => {
      const data = { name: '温度传感器', value: 42 };
      expect(JsonPathUtil.extract(data, '$.name')).toBe('温度传感器');
      expect(JsonPathUtil.extract(data, '$.value')).toBe(42);
    });

    it('字段不存在时应返回 undefined', () => {
      const data = { name: '传感器' };
      expect(JsonPathUtil.extract(data, '$.missing')).toBeUndefined();
    });

    it('字段值为 null 时应返回 null', () => {
      const data = { name: null };
      expect(JsonPathUtil.extract(data, '$.name')).toBeNull();
    });

    it('字段值为 0 时应返回 0', () => {
      const data = { value: 0 };
      expect(JsonPathUtil.extract(data, '$.value')).toBe(0);
    });

    it('字段值为 false 时应返回 false', () => {
      const data = { active: false };
      expect(JsonPathUtil.extract(data, '$.active')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // extract() — 嵌套字段
  // -------------------------------------------------------------
  describe('extract 嵌套字段', () => {
    it('应提取嵌套字段 $.a.b.c', () => {
      const data = { a: { b: { c: 'deep' } } };
      expect(JsonPathUtil.extract(data, '$.a.b.c')).toBe('deep');
    });

    it('嵌套路径中途字段不存在时应返回 undefined', () => {
      const data = { a: { b: {} } };
      expect(JsonPathUtil.extract(data, '$.a.b.c.missing')).toBeUndefined();
    });

    it('嵌套路径中途字段为 null 时应返回 undefined', () => {
      const data = { a: { b: null } };
      expect(JsonPathUtil.extract(data, '$.a.b.c')).toBeUndefined();
    });

    it('嵌套路径中途字段为非对象时应返回 undefined', () => {
      const data = { a: { b: 'string' } };
      expect(JsonPathUtil.extract(data, '$.a.b.c')).toBeUndefined();
    });

    it('应支持多层嵌套数字字段值', () => {
      const data = {
        sensor: {
          reading: {
            value: 23.5,
            unit: '°C',
          },
        },
      };
      expect(JsonPathUtil.extract(data, '$.sensor.reading.value')).toBe(23.5);
      expect(JsonPathUtil.extract(data, '$.sensor.reading.unit')).toBe('°C');
    });
  });

  // -------------------------------------------------------------
  // extract() — 数组索引
  // -------------------------------------------------------------
  describe('extract 数组索引', () => {
    it('应提取数组元素 $.array[0]', () => {
      const data = { array: [10, 20, 30] };
      expect(JsonPathUtil.extract(data, '$.array[0]')).toBe(10);
      expect(JsonPathUtil.extract(data, '$.array[1]')).toBe(20);
      expect(JsonPathUtil.extract(data, '$.array[2]')).toBe(30);
    });

    it('数组索引越界时应返回 undefined', () => {
      const data = { array: [1, 2, 3] };
      expect(JsonPathUtil.extract(data, '$.array[5]')).toBeUndefined();
    });

    it('字段非数组时按索引访问应返回 undefined', () => {
      const data = { array: 'not an array' };
      expect(JsonPathUtil.extract(data, '$.array[0]')).toBeUndefined();
    });

    it('data 本身为数组时应支持索引访问', () => {
      const data = ['a', 'b', 'c'];
      expect(JsonPathUtil.extract(data, '$[0]')).toBe('a');
      expect(JsonPathUtil.extract(data, '$[2]')).toBe('c');
    });
  });

  // -------------------------------------------------------------
  // extract() — 通配符 *
  // -------------------------------------------------------------
  describe('extract 通配符', () => {
    it('通配符应映射数组所有元素 $.array[*]', () => {
      const data = { array: [1, 2, 3] };
      expect(JsonPathUtil.extract(data, '$.array[*]')).toEqual([1, 2, 3]);
    });

    it('通配符后接字段应映射每个元素的该字段', () => {
      const data = {
        sensors: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
          { name: 'c', value: 3 },
        ],
      };
      expect(JsonPathUtil.extract(data, '$.sensors[*].value')).toEqual([1, 2, 3]);
    });

    it('通配符作用于非数组时应返回 undefined', () => {
      const data = { array: 'not array' };
      expect(JsonPathUtil.extract(data, '$.array[*]')).toBeUndefined();
    });

    it('空数组的通配符应返回空数组', () => {
      const data = { array: [] };
      expect(JsonPathUtil.extract(data, '$.array[*]')).toEqual([]);
    });

    it('通配符元素为对象时应正确映射', () => {
      const data = {
        items: [{ x: 1 }, { x: 2 }, { x: 3 }],
      };
      expect(JsonPathUtil.extract(data, '$.items[*].x')).toEqual([1, 2, 3]);
    });
  });

  // -------------------------------------------------------------
  // extract() — 混合路径
  // -------------------------------------------------------------
  describe('extract 混合路径', () => {
    it('应支持 $.a[0].b[1].c 混合路径', () => {
      const data = {
        a: [
          {
            b: [{ c: 'first' }, { c: 'second' }],
          },
        ],
      };
      expect(JsonPathUtil.extract(data, '$.a[0].b[1].c')).toBe('second');
    });

    it('应支持通配符与索引混合 $.a[*].b[0]', () => {
      const data = {
        a: [{ b: [{ c: 1 }] }, { b: [{ c: 2 }] }],
      };
      expect(JsonPathUtil.extract(data, '$.a[*].b[0].c')).toEqual([1, 2]);
    });

    it('应支持连续索引 $.a[0][0]', () => {
      const data = {
        a: [
          [1, 2],
          [3, 4],
        ],
      };
      expect(JsonPathUtil.extract(data, '$.a[0][0]')).toBe(1);
      expect(JsonPathUtil.extract(data, '$.a[1][0]')).toBe(3);
      expect(JsonPathUtil.extract(data, '$.a[0][1]')).toBe(2);
    });
  });

  // -------------------------------------------------------------
  // extract() — 语法错误
  // -------------------------------------------------------------
  describe('extract 语法错误处理', () => {
    it('未闭合的 [ 应返回空（路径解析为空）', () => {
      const data = { array: [1, 2] };
      // 未闭合的 [ 会导致 parse 返回空数组，extract 返回 data 本身
      expect(JsonPathUtil.extract(data, '$.array[0')).toBe(data);
    });

    it('非数字索引应返回 data（解析失败）', () => {
      const data = { array: [1, 2] };
      // 非数字索引会导致 parse 返回空数组
      expect(JsonPathUtil.extract(data, '$.array[abc]')).toBe(data);
    });

    it('字段名包含点号应作为单独字段处理', () => {
      const data = { a: { b: 1 } };
      expect(JsonPathUtil.extract(data, '$.a.b')).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // extract() — 标量数据
  // -------------------------------------------------------------
  describe('extract 标量数据', () => {
    it('data 为字符串时按字段访问应返回 undefined', () => {
      expect(JsonPathUtil.extract('hello', '$.length')).toBeUndefined();
    });

    it('data 为数字时按字段访问应返回 undefined', () => {
      expect(JsonPathUtil.extract(42, '$.field')).toBeUndefined();
    });

    it('data 为布尔值时按字段访问应返回 undefined', () => {
      expect(JsonPathUtil.extract(true, '$.field')).toBeUndefined();
    });

    it('data 为字符串且路径为 $ 时应原样返回', () => {
      expect(JsonPathUtil.extract('hello', '$')).toBe('hello');
    });
  });
});
