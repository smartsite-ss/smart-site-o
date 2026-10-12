// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 简易 JSONPath 解析器（无外部依赖）
 *
 * 支持的语法：
 *  - `$.field`           根字段
 *  - `$.a.b.c`           嵌套字段
 *  - `$.array[0]`        数组索引
 *  - `$.array[*]`        数组通配符（返回所有元素映射结果数组）
 *  - `$.a[0].b[1].c`     混合路径
 *
 * 不支持：过滤器表达式 `?(@.price < 10)`、递归下降 `..`、切片 `[1:3]`。
 */

/** JSONPath 路径段（字段名 / 数组索引 / 通配符） */
type PathToken = string | number | '*';

export class JsonPathUtil {
  /**
   * 从 JSON 数据中按 JSONPath 提取值。
   *
   * @param data    已解析的 JSON 数据（对象/数组/标量）
   * @param jsonPath JSONPath 表达式，如 `$.sensors[0].value`
   * @returns 提取到的值；路径不存在时返回 `undefined`
   */
  static extract(data: unknown, jsonPath: string): unknown {
    if (data === null || data === undefined) return undefined;
    if (!jsonPath || typeof jsonPath !== 'string') return data;

    const tokens = JsonPathUtil.parse(jsonPath);
    if (tokens.length === 0) return data;

    return JsonPathUtil.evaluate(data, tokens);
  }

  /**
   * 将 JSONPath 字符串解析为路径段数组。
   *
   * `$.data[0].value` → `['data', 0, 'value']`
   * `$.array[*]`      → `['array', '*']`
   */
  private static parse(jsonPath: string): PathToken[] {
    let path = jsonPath.trim();

    // 去除前导 $ 和可选的 .
    if (path.startsWith('$')) {
      path = path.slice(1);
      if (path.startsWith('.')) {
        path = path.slice(1);
      }
    }

    if (!path) return [];

    const tokens: PathToken[] = [];
    let i = 0;

    while (i < path.length) {
      const ch = path[i];

      // 跳过分隔符
      if (ch === '.') {
        i++;
        continue;
      }

      // 数组访问 [index] 或 [*]
      if (ch === '[') {
        const closeIdx = path.indexOf(']', i);
        if (closeIdx === -1) return []; // 语法错误：未闭合的 [
        const inner = path.slice(i + 1, closeIdx).trim();

        if (inner === '*') {
          tokens.push('*');
        } else {
          const idx = parseInt(inner, 10);
          if (Number.isNaN(idx)) return []; // 语法错误：非数字索引
          tokens.push(idx);
        }
        i = closeIdx + 1;
        continue;
      }

      // 字段名：读取直到遇到 . 或 [
      let end = i;
      while (end < path.length && path[end] !== '.' && path[end] !== '[') {
        end++;
      }
      const field = path.slice(i, end).trim();
      if (field) tokens.push(field);
      i = end;
    }

    return tokens;
  }

  /**
   * 递归求值：按路径段依次访问数据。
   * 遇到通配符 `*` 时，对数组每个元素应用剩余路径段，返回结果数组。
   */
  private static evaluate(data: unknown, tokens: ReadonlyArray<PathToken>): unknown {
    if (tokens.length === 0) return data;
    if (data === null || data === undefined) return undefined;

    const [token, ...rest] = tokens;

    // 通配符：当前数据必须是数组
    if (token === '*') {
      if (!Array.isArray(data)) return undefined;
      return data.map((item) => JsonPathUtil.evaluate(item, rest));
    }

    // 数组索引
    if (typeof token === 'number') {
      if (!Array.isArray(data)) return undefined;
      return JsonPathUtil.evaluate(data[token], rest);
    }

    // 字段名
    if (typeof data !== 'object') return undefined;
    return JsonPathUtil.evaluate((data as Record<string, unknown>)[token], rest);
  }
}
