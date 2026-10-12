// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 配置元数据注册表
// 定义所有系统配置项的元数据：分类、描述、默认值、敏感标识、重启要求等
// 用于前端 Web 配置页面展示与后端配置校验

/** 配置分类枚举 */
export type ConfigCategory =
  | 'application'
  | 'database'
  | 'security'
  | 'collection'
  | 'communication'
  | 'storage'
  | 'logging'
  | 'i18n'
  | 'monitoring';

/** 配置值类型 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'enum' | 'password';

/** 配置元数据接口 */
export interface ConfigMetadata {
  /** 配置键名（与 env 变量名一致，如 PORT、DATABASE_PATH） */
  key: string;
  /** 所属分类 */
  category: ConfigCategory;
  /** 描述（中文） */
  description: string;
  /** 默认值（字符串形式，便于 env 写入） */
  defaultValue?: string;
  /** 值类型 */
  type: ConfigValueType;
  /** enum 类型的可选值 */
  enumValues?: string[];
  /** 是否敏感（脱敏显示，加密存储） */
  sensitive: boolean;
  /** 是否允许 Web 端修改 */
  editable: boolean;
  /** 是否支持热更新（修改后立即生效） */
  hotReloadable: boolean;
  /** 修改后是否需要重启服务 */
  restartRequired: boolean;
  /** 是否写入 .env 文件（开发环境写入 .env.dev） */
  envFile: boolean;
  /** 输入校验规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/** 分类显示信息 */
export const CONFIG_CATEGORY_INFO: Record<
  ConfigCategory,
  { label: string; icon: string; order: number }
> = {
  application: { label: '应用配置', icon: 'app', order: 10 },
  database: { label: '数据库配置', icon: 'database', order: 20 },
  security: { label: '安全配置', icon: 'security', order: 30 },
  collection: { label: '采集配置', icon: 'plugin', order: 40 },
  communication: { label: '通信配置', icon: 'ws-monitor', order: 50 },
  storage: { label: '存储配置', icon: 'storage', order: 60 },
  logging: { label: '日志配置', icon: 'log', order: 70 },
  i18n: { label: '国际化配置', icon: 'i18n', order: 80 },
  monitoring: { label: '监控阈值', icon: 'health', order: 90 },
};

/** 配置元数据注册表 — 静态定义所有系统配置项 */
export const CONFIG_METADATA_REGISTRY: ConfigMetadata[] = [
  // ==================== application ====================
  {
    key: 'NODE_ENV',
    category: 'application',
    description: '运行模式（development/production）',
    defaultValue: 'development',
    type: 'enum',
    enumValues: ['development', 'production'],
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'APP_ENV',
    category: 'application',
    description: '环境标识（dev/pro）',
    defaultValue: 'dev',
    type: 'enum',
    enumValues: ['dev', 'pro'],
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'PORT',
    category: 'application',
    description: '后端服务监听端口',
    defaultValue: '4000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'AUTO_START_BASE_SERVICES',
    category: 'application',
    description: '启动时自动拉起 Redis/InfluxDB 等基础服务',
    defaultValue: 'false',
    type: 'boolean',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },

  // ==================== database ====================
  {
    key: 'DB_TYPE',
    category: 'database',
    description: '数据库类型',
    defaultValue: 'sqlite',
    type: 'enum',
    enumValues: ['sqlite', 'mysql'],
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'DATABASE_PATH',
    category: 'database',
    description: 'SQLite 数据文件路径',
    defaultValue: './data/db/ss-data.db',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'DATABASE_HOST',
    category: 'database',
    description: 'MySQL 主机地址（仅 DB_TYPE=mysql 时生效）',
    defaultValue: 'localhost',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'DATABASE_PORT',
    category: 'database',
    description: 'MySQL 端口（仅 DB_TYPE=mysql 时生效）',
    defaultValue: '3306',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'DATABASE_USER',
    category: 'database',
    description: 'MySQL 用户名（仅 DB_TYPE=mysql 时生效）',
    defaultValue: 'root',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'DATABASE_PASSWORD',
    category: 'database',
    description: 'MySQL 密码（仅 DB_TYPE=mysql 时生效）',
    type: 'password',
    sensitive: true,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'PROJECT_DB_MODE',
    category: 'database',
    description: '项目数据库模式（isolated: 每项目独立库 / unified: 共用全局库）',
    defaultValue: 'isolated',
    type: 'enum',
    enumValues: ['isolated', 'unified'],
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },

  // ==================== security ====================
  {
    key: 'JWT_SECRET',
    category: 'security',
    description: 'JWT 签名密钥（生产环境必须修改，建议至少 32 字符）',
    defaultValue: 'your-super-secret-jwt-key-change-this-in-production',
    type: 'password',
    sensitive: true,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { pattern: '.{16,}' },
  },
  {
    key: 'JWT_EXPIRES_IN',
    category: 'security',
    description:
      'JWT Token 默认有效期（JwtModule signOptions 默认值，auth.service 使用独立的 ACCESS/REFRESH 过期时间覆盖此值）',
    defaultValue: '7d',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
  },
  {
    key: 'JWT_ACCESS_EXPIRES_IN',
    category: 'security',
    description: 'Access Token 有效期（如 15m, 30m, 1h）',
    defaultValue: '15m',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'JWT_REFRESH_EXPIRES_IN',
    category: 'security',
    description: 'Refresh Token 有效期（如 7d, 30d, 90d）',
    defaultValue: '7d',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'SYSTEM_CONFIG_ENCRYPTION_KEY',
    category: 'security',
    description: '系统配置加密密钥（用于敏感配置 AES-256-GCM 加密）',
    defaultValue: 'ss-v7-default-encryption-key-32b',
    type: 'password',
    sensitive: true,
    editable: false,
    hotReloadable: false,
    restartRequired: true,
    envFile: false,
  },

  // ==================== collection ====================
  {
    key: 'DEFAULT_SCAN_RATE',
    category: 'collection',
    description: '默认采集扫描频率（毫秒）',
    defaultValue: '1000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: false,
    validation: { min: 100, max: 86400000 },
  },
  {
    key: 'MAX_BATCH_SIZE',
    category: 'collection',
    description: '采集批量最大标签数',
    defaultValue: '500',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: false,
    validation: { min: 1, max: 10000 },
  },
  {
    key: 'RETRY_COUNT',
    category: 'collection',
    description: '采集失败重试次数',
    defaultValue: '3',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: false,
    validation: { min: 0, max: 100 },
  },
  {
    key: 'RETRY_INTERVAL_MS',
    category: 'collection',
    description: '采集失败重试间隔（毫秒）',
    defaultValue: '1000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: false,
    validation: { min: 100, max: 60000 },
  },

  // ==================== communication ====================
  {
    key: 'MQTT_BROKER_URL',
    category: 'communication',
    description: 'MQTT Broker 连接 URL',
    defaultValue: 'mqtt://localhost:1883',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'OPCUA_SERVER_URL',
    category: 'communication',
    description: 'OPC UA Server 连接 URL',
    defaultValue: 'opc.tcp://localhost:4840',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'MODBUS_TCP_HOST',
    category: 'communication',
    description: 'Modbus TCP 默认主机',
    defaultValue: 'localhost',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'MODBUS_TCP_PORT',
    category: 'communication',
    description: 'Modbus TCP 默认端口',
    defaultValue: '502',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'RATE_LIMIT_MAX',
    category: 'communication',
    description: 'API 限流最大请求数（每窗口期）',
    defaultValue: '6000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 1000000 },
  },

  // ==================== storage ====================
  {
    key: 'INFLUXDB_URL',
    category: 'storage',
    description: 'InfluxDB 连接 URL',
    defaultValue: 'http://localhost:8086',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'INFLUXDB_TOKEN',
    category: 'storage',
    description: 'InfluxDB 访问 Token',
    type: 'password',
    sensitive: true,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'INFLUXDB_ORG',
    category: 'storage',
    description: 'InfluxDB 组织名',
    defaultValue: 'ss-org',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'INFLUXDB_BUCKET',
    category: 'storage',
    description: 'InfluxDB 默认 Bucket',
    defaultValue: 'ss_node_data',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
  },
  {
    key: 'INFLUXDB_BATCH_SIZE',
    category: 'storage',
    description: 'InfluxDB 批量写入大小',
    defaultValue: '1000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 1, max: 100000 },
  },
  {
    key: 'INFLUXDB_FLUSH_INTERVAL',
    category: 'storage',
    description: 'InfluxDB 刷新间隔（毫秒）',
    defaultValue: '5000',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 100, max: 3600000 },
  },

