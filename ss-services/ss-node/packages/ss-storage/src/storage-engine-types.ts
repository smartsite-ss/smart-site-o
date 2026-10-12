// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 存储引擎类型注册表（字符串常量表，替代原固定枚举）。
 *
 * 新增一个时序库 / 数据源引擎时只需：
 * 1. 在此表增加引擎类型；
 * 2. 实现 StorageAdapter 并在模块装配处注册；
 * 3. 通过 STORAGE_DEFAULT_ENGINE / 项目级覆盖路由。
 *
 * 命名规范：配置名用全称（influxdb2 / influxdb3），不用 i2/i3 缩写。
 */
export const STORAGE_ENGINE_TYPES = {
  INFLUXDB2: 'influxdb2',
  INFLUXDB3: 'influxdb3',
  TDENGINE: 'tdengine',
  SQLITE: 'sqlite',
  MYSQL: 'mysql',
  // 未来扩展：IOTDB / VICTORIAMETRICS / FILE 等
} as const;

export type StorageEngineType = (typeof STORAGE_ENGINE_TYPES)[keyof typeof STORAGE_ENGINE_TYPES];

/**
 * 存量别名兼容表：历史配置中的 'influxdb' 统一归一化为 'influxdb2'，避免存量配置失效。
 */
const STORAGE_ENGINE_TYPE_ALIASES: Readonly<Record<string, StorageEngineType>> = {
  influxdb: STORAGE_ENGINE_TYPES.INFLUXDB2,
};

/**
 * 校验字符串是否为已注册的引擎类型（先做别名归一化）。
 * @returns 归一化后的合法引擎类型；未注册返回 null。
 */
export function resolveStorageEngineType(candidate: string): StorageEngineType | null {
  const normalized = candidate.trim().toLowerCase();
  const aliased = STORAGE_ENGINE_TYPE_ALIASES[normalized] ?? normalized;
  const registeredTypes = Object.values(STORAGE_ENGINE_TYPES) as readonly string[];
  return registeredTypes.includes(aliased) ? (aliased as StorageEngineType) : null;
}
