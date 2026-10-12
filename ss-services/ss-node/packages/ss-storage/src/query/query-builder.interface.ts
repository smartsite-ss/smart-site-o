// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { QueryOptions } from '../interfaces/storage-adapter.interface';

/**
 * 查询方言构建器契约：把统一语义的 QueryOptions 翻译成引擎查询语言。
 *
 * 各引擎实现：
 * - FluxQueryBuilder（InfluxDB 2，Flux）
 * - Influxdb3SqlQueryBuilder（InfluxDB 3 Core，DataFusion SQL）
 * - TdengineSqlQueryBuilder（TDengine，TDengine SQL 方言）
 *
 * @param options 统一查询语义
 * @param isolation 项目隔离单元（v2=bucket 名，v3/TDengine=database 名）
 */
export interface QueryBuilder {
  buildQuery(options: QueryOptions, isolation: { name: string }): string;
}