  // ==================== logging ====================
  {
    key: 'LOG_LEVEL',
    category: 'logging',
    description: '日志级别',
    defaultValue: 'debug',
    type: 'enum',
    enumValues: ['error', 'warn', 'info', 'debug'],
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
  },
  {
    key: 'LOG_MAX_SIZE',
    category: 'logging',
    description: '单个日志文件最大大小（如 100m, 1g）',
    defaultValue: '100m',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'LOG_MAX_FILES',
    category: 'logging',
    description: '日志文件最大保留数量',
    defaultValue: '10',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 1000 },
  },

  // ==================== i18n ====================
  {
    key: 'I18N_FALLBACK_LANGUAGE',
    category: 'i18n',
    description: '默认语言（客户端未指定时使用）',
    defaultValue: 'zh-CN',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
  },
  {
    key: 'I18N_SUPPORTED_LANGUAGES',
    category: 'i18n',
    description: '支持的语言列表（逗号分隔）',
    defaultValue: 'zh-CN,en-US,zh-TW',
    type: 'string',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'I18N_WATCH',
    category: 'i18n',
    description: '开发环境是否监听翻译文件变化（热重载）',
    defaultValue: 'true',
    type: 'boolean',
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
  },
  {
    key: 'I18N_RESPONSE_HEADER',
    category: 'i18n',
    description: '是否在响应头中返回当前语言信息',
    defaultValue: 'false',
    type: 'boolean',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
  },

  // ==================== monitoring ====================
  {
    key: 'MEMORY_WARN_PERCENT',
    category: 'monitoring',
    description: '内存使用率预警阈值（%）',
    defaultValue: '70',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 1, max: 100 },
  },
  {
    key: 'MEMORY_CRITICAL_PERCENT',
    category: 'monitoring',
    description: '内存使用率严重阈值（%）',
    defaultValue: '85',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 1, max: 100 },
  },
  {
    key: 'DISK_WARN_PERCENT',
    category: 'monitoring',
    description: '磁盘使用率预警阈值（%）',
    defaultValue: '70',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 1, max: 100 },
  },
  {
    key: 'DISK_CRITICAL_PERCENT',
    category: 'monitoring',
    description: '磁盘使用率严重阈值（%）',
    defaultValue: '85',
    type: 'number',
    sensitive: false,
    editable: true,
    hotReloadable: true,
    restartRequired: false,
    envFile: true,
    validation: { min: 1, max: 100 },
  },
];

/** 待重启清单的持久化键名 */
export const PENDING_RESTART_KEY = '__pending_restart__';

/** 元数据查询工具函数 */
export class ConfigMetadataHelper {
  private static keyMap: Map<string, ConfigMetadata> | null = null;

  /** 根据 key 获取元数据 */
  static getByKey(key: string): ConfigMetadata | undefined {
    if (!this.keyMap) {
      this.keyMap = new Map();
      for (const meta of CONFIG_METADATA_REGISTRY) {
        this.keyMap.set(meta.key, meta);
      }
    }
    return this.keyMap.get(key);
  }

  /** 获取所有元数据，按分类与顺序排序 */
  static getAll(): ConfigMetadata[] {
    return [...CONFIG_METADATA_REGISTRY].sort((a, b) => {
      const orderA = CONFIG_CATEGORY_INFO[a.category].order;
      const orderB = CONFIG_CATEGORY_INFO[b.category].order;
      if (orderA !== orderB) return orderA - orderB;
      return a.key.localeCompare(b.key);
    });
  }

  /** 按分类分组 */
  static groupByCategory(): Record<ConfigCategory, ConfigMetadata[]> {
    const result = {} as Record<ConfigCategory, ConfigMetadata[]>;
    for (const meta of CONFIG_METADATA_REGISTRY) {
      if (!result[meta.category]) result[meta.category] = [];
      result[meta.category].push(meta);
    }
    return result;
  }

  /** 获取需重启的配置 key 列表 */
  static getRestartRequiredKeys(): string[] {
    return CONFIG_METADATA_REGISTRY.filter((m) => m.restartRequired).map((m) => m.key);
  }

  /** 校验输入值 */
  static validateValue(meta: ConfigMetadata, value: string): { valid: boolean; error?: string } {
    if (!meta.editable) {
      return { valid: false, error: '该配置项不允许 Web 端修改' };
    }

    // enum 校验
    if (meta.type === 'enum' && meta.enumValues) {
      if (!meta.enumValues.includes(value)) {
        return { valid: false, error: `值必须是 ${meta.enumValues.join(' / ')} 之一` };
      }
    }

    // number 校验
    if (meta.type === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        return { valid: false, error: '值必须是数字' };
      }
      if (meta.validation?.min !== undefined && num < meta.validation.min) {
        return { valid: false, error: `值不能小于 ${meta.validation.min}` };
      }
      if (meta.validation?.max !== undefined && num > meta.validation.max) {
        return { valid: false, error: `值不能大于 ${meta.validation.max}` };
      }
    }

    // boolean 校验
    if (meta.type === 'boolean') {
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return { valid: false, error: '值必须是 true 或 false' };
      }
    }

    // pattern 校验
    if (meta.validation?.pattern) {
      const regex = new RegExp(meta.validation.pattern);
      if (!regex.test(value)) {
        return { valid: false, error: `值格式不匹配规则：${meta.validation.pattern}` };
      }
    }

    return { valid: true };
  }
}
