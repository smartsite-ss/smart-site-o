// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 后端 MCP 工具工厂 — P2-T01
 *
 * 为 AgentOrchestratorService 提供真实后端工具实现。
 * 工具通过工厂函数创建，接收具体服务引用作为参数（避免 ss-core 直接依赖业务包）。
 *
 * 工具清单（17 组）：
 *   data_query       — 数据标签时间范围查询
 *   data_aggregate   — 数据聚合（avg/max/min/sum/count）
 *   device_getStatus — 设备状态总览
 *   device_getHistory — 设备历史数据查询
 *   alarm_getHistory — 报警历史记录
 *   knowledge_search — 知识库搜索
 *   system_getHealth — 系统健康检查
 *   template_list    — 查询可用设备模板列表
 *   template_detail  — 查询模板详情（含变量定义）
 *   template_create  — 创建新的采集变量模板
 *   driver_list      — 查询可用采集驱动及连接配置模板
 *   device_create    — 在项目中创建新设备（从模板实例化）
 *   dict_list        — 查询字典分类树
 *   dict_detail      — 查询字典表详情（含条目）
 *   dict_create      — 创建数据字典表
 *   dict_addItems    — 向字典表追加条目
 *   dict_search      — 跨字典表搜索条目
 *
 * 用法（在 app 层注入真实服务）：
 *   import { createAllBackendTools } from '@ss-node/ss-core/ai/backend-tools';
 *   const tools = createAllBackendTools({
 *     deviceService, alarmService, dataQueryService, knowledgeService, healthService, alarmStatisticsService,
 *   });
 *   tools.forEach(t => orchestrator.registerTool(t));
 */

/** 工具执行所需的最小服务接口 */
export interface BackendToolServices {
  /** 设备管理服务 */
  deviceService?: {
    getDeviceStats: (projectId: string) => Promise<{
      total: number;
      online: number;
      offline: number;
      connecting: number;
      degraded: number;
      error: number;
      totalTags: number;
    }>;
    findAll: (
      projectId: string,
      query?: Record<string, unknown>,
    ) => Promise<{
      data: Array<{
        id: string;
        deviceName: string;
        type: string;
        status?: string;
        groupId?: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
      pagination: { total: number };
    }>;
    findOne: (
      id: string,
      projectId: string,
    ) => Promise<{
      id: string;
      deviceName: string;
      type: string;
      status?: string;
    }>;
  };
  /** 报警管理服务 */
  alarmService?: {
    getRecords: (
      projectId: string,
      limit?: number,
    ) => Promise<
      Array<{
        id: string;
        rule?: { name: string };
        level: string;
        status: string;
        triggerValue: number;
        createdAt: Date;
      }>
    >;
    getRules?: (projectId: string) => Promise<
      Array<{
        id: string;
        name: string;
        tagId: string;
        level: string;
        condition: string;
        conditionValue: unknown;
        enabled: boolean;
        debounceMs?: number;
        debounceCount?: number;
      }>
    >;
    createRule?: (
      projectId: string,
      dto: {
        name: string;
        tagId: string;
        level: string;
        condition: string;
        conditionValue: unknown;
        description?: string;
        debounceMs?: number;
        debounceCount?: number;
      },
    ) => Promise<{ id: string; name: string }>;
    addSuppressionRule?: (
      projectId: string,
      dto: {
        type: string;
        parentRuleId?: string;
        childRuleIds?: string[];
        devices?: string[];
        duration?: number;
      },
    ) => Promise<{ id: string }>;
  };
  /** 数据查询服务 */
  dataQueryService?: {
    queryTimeRange: (query: {
      tagId: string;
      startTime: Date;
      endTime: Date;
      page?: number;
      pageSize?: number;
    }) => Promise<{
      data: Array<{ tagId: string; numericValue: number; timestamp: Date }>;
      total: number;
    }>;
    aggregate: (
      tagId: string,
      startTime: Date,
      endTime: Date,
      type: string,
    ) => Promise<{ aggregation: string; value: number; tagId: string }>;
    getTagStats: (
      tagId: string,
      startTime: Date,
      endTime: Date,
    ) => Promise<{
      avg: number;
      max: number;
      min: number;
      sum: number;
      count: number;
      tagId: string;
    }>;
    queryTrend?: (params: {
      tagIds: string[];
      startTime: string;
      endTime: string;
      maxPoints?: number;
      interpolation?: string;
      interval?: number;
      projectId?: string;
    }) => Promise<{
      data: Array<{ tagId: string; data: Array<{ timestamp: string; value: number }> }>;
    }>;
    exportTrend?: (
      tagIds: string[],
      startTime: string,
      endTime: string,
      projectId: string,
      format: string,
    ) => Promise<{ filePath: string; fileName: string }>;
  };
  /** 知识库服务 */
  knowledgeService?: {
    search: (
      query: string,
      product?: string,
      lang?: string,
    ) => Promise<Array<{ title: string; snippet: string; module: string; score?: number }>>;
  };
  /** 健康检查服务 */
  healthService?: {
    getDetailed: () => Promise<{
      status: string;
      uptime: number;
      database?: { status?: string };
      memory?: { total: number; free: number; used: number; usagePercent: number };
      disks?: { appDir?: { usedBytes: number; totalBytes: number; usagePercent: number } };
      cpuLoad?: number[];
    }>;
  };
  /** 报警统计服务 */
  alarmStatisticsService?: {
    getStatistics: (projectId: string) => Promise<{
      total: number;
      active: number;
      acknowledged: number;
      cleared: number;
      shelved: number;
      byLevel: Record<string, number>;
      byStatus: Record<string, number>;
    }>;
  };
  /** 设备模板管理服务 */
  templateService?: {
    findAll: (query?: { deviceType?: string; keyword?: string; pageSize?: number }) => Promise<{
      data: Array<{
        id: string;
        name: string;
        deviceType: string;
        version: string;
        description?: string;
        variables?: Array<{
          name: string;
          label: string;
          address: string;
          dataType: string;
          unit?: string;
        }>;
        variableCount?: number;
      }>;
      pagination: { total: number };
    }>;
    findById: (id: string) => Promise<{
      id: string;
      name: string;
      deviceType: string;
      version: string;
      description?: string;
      variables: Array<{
        name: string;
        label: string;
        address: string;
        dataType: string;
        readWrite: string;
        unit?: string;
        scale?: number;
        offset?: number;
        deadband?: number;
        description?: string;
      }>;
    }>;
    create: (
      dto: {
        name: string;
        deviceType: string;
        description?: string;
        industry?: string;
        category?: string;
        variables?: Array<{
          name: string;
          label: string;
          address: string;
          dataType: string;
          readWrite?: string;
          unit?: string;
          description?: string;
        }>;
      },
      authorId: string,
    ) => Promise<{ id: string; name: string; version: string; variableCount: number }>;
  };
  /** 数据字典服务 */
  dictService?: {
    getAllCategories: (locale?: string) => Array<{
      category: string;
      tables: Array<{
        dictId: string;
        dictName: string;
        version: string;
        itemCount: number;
      }>;
    }>;
    getDict: (
      dictId: string,
      locale?: string,
    ) =>
      | {
          dictId: string;
          dictName: string;
          category: string;
          description: string;
          version: string;
          items: Array<{
            value: string;
            label: string;
            sortOrder: number;
            description: string;
          }>;
        }
      | undefined;
    createTable: (
      locale: string,
      category: string,
      table: {
        dictId: string;
        dictName: string;
        category: string;
        description?: string;
        version?: string;
        sortOrder?: number;
        items: Array<{
          value: string;
          label: string;
          sortOrder?: number;
          description?: string;
        }>;
      },
    ) => void;
    updateTable: (
      locale: string,
      category: string,
      dictId: string,
      table: Partial<{
        dictName: string;
        description: string;
        version: string;
        items: Array<{
          value: string;
          label: string;
          sortOrder: number;
          description: string;
        }>;
      }>,
    ) => void;
    getAllDicts: (locale?: string) => Array<{
      dictId: string;
      dictName: string;
      category: string;
      description: string;
      version: string;
      items: Array<{ value: string; label: string; sortOrder: number; description: string }>;
    }>;
  };
  /** 设备创建服务 */
  deviceCreateService?: {
    createDevice: (
      dto: {
        deviceName: string;
        deviceCode: string;
        templateId: string;
        driver: string;
        connection: Record<string, unknown>;
        scanRate?: number;
        groupId?: string;
        description?: string;
      },
      projectId: string,
    ) => Promise<{
      id: string;
      deviceName: string;
      deviceCode: string;
      driver: string;
      templateId: string;
      status: string;
      createdAt: Date;
    }>;
  };
  /** 外部数据库连接服务 */
  dbConnectionService?: {
    findAll: (projectId: string) => Promise<
      Array<{
        id: string;
        name: string;
        dbType: string;
        host: string;
        port: number;
        database: string;
        enabled: boolean;
        createdAt: Date;
      }>
    >;
    create: (
      projectId: string,
      dto: {
        name: string;
        dbType: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        options?: string;
      },
    ) => Promise<{ id: string; name: string }>;
    test: (
      projectId: string,
      id: string,
    ) => Promise<{ success: boolean; latency: number; error?: string }>;
    getTables: (projectId: string, id: string) => Promise<string[]>;
    getColumns: (
      projectId: string,
      id: string,
      tableName: string,
    ) => Promise<Array<{ name: string; type: string }>>;
    executeQuery: (projectId: string, id: string, sql: string) => Promise<unknown[]>;
  };
  /** 项目管理服务 */
  projectService?: {
    findAll: (
      userId: string,
      query?: { page?: number; pageSize?: number; keyword?: string },
    ) => Promise<{
      data: Array<{
        projectId: string;
        projectName: string;
        description: string;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: { total: number; page: number; pageSize: number; totalPages: number };
    }>;
    findOne: (
      id: string,
      userId: string,
    ) => Promise<{
      projectId: string;
      projectName: string;
      description: string;
      version: string;
      createdAt: string;
      updatedAt: string;
      config: Record<string, unknown>;
    }>;
    exportProjectZip: (
      projectId: string,
      userId: string,
      options?: { includePages?: boolean; includeProjectDb?: boolean; includeRtdb?: boolean },
    ) => Promise<{ filePath: string; projectName: string; fileName: string }>;
    importProjectZip: (
      filePath: string,
      userId: string,
      overwrite?: boolean,
    ) => Promise<{ data: { projectId: string; projectName: string }; warnings: string[] }>;
    getManageInfo: (projectId: string) => Promise<{
      projectName: string;
      projectId: string;
      tenantId: string;
      pageCount: number;
      dbSize: number;
      rtdbSize: number;
      dbMode: string;
    }>;
    diagnose: (
      projectId: string,
    ) => Promise<{ health: string; resources: Record<string, string>; issues: string[] }>;
    initResources: (
      projectId: string,
      resources?: string[],
    ) => Promise<{
      health: string;
      resources: Record<string, string>;
      issues: string[];
      initialized: string[];
      skipped: string[];
    }>;
  };
  /** 报表服务 */
  reportService?: {
    generateDailyReport: (projectId: string, date: string) => Promise<Record<string, unknown>>;
    generateMonthlyReport: (projectId: string, month: string) => Promise<Record<string, unknown>>;
    generateCustomReport: (
      projectId: string,
      config: {
        startDate: string;
        endDate: string;
        metrics?: string[];
        tagIds?: string[];
      },
    ) => Promise<Record<string, unknown>>;
    generateAlarmReport: (
      projectId: string,
      config: { startDate: string; endDate: string; levels?: string[] },
    ) => Promise<Record<string, unknown>>;
    generateTrendReport: (
      projectId: string,
      config: { startDate: string; endDate: string; tagIds: string[] },
    ) => Promise<Record<string, unknown>>;
    exportReport: (reportId: string, format: string) => Promise<Record<string, unknown>>;
    queryReports: (
      projectId: string,
      query: { type?: string; page?: number; pageSize?: number },
    ) => Promise<{ data: Record<string, unknown>[]; pagination: Record<string, number> }>;
    saveReportConfig: (
      projectId: string,
      config: { name: string; description?: string; config: Record<string, unknown> },
    ) => Promise<Record<string, unknown>>;
    getSchedules: (projectId: string) => Promise<Array<Record<string, unknown>>>;
    createSchedule: (
      projectId: string,
      schedule: {
        templateId: string;
        cronExpression: string;
        exportFormat: string;
        enabled?: boolean;
      },
    ) => Promise<Record<string, unknown>>;
  };
  /** 数据标签服务 */
  datatagService?: {
    findAll: (
      projectId: string,
      query: {
        deviceId?: string;
        q?: string;
        page?: number;
        pageSize?: number;
      },
    ) => Promise<{
      data: Array<{
        id: string;
        name: string;
        dataType: string;
        deviceId: string;
        unit?: string;
        enabled: boolean;
        scanRate?: number;
      }>;
      total: number;
    }>;
    update: (id: string, dto: Record<string, unknown>) => Promise<{ id: string; name: string }>;
    batchUpdate: (
      ids: string[],
      dto: Record<string, unknown>,
    ) => Promise<Array<{ id: string; name: string }>>;
  };
  /** 脚本服务 */
  scriptService?: {
    getApiFunctions: () => Promise<
      Array<{ name: string; description: string; parameters: unknown[] }>
    >;
    create: (dto: {
      name: string;
      code: string;
      triggerType: string;
      cronExpression?: string;
      projectId: string;
      enabled?: boolean;
    }) => Promise<{ id: string; name: string }>;
    executeScript: (
      id: string,
      projectId: string,
    ) => Promise<{ success: boolean; logs: string[]; result?: unknown; error?: string }>;
  };

  // ============================================================
  // 阶段 2 新增服务（30 个运维管理工具）
  // ============================================================

  /** 用户管理服务（用户权限管理 5 工具） */
  userService?: {
    findAll: (query?: Record<string, unknown>) => Promise<any[]>;
    adminCreateUser: (dto: Record<string, unknown>) => Promise<any>;
    adminUpdateUser: (id: string, dto: Record<string, unknown>) => Promise<any>;
    toggleUserStatus: (id: string, isActive: boolean) => Promise<any>;
    resetPassword: (id: string) => Promise<{ password?: string; tempPassword?: string }>;
    deleteUser: (id: string) => Promise<void>;
    assignRole: (id: string, roleId: string) => Promise<any>;
  };
  /** 角色与授权服务 */
  roleService?: {
    findAll: () => Promise<any[]>;
    findById: (id: string) => Promise<any>;
    create: (dto: Record<string, unknown>) => Promise<any>;
    update: (id: string, dto: Record<string, unknown>) => Promise<any>;
    delete: (id: string) => Promise<void>;
    getProjectAuths: (roleId: string) => Promise<any[]>;
    setProjectAuths: (roleId: string, auths: any[]) => Promise<void>;
    getDeviceAuths: (roleId: string, projectId: string) => Promise<any[]>;
    setDeviceAuths: (roleId: string, projectId: string, auths: any[]) => Promise<void>;
  };
  /** 会话管理服务 */
  sessionService?: {
    getUserSessions: (userId: string) => any[];
    forceLogout: (sessionId: string) => boolean;
    logoutAllExcept: (userId: string, currentSessionId: string) => number;
    getLoginHistory: (userId: string) => any[];
  };
  /** 审计日志服务 */
  auditLogService?: {
    query: (query: Record<string, unknown>) => Promise<any>;
    getStats: () => Promise<any>;
    cleanupExpired: () => Promise<number>;
  };
  /** 菜单管理服务 */
  menuService?: {
    getMenu: (subsystem?: string) => Promise<any[]>;
    createMenuItem: (item: any, parentId?: string | null) => Promise<void>;
    updateMenuItem: (id: string, item: any, parentId?: string) => Promise<void>;
    deleteMenuItem: (id: string) => Promise<void>;
    getMenuButtons: () => Promise<any[]>;
    updateMenuButtons: (buttons: any[]) => Promise<void>;
  };

  /** 设备运维服务（设备运维管理 6 工具） */
  deviceOpsService?: {
    update: (id: string, dto: Record<string, unknown>, projectId: string) => Promise<any>;
    remove: (id: string, projectId: string) => Promise<void>;
    moveDevice: (id: string, targetGroupId: string | null, projectId: string) => Promise<any>;
    writeTagValue: (deviceId: string, tagId: string, value: any, projectId: string) => Promise<any>;
  };
  /** 设备分组服务 */
  deviceGroupService?: {
    getGroups: (projectId: string) => Promise<any[]>;
    getGroupTree: (projectId: string) => Promise<any[]>;
    createGroup: (projectId: string, dto: Record<string, unknown>) => Promise<any>;
    updateGroup: (projectId: string, groupId: string, dto: Record<string, unknown>) => Promise<any>;
    deleteGroup: (projectId: string, groupId: string) => Promise<void>;
  };
  /** 设备诊断服务 */
  deviceDiagnosticService?: {
    ping: (deviceId: string, host: string, port: number) => Promise<any>;
    readTag: (deviceId: string, params: Record<string, unknown>) => Promise<any>;
    writeTag: (deviceId: string, params: Record<string, unknown>) => Promise<any>;
    scanAddresses: (deviceId: string, params: Record<string, unknown>) => Promise<any>;
    runDiagnostic: (
      deviceId: string,
      action: string,
      params: Record<string, unknown>,
    ) => Promise<any>;
  };

  /** 报警处理服务（报警处理与运维 7 工具） */
  alarmOpsService?: {
    acknowledge: (recordId: string, userId: string, projectId: string) => Promise<any>;
    batchAcknowledge: (ids: string[], userId: string, projectId: string) => Promise<any>;
    clear: (recordId: string, userId: string, projectId: string) => Promise<any>;
    shelve: (recordId: string, duration: number, userId: string, projectId: string) => Promise<any>;
    getStatistics: (projectId: string) => Promise<any>;
    toggleRule: (ruleId: string, enabled: boolean, projectId: string) => Promise<any>;
    getSuppressionRules: (projectId: string) => Promise<any[]>;
  };

  /** 采集插件管理服务（采集器与服务运维 7 工具） */
  pluginManagerService?: {
    listPlugins: (query?: Record<string, unknown>) => Promise<any[]>;
    activate: (protocol: string) => Promise<any>;
    deactivate: (protocol: string) => Promise<any>;
    getPluginStatus: (protocol: string) => any;
    healthCheck: () => Promise<any>;
    hotReload: (protocol: string) => Promise<any>;
    rollback: (protocol: string) => Promise<any>;
    getMonitorData: (protocol: string) => Promise<any>;
    validateChannelConfig: (protocol: string, config: any) => Promise<any>;
    getPluginConfig: (protocol: string) => any;
    updatePluginConfig: (protocol: string, config: any) => Promise<any>;
  };
  /** Pipeline 诊断服务 */
  pipelineDiagService?: {
    getMetricsSnapshot: () => any;
    getStepTimingStats: () => any;
    getTimingBreakdowns: (limit: number) => any[];
    getDiagnosticInfo: () => any;
  };
  /** 离线缓存服务 */
  offlineCacheService?: {
    getBufferStats: () => any;
    flush: (maxBatch?: number) => Promise<any[]>;
    clear: () => void;
  };
  /** 采集器诊断服务 */
  collectorDiagService?: {
    runFullDiagnosis: (deviceId?: string) => Promise<any>;
    checkTagReadability: (tagId: string) => Promise<any>;
    checkPluginHealth: (protocol: string) => Promise<any>;
  };

  /** 基础服务管理（采集器运维 + 数据治理 共用） */
  baseServicesService?: {
    getAllStatus: () => Promise<any[]>;
    getStatus: (name: string) => Promise<any>;
    start: (name: string) => Promise<any>;
    stop: (name: string) => Promise<any>;
    restart: (name: string) => Promise<any>;
    getLogs: (name: string, limit: number) => Promise<any>;
  };
  /** InfluxDB 管理服务 */
  influxAdminService?: {
    checkSetupStatus: () => Promise<any>;
    checkHealth: () => Promise<any>;
    getConfig: () => Promise<any>;
    listBuckets: () => Promise<any[]>;
    setup: (options?: Record<string, unknown>) => Promise<any>;
  };
  /** 系统配置管理服务 */
  systemConfigService?: {
    getAllWithMeta: () => Promise<any[]>;
    get: (key: string) => Promise<any>;
    setWithMeta: (key: string, value: string, options?: Record<string, unknown>) => Promise<any>;
    getRestartRequired: () => Promise<string[]>;
    triggerRestart: (username: string) => Promise<any>;
    getRestartStatus: () => Promise<any>;
  };

  /** 数据导出服务（数据治理与备份 5 工具） */
  dataExportService?: {
    exportCsv: (
      tagId: string,
      startTime: Date,
      endTime: Date,
    ) => Promise<{ csv: string; filename: string }>;
    exportJson: (
      tagId: string,
      startTime: Date,
      endTime: Date,
    ) => Promise<{ json: string; filename: string }>;
    exportBatchJson: (
      tagIds: string[],
      startTime: Date,
      endTime: Date,
      projectId?: string,
    ) => Promise<{ json: string; filename: string }>;
    exportToResult: (
      filters: Record<string, unknown>,
    ) => Promise<{ filename: string; data: string | Buffer; rowCount: number }>;
  };
  /** 数据库维护服务 */
  databaseService?: {
    getAllDatabasesStatus: () => Promise<any>;
    checkSystemIntegrity: () => Promise<any>;
    checkProjectIntegrity: (projectName: string) => Promise<any>;
    vacuumSystem: () => Promise<any>;
    vacuumProject: (projectName: string) => Promise<any>;
  };
  /** 备份管理服务 */
  backupService?: {
    listBackups: (dbType?: string) => Promise<any[]>;
    getBackupStats: () => Promise<any>;
    getBackupLogs: (query: Record<string, unknown>) => Promise<any[]>;
    createSystemBackup: (backupType: string, operator: string) => Promise<any>;
    createProjectBackup: (
      projectName: string,
      backupType: string,
      operator: string,
    ) => Promise<any>;
    deleteBackup: (filename: string) => Promise<void>;
    restoreBackup: (filename: string) => Promise<void>;
    restoreProjectBackup: (filename: string, projectName: string) => Promise<void>;
    cleanupExpired: (dbType: string, days: number) => Promise<number>;
    getBackupConfig: () => Promise<any>;
    saveBackupConfig: (config: any) => Promise<any>;
  };
}

// ============================================================
// 工具参数/返回类型定义
// ============================================================

interface BackendToolParam {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface BackendToolDef {
  name: string;
  description: string;
  category: string;
  params: BackendToolParam[];
  frontend: boolean;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

// ============================================================
// 工具工厂
// ============================================================

/** 1. data_query — 数据标签时间范围查询 */
export function createDataQueryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataQueryService) return null;

  return {
    name: 'data_query',
    description: '查询指定数据标签在时间范围内的历史数据。返回包含时间戳和数值的记录列表。',
    category: 'data',
    frontend: false,
    params: [
      { name: 'tagId', type: 'string', description: '数据标签 ID', required: true },
      {
        name: 'startTime',
        type: 'string',
        description: '开始时间（ISO 8601 格式）',
        required: true,
      },
      { name: 'endTime', type: 'string', description: '结束时间（ISO 8601 格式）', required: true },
      { name: 'pageSize', type: 'number', description: '每页记录数（默认 50）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagId, startTime, endTime, pageSize } = params;
      try {
        const result = await services.dataQueryService!.queryTimeRange({
          tagId: String(tagId),
          startTime: new Date(String(startTime)),
          endTime: new Date(String(endTime)),
          pageSize: typeof pageSize === 'number' ? pageSize : 50,
        });
        const records = result.data.slice(0, 20).map((d) => ({
          value: d.numericValue,
          time: d.timestamp,
        }));
        return JSON.stringify({
          success: true,
          tagId: String(tagId),
          total: result.total,
          records,
          hint:
            records.length < result.total
              ? `显示前 ${records.length} 条，共 ${result.total} 条`
              : undefined,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 2. data_aggregate — 数据聚合 */
export function createDataAggregateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataQueryService) return null;

  return {
    name: 'data_aggregate',
    description:
      '对数据标签进行聚合查询。支持 avg（平均值）、max（最大值）、min（最小值）、sum（总和）、count（计数）。',
    category: 'data',
    frontend: false,
    params: [
      { name: 'tagId', type: 'string', description: '数据标签 ID', required: true },
      {
        name: 'startTime',
        type: 'string',
        description: '开始时间（ISO 8601 格式）',
        required: true,
      },
      { name: 'endTime', type: 'string', description: '结束时间（ISO 8601 格式）', required: true },
      {
        name: 'type',
        type: 'string',
        description: '聚合类型（avg/max/min/sum/count）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagId, startTime, endTime, type } = params;
      const aggType = String(type).toLowerCase();
      if (!['avg', 'max', 'min', 'sum', 'count'].includes(aggType)) {
        return JSON.stringify({
          success: false,
          error: `不支持的聚合类型: ${aggType}，请使用 avg/max/min/sum/count`,
        });
      }
      try {
        const result = await services.dataQueryService!.aggregate(
          String(tagId),
          new Date(String(startTime)),
          new Date(String(endTime)),
          aggType,
        );
        return JSON.stringify({
          success: true,
          tagId: result.tagId,
          type: result.aggregation,
          value: result.value,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 3. device_getStatus — 设备状态总览 */
export function createDeviceStatusTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceService) return null;

  return {
    name: 'device_getStatus',
    description:
      '获取设备状态总览，包括在线/离线/连接中/降级/错误五种状态的设备数量和标签总量。也可查询单个设备详情。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'deviceId',
        type: 'string',
        description: '设备 ID（可选，不填则返回全量统计）',
        required: false,
      },
      {
        name: 'status',
        type: 'string',
        description: '按状态过滤（可选：online/offline/connecting/degraded/error）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, deviceId, status } = params;
      try {
        if (deviceId) {
          const device = await services.deviceService!.findOne(String(deviceId), String(projectId));
          return JSON.stringify({
            success: true,
            device: {
              id: device.id,
              deviceName: device.deviceName,
              type: device.type,
              status: device.status,
            },
          });
        }
        const stats = await services.deviceService!.getDeviceStats(String(projectId));
        if (status) {
          const filterStatus = String(status).toLowerCase();
          const result = await services.deviceService!.findAll(String(projectId), {
            status: filterStatus,
          });
          return JSON.stringify({
            success: true,
            summary: stats,
            filterStatus,
            devices: result.data
              .slice(0, 10)
              .map((d) => ({ id: d.id, deviceName: d.deviceName, type: d.type, status: d.status })),
            filteredTotal: result.pagination.total,
          });
        }
        return JSON.stringify({ success: true, summary: stats });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 4. device_getHistory — 设备历史数据 */
export function createDeviceHistoryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceService || !services.dataQueryService) return null;

  return {
    name: 'device_getHistory',
    description: '查询设备关联标签的历史数据变化。需要先通过 device_getStatus 获取设备信息。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'tagId', type: 'string', description: '数据标签 ID', required: true },
      { name: 'startTime', type: 'string', description: '开始时间', required: true },
      { name: 'endTime', type: 'string', description: '结束时间', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagId, startTime, endTime } = params;
      try {
        const result = await services.dataQueryService!.queryTimeRange({
          tagId: String(tagId),
          startTime: new Date(String(startTime)),
          endTime: new Date(String(endTime)),
          pageSize: 100,
        });
        const stats = await services.dataQueryService!.getTagStats(
          String(tagId),
          new Date(String(startTime)),
          new Date(String(endTime)),
        );
        return JSON.stringify({
          success: true,
          tagId: String(tagId),
          stats,
          recordCount: result.total,
          sampleRecords: result.data
            .slice(0, 5)
            .map((d) => ({ time: d.timestamp, value: d.numericValue })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 5. alarm_getHistory — 报警历史记录 */
export function createAlarmHistoryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmService) return null;

  return {
    name: 'alarm_getHistory',
    description: '查询报警历史记录。支持按项目、级别、状态过滤和分页。也可获取报警统计概览。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'limit', type: 'number', description: '返回条数（默认 20）', required: false },
      {
        name: 'mode',
        type: 'string',
        description: '查询模式：records（记录列表，默认）/ summary（统计概览）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, limit = 20, mode = 'records' } = params;
      try {
        if (String(mode) === 'summary' && services.alarmStatisticsService) {
          const stats = await services.alarmStatisticsService.getStatistics(String(projectId));
          return JSON.stringify({ success: true, summary: stats });
        }

        const records = await services.alarmService!.getRecords(
          String(projectId),
          typeof limit === 'number' ? limit : 20,
        );
        const list = records.map((r) => ({
          id: r.id,
          rule: r.rule?.name,
          status: r.status,
          level: r.level,
          value: r.triggerValue,
          time: r.createdAt,
        }));
        return JSON.stringify({ success: true, total: records.length, records: list });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 6. knowledge_search — 知识库搜索 */
export function createKnowledgeSearchTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.knowledgeService) return null;

  return {
    name: 'knowledge_search',
    description: '在知识库中搜索相关内容。返回匹配的文档标题、摘要和所属模块。',
    category: 'knowledge',
    frontend: false,
    params: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
      {
        name: 'product',
        type: 'string',
        description: '产品名称（ss-data/ss-scada，留空为全部）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { query, product } = params;
      try {
        const results = await services.knowledgeService!.search(
          String(query),
          product ? String(product) : undefined,
        );
        const items = results.slice(0, 10).map((r) => ({
          title: r.title,
          snippet: r.snippet?.substring(0, 200),
          module: r.module,
          score: r.score,
        }));
        return JSON.stringify({
          success: true,
          query: String(query),
          total: results.length,
          results: items,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 7. system_getHealth — 系统健康检查 */
export function createSystemHealthTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.healthService) return null;

  return {
    name: 'system_getHealth',
    description:
      '获取系统健康状态，包括数据库连接、内存使用率、磁盘使用率、CPU 负载、运行时长等信息。',
    category: 'system',
    frontend: false,
    params: [],
    execute: async (_params: Record<string, unknown>) => {
      try {
        const health = await services.healthService!.getDetailed();
        return JSON.stringify({
          success: true,
          status: health.status,
          uptimeSeconds: health.uptime,
          database: health.database?.status || 'unknown',
          memory: health.memory
            ? {
                usedMB: Math.round((health.memory.used / 1024 / 1024) * 100) / 100,
                totalMB: Math.round((health.memory.total / 1024 / 1024) * 100) / 100,
                percent: health.memory.usagePercent,
              }
            : null,
          disk: health.disks?.appDir
            ? {
                usedGB:
                  Math.round((health.disks.appDir.usedBytes / 1024 / 1024 / 1024) * 100) / 100,
                totalGB:
                  Math.round((health.disks.appDir.totalBytes / 1024 / 1024 / 1024) * 100) / 100,
                percent: health.disks.appDir.usagePercent,
              }
            : null,
          cpu: health.cpuLoad?.[0] || null,
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 8. template_list — 查询可用设备模板列表 */
export function createTemplateListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.templateService) return null;

  return {
    name: 'template_list',
    description:
      '查询可用设备采集变量模板列表。支持按设备类型、关键词筛选。返回模板摘要信息（名称、版本、变量数）。',
    category: 'template',
    frontend: false,
    params: [
      {
        name: 'deviceType',
        type: 'string',
        description: '设备类型筛选（可选，如 sensor/actuator/controller）',
        required: false,
      },
      {
        name: 'keyword',
        type: 'string',
        description: '关键词搜索模板名称或描述',
        required: false,
      },
      {
        name: 'pageSize',
        type: 'number',
        description: '返回条数（默认 20）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { deviceType, keyword, pageSize } = params;
      try {
        const result = await services.templateService!.findAll({
          deviceType: deviceType ? String(deviceType) : undefined,
          keyword: keyword ? String(keyword) : undefined,
          pageSize: typeof pageSize === 'number' ? pageSize : 20,
        });
        const templates = result.data.map((t) => ({
          id: t.id,
          name: t.name,
          deviceType: t.deviceType,
          version: t.version,
          variableCount: t.variableCount ?? t.variables?.length ?? 0,
          description: t.description,
        }));
        return JSON.stringify({
          success: true,
          total: result.pagination.total,
          templates,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 9. template_detail — 查询模板详情 */
export function createTemplateDetailTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.templateService) return null;

  return {
    name: 'template_detail',
    description: '获取指定设备模板的详细信息，包括所有变量定义（名称、地址、数据类型、单位等）。',
    category: 'template',
    frontend: false,
    params: [
      {
        name: 'templateId',
        type: 'string',
        description: '模板 ID（必填）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { templateId } = params;
      try {
        const template = await services.templateService!.findById(String(templateId));
        return JSON.stringify({
          success: true,
          template: {
            id: template.id,
            name: template.name,
            deviceType: template.deviceType,
            version: template.version,
            description: template.description,
            variables: template.variables.map((v) => ({
              name: v.name,
              label: v.label,
              address: v.address,
              dataType: v.dataType,
              readWrite: v.readWrite,
              unit: v.unit,
              scale: v.scale,
              offset: v.offset,
              deadband: v.deadband,
              description: v.description,
            })),
          },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 10. template_create — 创建新模板 */
export function createTemplateCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.templateService) return null;

  return {
    name: 'template_create',
    description:
      '创建新的设备采集变量模板。需指定模板名称、设备类型和变量定义（名称、标签、地址、数据类型）。',
    category: 'template',
    frontend: false,
    params: [
      { name: 'name', type: 'string', description: '模板名称（必填）', required: true },
      {
        name: 'deviceType',
        type: 'string',
        description: '设备类型（必填，如 sensor/actuator/controller）',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: '模板描述',
        required: false,
      },
      {
        name: 'variables',
        type: 'array',
        description:
          '变量定义数组。示例：[{"name":"temperature","label":"温度","address":"40001","dataType":"float32","unit":"°C"}]',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { name, deviceType, description, variables } = params;
      try {
        if (!variables || !Array.isArray(variables) || variables.length === 0) {
          return JSON.stringify({
            success: false,
            error:
              '请至少定义一个变量。variables 需为非空数组，每项包含 name、label、address、dataType。',
          });
        }
        const result = await services.templateService!.create(
          {
            name: String(name),
            deviceType: String(deviceType),
            description: description ? String(description) : undefined,
            variables: variables as Array<{
              name: string;
              label: string;
              address: string;
              dataType: string;
              readWrite?: string;
              unit?: string;
              description?: string;
            }>,
          },
          'ai-assistant',
        );
        return JSON.stringify({
          success: true,
          template: {
            id: result.id,
            name: result.name,
            version: result.version,
            variableCount: result.variableCount,
          },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 11. driver_list — 查询可用采集驱动 */
export function createDriverListTool(_services: BackendToolServices): BackendToolDef {
  const DRIVERS = [
    {
      name: 'modbus_tcp',
      label: 'Modbus TCP',
      description: 'Modbus TCP 协议采集驱动，通过以太网与 Modbus 设备通信',
      connectionTemplate: {
        host: '192.168.1.100',
        port: 502,
        slaveId: 1,
      },
    },
    {
      name: 'modbus_rtu',
      label: 'Modbus RTU',
      description: 'Modbus RTU 串口采集驱动，通过串口与 Modbus 设备通信',
      connectionTemplate: {
        port: 'COM3',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        slaveId: 1,
      },
    },
    {
      name: 'opc_ua',
      label: 'OPC UA',
      description: 'OPC UA 协议采集驱动，支持安全策略和加密通信',
      connectionTemplate: {
        endpoint: 'opc.tcp://192.168.1.100:4840',
        securityMode: 'None',
        securityPolicy: 'None',
      },
    },
    {
      name: 'mqtt',
      label: 'MQTT',
      description: 'MQTT 协议采集驱动，适用于物联网设备数据采集',
      connectionTemplate: {
        broker: 'mqtt://192.168.1.100:1883',
        clientId: 'scada-device-001',
      },
    },
    {
      name: 'siemens_s7',
      label: 'Siemens S7',
      description: 'Siemens S7 PLC 采集驱动，支持 S7-200/300/400/1200/1500 系列',
      connectionTemplate: {
        host: '192.168.1.100',
        rack: 0,
        slot: 1,
      },
    },
    {
      name: 'virtual',
      label: '虚拟设备',
      description: '虚拟设备驱动，用于仿真测试和开发调试',
      connectionTemplate: {
        interval: 1000,
      },
    },
  ];

  return {
    name: 'driver_list',
    description:
      '获取所有可用的采集驱动插件列表及其连接配置模板。创建新设备时，需从中选择合适的驱动并填写连接参数。',
    category: 'device',
    frontend: false,
    params: [],
    execute: async (_params: Record<string, unknown>) => {
      return JSON.stringify({ success: true, drivers: DRIVERS });
    },
  };
}

/** 12. device_create — 创建设备 */
export function createDeviceCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceCreateService) return null;

  return {
    name: 'device_create',
    description:
      '在指定项目中创建新设备，从设备模板实例化并关联采集驱动。创建前建议先调用 template_list 确认模板、driver_list 确认驱动。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID（必填）', required: true },
      { name: 'name', type: 'string', description: '设备名称（必填）', required: true },
      {
        name: 'deviceCode',
        type: 'string',
        description: '设备编码（必填，全英文小写+数字+连字符，项目内唯一，如 temp-hum-001）',
        required: true,
      },
      { name: 'templateId', type: 'string', description: '模板 ID（必填）', required: true },
      {
        name: 'driver',
        type: 'string',
        description: '采集驱动（必填，从 driver_list 获取，如 modbus_tcp/opc_ua/mqtt 等）',
        required: true,
      },
      {
        name: 'connection',
        type: 'object',
        description:
          '连接配置（必填）。参考 driver_list 返回的 connectionTemplate 结构填写。例如 Modbus TCP: {"host":"192.168.1.100","port":502,"slaveId":1}',
        required: true,
      },
      {
        name: 'scanRate',
        type: 'number',
        description: '采集周期（ms），默认 1000',
        required: false,
      },
      {
        name: 'groupId',
        type: 'string',
        description: '所属分组 ID',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: '设备描述',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const {
        projectId,
        name,
        deviceCode,
        templateId,
        driver,
        connection,
        scanRate,
        groupId,
        description,
      } = params;
      try {
        if (!connection || typeof connection !== 'object') {
          return JSON.stringify({
            success: false,
            error: 'connection 参数必填，请参考 driver_list 返回的连接配置模板填写。',
          });
        }
        const device = await services.deviceCreateService!.createDevice(
          {
            deviceName: String(name),
            deviceCode: String(deviceCode),
            templateId: String(templateId),
            driver: String(driver),
            connection: connection as Record<string, unknown>,
            scanRate: typeof scanRate === 'number' ? scanRate : 1000,
            groupId: groupId ? String(groupId) : undefined,
            description: description ? String(description) : undefined,
          },
          String(projectId),
        );
        return JSON.stringify({
          success: true,
          device: {
            id: device.id,
            deviceName: device.deviceName,
            deviceCode: device.deviceCode,
            driver: device.driver,
            templateId: device.templateId,
            status: device.status,
            createdAt: device.createdAt,
          },
          message: '设备创建成功，采集任务将在下次调度时自动注册。',
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批量创建
// ============================================================

/** 13. dict_list — 查询字典分类树 */
export function createDictListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dictService) return null;

  return {
    name: 'dict_list',
    description:
      '获取所有数据字典分类及字典表列表。支持按语言筛选。返回按分类分组的字典表摘要信息。',
    category: 'dict',
    frontend: false,
    params: [
      {
        name: 'locale',
        type: 'string',
        description: '语言（默认 zh-CN）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { locale } = params;
      try {
        const categories = services.dictService!.getAllCategories(
          locale ? String(locale) : 'zh-CN',
        );
        const total = categories.reduce((sum, c) => sum + c.tables.length, 0);
        return JSON.stringify({
          success: true,
          total,
          categories: categories.map((c) => ({
            category: c.category,
            tables: c.tables.map((t) => ({
              dictId: t.dictId,
              dictName: t.dictName,
              version: t.version,
              itemCount: t.itemCount,
            })),
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 14. dict_detail — 查询字典表详情 */
export function createDictDetailTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dictService) return null;

  return {
    name: 'dict_detail',
    description: '获取指定字典表的完整内容，包括所有条目（键值对）。',
    category: 'dict',
    frontend: false,
    params: [
      {
        name: 'dictId',
        type: 'string',
        description: '字典标识（必填），如 "protocolType"',
        required: true,
      },
      {
        name: 'locale',
        type: 'string',
        description: '语言（默认 zh-CN）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { dictId, locale } = params;
      try {
        const dict = services.dictService!.getDict(
          String(dictId),
          locale ? String(locale) : 'zh-CN',
        );
        if (!dict) {
          return JSON.stringify({
            success: false,
            error: `字典 "${dictId}" 不存在`,
          });
        }
        return JSON.stringify({
          success: true,
          dict: {
            dictId: dict.dictId,
            dictName: dict.dictName,
            category: dict.category,
            description: dict.description,
            version: dict.version,
            items: dict.items.map((i) => ({
              value: i.value,
              label: i.label,
              sortOrder: i.sortOrder,
              description: i.description,
            })),
          },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 15. dict_create — 创建字典表 */
export function createDictCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dictService) return null;

  return {
    name: 'dict_create',
    description: '创建新的数据字典表，包含分类和条目定义。如果分类目录不存在，将自动创建。',
    category: 'dict',
    frontend: false,
    params: [
      {
        name: 'locale',
        type: 'string',
        description: '语言（必填），如 "zh-CN"',
        required: true,
      },
      {
        name: 'dictId',
        type: 'string',
        description: '字典标识（必填），camelCase，如 "priorityLevel"',
        required: true,
      },
      {
        name: 'dictName',
        type: 'string',
        description: '字典名称（必填），如 "优先级"',
        required: true,
      },
      {
        name: 'category',
        type: 'string',
        description: '分类（必填），如 "system"',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: '描述',
        required: false,
      },
      {
        name: 'version',
        type: 'string',
        description: '版本号，默认 "1.0"',
        required: false,
      },
      {
        name: 'items',
        type: 'array',
        description:
          '条目数组。示例：[{"value":"info","label":"信息","sortOrder":1,"description":"一般信息提示"}]',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { locale, dictId, dictName, category, description, version, items } = params;
      try {
        if (!items || !Array.isArray(items) || items.length === 0) {
          return JSON.stringify({
            success: false,
            error: 'items 需为非空数组，每项包含 value、label。',
          });
        }
        services.dictService!.createTable(String(locale), String(category), {
          dictId: String(dictId),
          dictName: String(dictName),
          category: String(category),
          description: description ? String(description) : undefined,
          version: version ? String(version) : '1.0',
          sortOrder: 1,
          items: (items as Array<Record<string, unknown>>).map((i, idx) => ({
            value: String(i.value),
            label: String(i.label),
            sortOrder: typeof i.sortOrder === 'number' ? i.sortOrder : idx + 1,
            description: i.description ? String(i.description) : '',
          })),
        });
        return JSON.stringify({
          success: true,
          dict: {
            dictId: String(dictId),
            dictName: String(dictName),
            category: String(category),
            version: version ? String(version) : '1.0',
            itemCount: (items as Array<unknown>).length,
          },
          message: '字典表已创建',
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 16. dict_addItems — 向字典表追加条目 */
export function createDictAddItemsTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dictService) return null;

  return {
    name: 'dict_addItems',
    description:
      '向已有字典表中追加新条目（不覆盖现有条目）。需先调用 dict_detail 确认字典表存在。',
    category: 'dict',
    frontend: false,
    params: [
      {
        name: 'locale',
        type: 'string',
        description: '语言（必填），如 "zh-CN"',
        required: true,
      },
      {
        name: 'dictId',
        type: 'string',
        description: '字典标识（必填）',
        required: true,
      },
      {
        name: 'category',
        type: 'string',
        description: '分类（必填）',
        required: true,
      },
      {
        name: 'items',
        type: 'array',
        description: '新增条目数组。示例：[{"value":"bacnet","label":"BACnet","sortOrder":7}]',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { locale, dictId, category, items } = params;
      try {
        if (!items || !Array.isArray(items) || items.length === 0) {
          return JSON.stringify({
            success: false,
            error: 'items 需为非空数组',
          });
        }
        const existing = services.dictService!.getDict(String(dictId), String(locale));
        if (!existing) {
          return JSON.stringify({
            success: false,
            error: `字典 "${dictId}" 不存在，请先使用 dict_create 创建`,
          });
        }
        const newItems = (items as Array<Record<string, unknown>>).map((i) => ({
          value: String(i.value),
          label: String(i.label),
          sortOrder: typeof i.sortOrder === 'number' ? i.sortOrder : 0,
          description: i.description ? String(i.description) : '',
        }));
        const merged = [...existing.items, ...newItems];
        services.dictService!.updateTable(String(locale), String(category), String(dictId), {
          items: merged,
        });
        return JSON.stringify({
          success: true,
          dictId: String(dictId),
          addedCount: newItems.length,
          totalCount: merged.length,
          message: `已追加 ${newItems.length} 个条目，字典表共 ${merged.length} 个条目`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 17. dict_search — 搜索字典条目 */
export function createDictSearchTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dictService) return null;

  return {
    name: 'dict_search',
    description:
      '跨字典表搜索条目，按 value 或 label 关键词匹配。返回匹配的字典条目及其所属字典表。',
    category: 'dict',
    frontend: false,
    params: [
      {
        name: 'keyword',
        type: 'string',
        description: '搜索关键词（必填）',
        required: true,
      },
      {
        name: 'locale',
        type: 'string',
        description: '语言（默认 zh-CN）',
        required: false,
      },
      {
        name: 'category',
        type: 'string',
        description: '可选：限定分类',
        required: false,
      },
      {
        name: 'pageSize',
        type: 'number',
        description: '返回条数（默认 20）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { keyword, locale, category, pageSize } = params;
      try {
        const kw = String(keyword).toLowerCase();
        const dicts = services.dictService!.getAllDicts(locale ? String(locale) : 'zh-CN');
        const limit = typeof pageSize === 'number' ? pageSize : 20;
        const results: Array<{
          dictId: string;
          dictName: string;
          category: string;
          item: { value: string; label: string; sortOrder: number; description: string };
        }> = [];

        for (const dict of dicts) {
          if (category && dict.category !== String(category)) continue;
          for (const item of dict.items) {
            if (item.value.toLowerCase().includes(kw) || item.label.toLowerCase().includes(kw)) {
              results.push({
                dictId: dict.dictId,
                dictName: dict.dictName,
                category: dict.category,
                item: {
                  value: item.value,
                  label: item.label,
                  sortOrder: item.sortOrder,
                  description: item.description,
                },
              });
              if (results.length >= limit) break;
            }
          }
          if (results.length >= limit) break;
        }

        return JSON.stringify({
          success: true,
          keyword: String(keyword),
          total: results.length,
          results,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 A: 外部数据库接入 (5) + 项目管理 (4) = 9 个工具
// ============================================================

/** 18. db_connection_list — 查询外部数据库连接列表 */
export function createDbConnectionListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dbConnectionService) return null;

  return {
    name: 'db_connection_list',
    description:
      '获取项目中所有已配置的外部数据库连接列表。返回连接 ID、名称、数据库类型、主机、端口、数据库名和启用状态。',
    category: 'datasource',
    frontend: false,
    params: [{ name: 'projectId', type: 'string', description: '项目 ID', required: true }],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const connections = await services.dbConnectionService!.findAll(String(projectId));
        return JSON.stringify({
          success: true,
          total: connections.length,
          connections: connections.map((c) => ({
            id: c.id,
            name: c.name,
            dbType: c.dbType,
            host: c.host,
            port: c.port,
            database: c.database,
            enabled: c.enabled,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 19. db_connection_create — 创建外部数据库连接 */
export function createDbConnectionCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dbConnectionService) return null;

  return {
    name: 'db_connection_create',
    description:
      '在项目中创建新的外部数据库连接。支持 MySQL、SQLite、PostgreSQL、Oracle、SQL Server 等类型。需提供连接名称、数据库类型和连接参数。',
    category: 'datasource',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'name', type: 'string', description: '连接名称（必填）', required: true },
      {
        name: 'dbType',
        type: 'string',
        description: '数据库类型（必填，如 mysql/sqlite/postgresql/oracle/mssql）',
        required: true,
      },
      { name: 'host', type: 'string', description: '主机地址（SQLite 除外）', required: false },
      { name: 'port', type: 'number', description: '端口号', required: false },
      { name: 'database', type: 'string', description: '数据库名', required: false },
      { name: 'username', type: 'string', description: '用户名', required: false },
      { name: 'password', type: 'string', description: '密码', required: false },
      { name: 'options', type: 'string', description: '附加选项（JSON 字符串）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, name, dbType, host, port, database, username, password, options } = params;
      try {
        if (!name) {
          return JSON.stringify({ success: false, error: '缺少必填参数: name（连接名称）' });
        }
        if (!dbType) {
          return JSON.stringify({ success: false, error: '缺少必填参数: dbType（数据库类型）' });
        }
        const result = await services.dbConnectionService!.create(String(projectId), {
          name: String(name),
          dbType: String(dbType),
          host: host ? String(host) : undefined,
          port: typeof port === 'number' ? port : undefined,
          database: database ? String(database) : undefined,
          username: username ? String(username) : undefined,
          password: password ? String(password) : undefined,
          options: options ? String(options) : undefined,
        });
        return JSON.stringify({
          success: true,
          connection: { id: result.id, name: result.name },
          message: '数据库连接创建成功，建议使用 db_connection_test 测试连通性。',
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 20. db_connection_test — 测试数据库连接 */
export function createDbConnectionTestTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dbConnectionService) return null;

  return {
    name: 'db_connection_test',
    description: '测试指定数据库连接的连通性。返回连接是否成功、延迟时间（ms）和可能的错误信息。',
    category: 'datasource',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'connectionId',
        type: 'string',
        description: '数据库连接 ID（必填）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, connectionId } = params;
      try {
        const result = await services.dbConnectionService!.test(
          String(projectId),
          String(connectionId),
        );
        return JSON.stringify({
          success: result.success,
          latency: result.latency,
          error: result.error,
          message: result.success
            ? `连接成功，延迟 ${result.latency}ms`
            : `连接失败: ${result.error}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 21. db_connection_tables — 浏览数据库表结构 */
export function createDbConnectionTablesTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dbConnectionService) return null;

  return {
    name: 'db_connection_tables',
    description: '获取外部数据库的表列表和列信息。可指定表名获取列详情，不指定则返回所有表名。',
    category: 'datasource',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'connectionId',
        type: 'string',
        description: '数据库连接 ID（必填）',
        required: true,
      },
      {
        name: 'tableName',
        type: 'string',
        description: '表名（可选，不填则返回所有表）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, connectionId, tableName } = params;
      try {
        const tables = await services.dbConnectionService!.getTables(
          String(projectId),
          String(connectionId),
        );
        if (tableName) {
          const columns = await services.dbConnectionService!.getColumns(
            String(projectId),
            String(connectionId),
            String(tableName),
          );
          return JSON.stringify({
            success: true,
            table: String(tableName),
            columns: columns.map((c) => ({ name: c.name, type: c.type })),
          });
        }
        return JSON.stringify({
          success: true,
          total: tables.length,
          tables,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 22. db_connection_query — 执行 SQL 查询 */
export function createDbConnectionQueryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dbConnectionService) return null;

  return {
    name: 'db_connection_query',
    description:
      '在外部数据库连接上执行 SQL 查询（仅 SELECT）。返回查询结果数组。注意：仅支持只读查询，不支持 INSERT/UPDATE/DELETE。',
    category: 'datasource',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'connectionId',
        type: 'string',
        description: '数据库连接 ID（必填）',
        required: true,
      },
      {
        name: 'sql',
        type: 'string',
        description: 'SQL 查询语句（仅 SELECT，必填）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, connectionId, sql } = params;
      try {
        const sqlStr = String(sql).trim().toUpperCase();
        if (!sqlStr.startsWith('SELECT')) {
          return JSON.stringify({
            success: false,
            error: '仅支持 SELECT 查询，不支持修改操作。',
          });
        }
        const rows = await services.dbConnectionService!.executeQuery(
          String(projectId),
          String(connectionId),
          String(sql),
        );
        return JSON.stringify({
          success: true,
          rowCount: rows.length,
          rows: rows.slice(0, 50),
          hint: rows.length > 50 ? `显示前 50 条，共 ${rows.length} 条` : undefined,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 23. project_list — 查询项目列表 */
export function createProjectListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_list',
    description:
      '获取系统中所有项目的列表。支持关键词搜索和分页。返回项目 projectId、名称、描述和创建/更新时间。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'userId', type: 'string', description: '用户 ID', required: true },
      {
        name: 'keyword',
        type: 'string',
        description: '关键词搜索（匹配名称或描述）',
        required: false,
      },
      { name: 'page', type: 'number', description: '页码（默认 1）', required: false },
      { name: 'pageSize', type: 'number', description: '每页条数（默认 20）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { userId, keyword, page, pageSize } = params;
      try {
        const result = await services.projectService!.findAll(String(userId), {
          keyword: keyword ? String(keyword) : undefined,
          page: typeof page === 'number' ? page : 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 20,
        });
        return JSON.stringify({
          success: true,
          total: result.pagination.total,
          page: result.pagination.page,
          totalPages: result.pagination.totalPages,
          projects: result.data.map((p) => ({
            projectId: p.projectId,
            name: p.projectName,
            description: p.description,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 24. project_info — 查询项目详情 */
export function createProjectInfoTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_info',
    description: '获取指定项目的详细信息，包括 projectId、名称、描述、版本、配置和创建/更新时间。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 projectId（必填）', required: true },
      { name: 'userId', type: 'string', description: '用户 ID', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, userId } = params;
      try {
        const project = await services.projectService!.findOne(String(projectId), String(userId));
        return JSON.stringify({
          success: true,
          project: {
            projectId: project.projectId,
            name: project.projectName,
            description: project.description,
            version: project.version,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            config: project.config,
          },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 25. project_export — 导出项目 */
export function createProjectExportTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_export',
    description:
      '将项目导出为 ZIP 文件。可选择包含页面、项目数据库和实时数据库。导出文件保存在服务器临时目录。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 projectId（必填）', required: true },
      { name: 'userId', type: 'string', description: '用户 ID', required: true },
      {
        name: 'includePages',
        type: 'boolean',
        description: '是否包含页面（默认 true）',
        required: false,
      },
      {
        name: 'includeProjectDb',
        type: 'boolean',
        description: '是否包含项目数据库（默认 true）',
        required: false,
      },
      {
        name: 'includeRtdb',
        type: 'boolean',
        description: '是否包含实时数据库（默认 true）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, userId, includePages, includeProjectDb, includeRtdb } = params;
      try {
        const result = await services.projectService!.exportProjectZip(
          String(projectId),
          String(userId),
          {
            includePages: includePages !== false,
            includeProjectDb: includeProjectDb !== false,
            includeRtdb: includeRtdb !== false,
          },
        );
        return JSON.stringify({
          success: true,
          projectName: result.projectName,
          fileName: result.fileName,
          filePath: result.filePath,
          message: `项目 "${result.projectName}" 已导出到 ${result.fileName}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 26. project_import — 导入项目 */
export function createProjectImportTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_import',
    description:
      '从服务器 ZIP 文件路径导入项目。支持覆盖已存在的同名项目。导入后自动初始化缺失的数据库资源。',
    category: 'project',
    frontend: false,
    params: [
      {
        name: 'filePath',
        type: 'string',
        description: 'ZIP 文件在服务器上的绝对路径（必填）',
        required: true,
      },
      { name: 'userId', type: 'string', description: '用户 ID', required: true },
      {
        name: 'overwrite',
        type: 'boolean',
        description: '是否覆盖同名项目（默认 false）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { filePath, userId, overwrite } = params;
      try {
        if (!filePath) {
          return JSON.stringify({
            success: false,
            error: '缺少必填参数: filePath（ZIP 文件路径）',
          });
        }
        const result = await services.projectService!.importProjectZip(
          String(filePath),
          String(userId),
          overwrite === true,
        );
        return JSON.stringify({
          success: true,
          project: { projectId: result.data.projectId, name: result.data.projectName },
          warnings: result.warnings,
          message:
            `项目 "${result.data.projectName}" 导入成功` +
            (result.warnings.length > 0 ? `（${result.warnings.length} 个警告）` : ''),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 B: 趋势数据 (4) + 项目诊断 (4) = 8 个工具
// ============================================================

/** 27. tag_list — 查询数据标签列表 */
export function createTagListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.datatagService) return null;

  return {
    name: 'tag_list',
    description:
      '查询项目中的数据标签列表。支持按设备筛选、关键词搜索和分页。返回标签 ID、名称、数据类型、设备 ID、单位和启用状态。',
    category: 'datatag',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'deviceId', type: 'string', description: '设备 ID 筛选（可选）', required: false },
      { name: 'keyword', type: 'string', description: '关键词搜索标签名称', required: false },
      { name: 'page', type: 'number', description: '页码（默认 1）', required: false },
      { name: 'pageSize', type: 'number', description: '每页条数（默认 50）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, deviceId, keyword, page, pageSize } = params;
      try {
        const result = await services.datatagService!.findAll(String(projectId), {
          deviceId: deviceId ? String(deviceId) : undefined,
          q: keyword ? String(keyword) : undefined,
          page: typeof page === 'number' ? page : 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 50,
        });
        return JSON.stringify({
          success: true,
          total: result.total,
          tags: result.data.map((t) => ({
            id: t.id,
            name: t.name,
            dataType: t.dataType,
            deviceId: t.deviceId,
            unit: t.unit,
            enabled: t.enabled,
            scanRate: t.scanRate,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 28. trend_query — 趋势数据查询 */
export function createTrendQueryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataQueryService?.queryTrend) return null;

  return {
    name: 'trend_query',
    description:
      '查询多个数据标签的趋势数据。支持降采样（maxPoints）、插值（linear/step）和时间间隔（interval）。返回每个标签的时间序列数据点。',
    category: 'data',
    frontend: false,
    params: [
      { name: 'tagIds', type: 'array', description: '数据标签 ID 数组（必填）', required: true },
      {
        name: 'startTime',
        type: 'string',
        description: '开始时间（ISO 8601 格式，必填）',
        required: true,
      },
      {
        name: 'endTime',
        type: 'string',
        description: '结束时间（ISO 8601 格式，必填）',
        required: true,
      },
      { name: 'projectId', type: 'string', description: '项目 ID', required: false },
      {
        name: 'maxPoints',
        type: 'number',
        description: '最大数据点数（默认 500，用于降采样）',
        required: false,
      },
      {
        name: 'interpolation',
        type: 'string',
        description: '插值方式（linear/step，默认 linear）',
        required: false,
      },
      { name: 'interval', type: 'number', description: '采样间隔（秒）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagIds, startTime, endTime, projectId, maxPoints, interpolation, interval } = params;
      try {
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
          return JSON.stringify({ success: false, error: 'tagIds 需为非空数组' });
        }
        const result = await services.dataQueryService!.queryTrend!({
          tagIds: tagIds.map(String),
          startTime: String(startTime),
          endTime: String(endTime),
          projectId: projectId ? String(projectId) : undefined,
          maxPoints: typeof maxPoints === 'number' ? maxPoints : 500,
          interpolation: interpolation ? String(interpolation) : 'linear',
          interval: typeof interval === 'number' ? interval : undefined,
        });
        return JSON.stringify({
          success: true,
          tagCount: result.data.length,
          data: result.data.map((d) => ({
            tagId: d.tagId,
            pointCount: d.data.length,
            samplePoints: d.data.slice(0, 10),
            hint: d.data.length > 10 ? `显示前 10 个点，共 ${d.data.length} 个` : undefined,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 29. trend_aggregate — 趋势数据聚合 */
export function createTrendAggregateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataQueryService) return null;

  return {
    name: 'trend_aggregate',
    description: '对数据标签进行聚合统计，返回指定时间范围内的平均值、最大值、最小值、总和和计数。',
    category: 'data',
    frontend: false,
    params: [
      { name: 'tagId', type: 'string', description: '数据标签 ID（必填）', required: true },
      {
        name: 'startTime',
        type: 'string',
        description: '开始时间（ISO 8601 格式）',
        required: true,
      },
      { name: 'endTime', type: 'string', description: '结束时间（ISO 8601 格式）', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagId, startTime, endTime } = params;
      try {
        const stats = await services.dataQueryService!.getTagStats(
          String(tagId),
          new Date(String(startTime)),
          new Date(String(endTime)),
        );
        return JSON.stringify({
          success: true,
          tagId: String(tagId),
          stats: {
            avg: Math.round(stats.avg * 1000) / 1000,
            max: Math.round(stats.max * 1000) / 1000,
            min: Math.round(stats.min * 1000) / 1000,
            sum: Math.round(stats.sum * 1000) / 1000,
            count: stats.count,
          },
          timeRange: { start: String(startTime), end: String(endTime) },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 30. trend_export — 趋势数据导出 */
export function createTrendExportTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataQueryService?.exportTrend) return null;

  return {
    name: 'trend_export',
    description: '将趋势数据导出为文件（CSV/JSON 格式）。返回导出文件的路径和文件名。',
    category: 'data',
    frontend: false,
    params: [
      { name: 'tagIds', type: 'array', description: '数据标签 ID 数组', required: true },
      { name: 'startTime', type: 'string', description: '开始时间', required: true },
      { name: 'endTime', type: 'string', description: '结束时间', required: true },
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'format',
        type: 'string',
        description: '导出格式（csv/json，默认 csv）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagIds, startTime, endTime, projectId, format } = params;
      try {
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
          return JSON.stringify({ success: false, error: 'tagIds 需为非空数组' });
        }
        const result = await services.dataQueryService!.exportTrend!(
          tagIds.map(String),
          String(startTime),
          String(endTime),
          String(projectId),
          format ? String(format) : 'csv',
        );
        return JSON.stringify({
          success: true,
          filePath: result.filePath,
          fileName: result.fileName,
          message: `趋势数据已导出到 ${result.fileName}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 31. project_manage_info — 项目管理信息 */
export function createProjectManageInfoTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_manage_info',
    description: '获取项目的管理信息，包括页面数量、数据库大小、实时数据库大小、数据库模式等。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 projectId（必填）', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const info = await services.projectService!.getManageInfo(String(projectId));
        return JSON.stringify({
          success: true,
          info: {
            projectName: info.projectName,
            projectId: info.projectId,
            tenantId: info.tenantId,
            pageCount: info.pageCount,
            dbSize: info.dbSize,
            dbSizeMB: Math.round((info.dbSize / 1024 / 1024) * 100) / 100,
            rtdbSize: info.rtdbSize,
            rtdbSizeMB: Math.round((info.rtdbSize / 1024 / 1024) * 100) / 100,
            dbMode: info.dbMode,
          },
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 32. project_diagnose — 项目诊断 */
export function createProjectDiagnoseTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_diagnose',
    description:
      '对项目进行全面诊断，检测目录结构、配置文件、数据库文件等资源的完整性。返回健康度评分和问题清单。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 projectId（必填）', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const result = await services.projectService!.diagnose(String(projectId));
        return JSON.stringify({
          success: true,
          health: result.health,
          resources: result.resources,
          issues: result.issues,
          message:
            `项目健康度: ${result.health}` +
            (result.issues.length > 0 ? `，发现 ${result.issues.length} 个问题` : '，一切正常'),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 33. project_init_resources — 初始化项目资源 */
export function createProjectInitResourcesTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.projectService) return null;

  return {
    name: 'project_init_resources',
    description:
      '根据诊断结果自动初始化项目缺失的资源（子目录、数据库文件）。可指定要初始化的资源类型，不指定则初始化全部缺失资源。',
    category: 'project',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 projectId（必填）', required: true },
      {
        name: 'resources',
        type: 'array',
        description: '要初始化的资源类型（可选：subdirs/database），不填则全部初始化',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, resources } = params;
      try {
        const result = await services.projectService!.initResources(
          String(projectId),
          resources ? (resources as string[]) : undefined,
        );
        const newHealth = result.issues.length === 0 ? 'healthy' : 'degraded';
        return JSON.stringify({
          success: true,
          health: newHealth,
          initialized: result.initialized,
          skipped: result.skipped,
          issues: result.issues,
          message:
            `已初始化 ${result.initialized.length} 项资源` +
            (result.issues.length > 0
              ? `，剩余 ${result.issues.length} 个问题`
              : '，项目已恢复健康'),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 34. system_health_detailed — 系统详细健康检查 */
export function createSystemHealthDetailedTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.healthService) return null;

  return {
    name: 'system_health_detailed',
    description:
      '获取系统详细健康状态，包括数据库连接、内存/磁盘使用率、CPU 负载、运行时长等。与 system_getHealth 相同，提供更详细的输出。',
    category: 'system',
    frontend: false,
    params: [],
    execute: async (_params: Record<string, unknown>) => {
      try {
        const health = await services.healthService!.getDetailed();
        const issues: string[] = [];
        if (health.database?.status !== 'ok') issues.push('数据库连接异常');
        if (health.memory && health.memory.usagePercent > 90) issues.push('内存使用率超过 90%');
        if (health.disks?.appDir && health.disks.appDir.usagePercent > 90)
          issues.push('磁盘使用率超过 90%');
        return JSON.stringify({
          success: true,
          status: health.status,
          uptimeHours: Math.round((health.uptime / 3600) * 100) / 100,
          database: health.database?.status || 'unknown',
          memory: health.memory
            ? {
                usedMB: Math.round((health.memory.used / 1024 / 1024) * 100) / 100,
                totalMB: Math.round((health.memory.total / 1024 / 1024) * 100) / 100,
                percent: health.memory.usagePercent,
              }
            : null,
          disk: health.disks?.appDir
            ? {
                usedGB:
                  Math.round((health.disks.appDir.usedBytes / 1024 / 1024 / 1024) * 100) / 100,
                totalGB:
                  Math.round((health.disks.appDir.totalBytes / 1024 / 1024 / 1024) * 100) / 100,
                percent: health.disks.appDir.usagePercent,
              }
            : null,
          cpu: health.cpuLoad?.[0] || null,
          issues,
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 C: 报表 (4) + 报警 (3) + 标签 (2) = 9 个工具
// ============================================================

/** 35. report_template_list — 查询报表模板列表 */
export function createReportTemplateListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.reportService) return null;

  return {
    name: 'report_template_list',
    description: '获取项目中已保存的报表模板和已生成的报表列表。支持按报表类型筛选。',
    category: 'report',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'type',
        type: 'string',
        description: '报表类型筛选（可选：daily/monthly/custom/alarm/trend）',
        required: false,
      },
      { name: 'page', type: 'number', description: '页码（默认 1）', required: false },
      { name: 'pageSize', type: 'number', description: '每页条数（默认 20）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, type, page, pageSize } = params;
      try {
        const result = await services.reportService!.queryReports(String(projectId), {
          type: type ? String(type) : undefined,
          page: typeof page === 'number' ? page : 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 20,
        });
        return JSON.stringify({
          success: true,
          total: result.pagination.total,
          page: result.pagination.page,
          reports: result.data,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 36. report_template_create — 创建报表模板 */
export function createReportTemplateCreateTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.reportService) return null;

  return {
    name: 'report_template_create',
    description:
      '保存一个新的报表模板配置。包含模板名称、描述和配置参数（如时间范围、指标、标签等）。',
    category: 'report',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'name', type: 'string', description: '模板名称（必填）', required: true },
      { name: 'description', type: 'string', description: '模板描述', required: false },
      {
        name: 'config',
        type: 'object',
        description:
          '报表配置（必填）。示例：{"startDate":"2026-07-01","endDate":"2026-07-24","metrics":["avg","max"],"tagIds":["tag1"]}',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, name, description, config } = params;
      try {
        if (!config || typeof config !== 'object') {
          return JSON.stringify({ success: false, error: 'config 参数必填且需为对象' });
        }
        const result = await services.reportService!.saveReportConfig(String(projectId), {
          name: String(name),
          description: description ? String(description) : undefined,
          config: config as Record<string, unknown>,
        });
        return JSON.stringify({
          success: true,
          template: result,
          message: `报表模板 "${String(name)}" 已保存`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 37. report_schedule_create — 创建报表定时导出 */
export function createReportScheduleCreateTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.reportService) return null;

  return {
    name: 'report_schedule_create',
    description:
      '为报表模板创建定时导出计划。需指定模板 ID、Cron 表达式和导出格式。支持启用/禁用。',
    category: 'report',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'templateId', type: 'string', description: '报表模板 ID（必填）', required: true },
      {
        name: 'cronExpression',
        type: 'string',
        description: 'Cron 表达式（必填）。示例："0 8 * * *"（每天 8:00）',
        required: true,
      },
      {
        name: 'exportFormat',
        type: 'string',
        description: '导出格式（必填，如 csv/json/pdf）',
        required: true,
      },
      { name: 'enabled', type: 'boolean', description: '是否启用（默认 true）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, templateId, cronExpression, exportFormat, enabled } = params;
      try {
        const result = await services.reportService!.createSchedule(String(projectId), {
          templateId: String(templateId),
          cronExpression: String(cronExpression),
          exportFormat: String(exportFormat),
          enabled: enabled !== false,
        });
        return JSON.stringify({
          success: true,
          schedule: result,
          message: `定时导出已创建，Cron: ${String(cronExpression)}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 38. report_generate — 生成报表 */
export function createReportGenerateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.reportService) return null;

  return {
    name: 'report_generate',
    description: '根据指定参数生成报表。支持日报、月报、自定义报表、报警报表和趋势报表。',
    category: 'report',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'type',
        type: 'string',
        description: '报表类型（必填：daily/monthly/custom/alarm/trend）',
        required: true,
      },
      {
        name: 'date',
        type: 'string',
        description: '日报/月报的日期（ISO 格式，如 2026-07-24）',
        required: false,
      },
      { name: 'startDate', type: 'string', description: '自定义报表的开始日期', required: false },
      { name: 'endDate', type: 'string', description: '自定义报表的结束日期', required: false },
      {
        name: 'tagIds',
        type: 'array',
        description: '标签 ID 数组（趋势报表必填）',
        required: false,
      },
      {
        name: 'metrics',
        type: 'array',
        description: '指标类型（可选：avg/max/min/sum）',
        required: false,
      },
      {
        name: 'levels',
        type: 'array',
        description: '报警级别筛选（可选：info/warning/critical）',
        required: false,
      },
      {
        name: 'exportFormat',
        type: 'string',
        description: '导出格式（可选：csv/json/pdf）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const {
        projectId,
        type,
        date,
        startDate,
        endDate,
        tagIds,
        metrics,
        levels,
        exportFormat: _exportFormat,
      } = params;
      try {
        let result: Record<string, unknown>;
        const reportType = String(type).toLowerCase();

        switch (reportType) {
          case 'daily':
            result = await services.reportService!.generateDailyReport(
              String(projectId),
              date ? String(date) : new Date().toISOString().split('T')[0],
            );
            break;
          case 'monthly':
            result = await services.reportService!.generateMonthlyReport(
              String(projectId),
              date ? String(date) : new Date().toISOString().slice(0, 7),
            );
            break;
          case 'custom':
            if (!startDate || !endDate) {
              return JSON.stringify({
                success: false,
                error: '自定义报表需要 startDate 和 endDate',
              });
            }
            result = await services.reportService!.generateCustomReport(String(projectId), {
              startDate: String(startDate),
              endDate: String(endDate),
              metrics: metrics ? (metrics as string[]) : undefined,
              tagIds: tagIds ? (tagIds as string[]) : undefined,
            });
            break;
          case 'alarm':
            result = await services.reportService!.generateAlarmReport(String(projectId), {
              startDate: startDate
                ? String(startDate)
                : new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
              endDate: endDate ? String(endDate) : new Date().toISOString().split('T')[0],
              levels: levels ? (levels as string[]) : undefined,
            });
            break;
          case 'trend':
            if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
              return JSON.stringify({ success: false, error: '趋势报表需要 tagIds 参数' });
            }
            result = await services.reportService!.generateTrendReport(String(projectId), {
              startDate: startDate
                ? String(startDate)
                : new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
              endDate: endDate ? String(endDate) : new Date().toISOString().split('T')[0],
              tagIds: tagIds.map(String),
            });
            break;
          default:
            return JSON.stringify({
              success: false,
              error: `不支持的报表类型: ${reportType}，请使用 daily/monthly/custom/alarm/trend`,
            });
        }

        return JSON.stringify({
          success: true,
          type: reportType,
          report: result,
          message: `${reportType} 报表已生成`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 39. alarm_rule_list — 查询报警规则列表 */
export function createAlarmRuleListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmService?.getRules) return null;

  return {
    name: 'alarm_rule_list',
    description:
      '获取项目中的所有报警规则。返回规则 ID、名称、关联标签、报警级别、触发条件和启用状态。',
    category: 'alarm',
    frontend: false,
    params: [{ name: 'projectId', type: 'string', description: '项目 ID', required: true }],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const rules = await services.alarmService!.getRules!(String(projectId));
        return JSON.stringify({
          success: true,
          total: rules.length,
          rules: rules.map((r) => ({
            id: r.id,
            name: r.name,
            tagId: r.tagId,
            level: r.level,
            condition: r.condition,
            conditionValue: r.conditionValue,
            enabled: r.enabled,
            debounceMs: r.debounceMs,
            debounceCount: r.debounceCount,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 40. alarm_rule_create — 创建报警规则 */
export function createAlarmRuleCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmService?.createRule) return null;

  return {
    name: 'alarm_rule_create',
    description:
      '创建新的报警规则。需指定规则名称、关联标签、报警级别、触发条件和阈值。支持防抖设置。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'name', type: 'string', description: '规则名称（必填）', required: true },
      { name: 'tagId', type: 'string', description: '关联标签 ID（必填）', required: true },
      {
        name: 'level',
        type: 'string',
        description: '报警级别（必填：info/warning/critical）',
        required: true,
      },
      {
        name: 'condition',
        type: 'string',
        description: '触发条件（必填：gt/lt/gte/lte/eq/neq）',
        required: true,
      },
      { name: 'conditionValue', type: 'number', description: '阈值（必填）', required: true },
      { name: 'description', type: 'string', description: '规则描述', required: false },
      { name: 'debounceMs', type: 'number', description: '防抖时间（ms）', required: false },
      { name: 'debounceCount', type: 'number', description: '防抖次数', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const {
        projectId,
        name,
        tagId,
        level,
        condition,
        conditionValue,
        description,
        debounceMs,
        debounceCount,
      } = params;
      try {
        const validConditions = ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'];
        if (!validConditions.includes(String(condition))) {
          return JSON.stringify({
            success: false,
            error: `不支持的条件: ${condition}，请使用 ${validConditions.join('/')}`,
          });
        }
        const result = await services.alarmService!.createRule!(String(projectId), {
          name: String(name),
          tagId: String(tagId),
          level: String(level),
          condition: String(condition),
          conditionValue: conditionValue,
          description: description ? String(description) : undefined,
          debounceMs: typeof debounceMs === 'number' ? debounceMs : undefined,
          debounceCount: typeof debounceCount === 'number' ? debounceCount : undefined,
        });
        return JSON.stringify({
          success: true,
          rule: { id: result.id, name: result.name },
          message: `报警规则 "${result.name}" 已创建`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 41. alarm_suppression_add — 添加报警抑制规则 */
export function createAlarmSuppressionAddTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.alarmService?.addSuppressionRule) return null;

  return {
    name: 'alarm_suppression_add',
    description:
      '添加报警抑制规则。支持父子规则抑制、设备级抑制和定时抑制。抑制期间符合条件的报警不会触发通知。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'type',
        type: 'string',
        description: '抑制类型（必填：parent_child/device/time）',
        required: true,
      },
      {
        name: 'parentRuleId',
        type: 'string',
        description: '父规则 ID（parent_child 类型）',
        required: false,
      },
      {
        name: 'childRuleIds',
        type: 'array',
        description: '子规则 ID 数组（parent_child 类型）',
        required: false,
      },
      {
        name: 'devices',
        type: 'array',
        description: '设备 ID 数组（device 类型）',
        required: false,
      },
      {
        name: 'duration',
        type: 'number',
        description: '抑制时长（秒，time 类型）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, type, parentRuleId, childRuleIds, devices, duration } = params;
      try {
        const result = await services.alarmService!.addSuppressionRule!(String(projectId), {
          type: String(type),
          parentRuleId: parentRuleId ? String(parentRuleId) : undefined,
          childRuleIds: childRuleIds ? (childRuleIds as string[]) : undefined,
          devices: devices ? (devices as string[]) : undefined,
          duration: typeof duration === 'number' ? duration : undefined,
        });
        return JSON.stringify({
          success: true,
          suppression: { id: result.id },
          message: `抑制规则已添加（类型: ${type}）`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 42. datatag_configure — 配置单个数据标签 */
export function createDatatagConfigureTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.datatagService) return null;

  return {
    name: 'datatag_configure',
    description: '更新单个数据标签的配置参数，如名称、扫描频率、单位、启用状态等。',
    category: 'datatag',
    frontend: false,
    params: [
      { name: 'tagId', type: 'string', description: '标签 ID（必填）', required: true },
      { name: 'name', type: 'string', description: '标签名称', required: false },
      { name: 'unit', type: 'string', description: '单位', required: false },
      { name: 'scanRate', type: 'number', description: '扫描频率（ms）', required: false },
      { name: 'enabled', type: 'boolean', description: '是否启用', required: false },
      { name: 'description', type: 'string', description: '描述', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagId, ...rest } = params;
      try {
        const dto: Record<string, unknown> = {};
        if (rest.name !== undefined) dto.name = String(rest.name);
        if (rest.unit !== undefined) dto.unit = String(rest.unit);
        if (rest.scanRate !== undefined) dto.scanRate = Number(rest.scanRate);
        if (rest.enabled !== undefined) dto.enabled = Boolean(rest.enabled);
        if (rest.description !== undefined) dto.description = String(rest.description);

        if (Object.keys(dto).length === 0) {
          return JSON.stringify({ success: false, error: '请至少指定一个要更新的配置项' });
        }

        const result = await services.datatagService!.update(String(tagId), dto);
        return JSON.stringify({
          success: true,
          tag: { id: result.id, name: result.name },
          message: `标签 "${result.name}" 配置已更新`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 43. datatag_batch_configure — 批量配置数据标签 */
export function createDatatagBatchConfigureTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.datatagService) return null;

  return {
    name: 'datatag_batch_configure',
    description:
      '批量更新多个数据标签的配置参数。适用于批量启用/禁用标签、统一修改扫描频率等场景。',
    category: 'datatag',
    frontend: false,
    params: [
      { name: 'tagIds', type: 'array', description: '标签 ID 数组（必填）', required: true },
      { name: 'enabled', type: 'boolean', description: '是否启用', required: false },
      { name: 'scanRate', type: 'number', description: '扫描频率（ms）', required: false },
      { name: 'unit', type: 'string', description: '单位', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { tagIds, ...rest } = params;
      try {
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
          return JSON.stringify({ success: false, error: 'tagIds 需为非空数组' });
        }
        const dto: Record<string, unknown> = {};
        if (rest.enabled !== undefined) dto.enabled = Boolean(rest.enabled);
        if (rest.scanRate !== undefined) dto.scanRate = Number(rest.scanRate);
        if (rest.unit !== undefined) dto.unit = String(rest.unit);

        if (Object.keys(dto).length === 0) {
          return JSON.stringify({ success: false, error: '请至少指定一个要更新的配置项' });
        }

        const results = await services.datatagService!.batchUpdate(
          (tagIds as string[]).map(String),
          dto,
        );
        return JSON.stringify({
          success: true,
          updatedCount: results.length,
          tags: results.map((r) => ({ id: r.id, name: r.name })),
          message: `已批量更新 ${results.length} 个标签`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 D: 脚本 (5) = 5 个工具
// ============================================================

/** 44. script_api_list — 查询脚本 API 列表 */
export function createScriptApiListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.scriptService) return null;

  return {
    name: 'script_api_list',
    description:
      '获取脚本引擎中可用的 API 函数列表。包括函数名、描述和参数定义，帮助用户编写自动化脚本。',
    category: 'script',
    frontend: false,
    params: [],
    execute: async (_params: Record<string, unknown>) => {
      try {
        const apis = await services.scriptService!.getApiFunctions();
        return JSON.stringify({
          success: true,
          total: apis.length,
          apis: apis.map((api) => ({
            name: api.name,
            description: api.description,
            parameters: api.parameters,
          })),
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 45. script_validate — 校验脚本语法 */
export function createScriptValidateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.scriptService) return null;

  return {
    name: 'script_validate',
    description:
      '校验 JavaScript 脚本代码的语法正确性。返回语法错误信息或校验通过。注意：仅检查语法，不执行代码。',
    category: 'script',
    frontend: false,
    params: [
      { name: 'code', type: 'string', description: 'JavaScript 脚本代码（必填）', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { code } = params;
      try {
        // 使用 try-catch 包裹 SyntaxError 检查
        try {
          new Function(String(code));
          return JSON.stringify({
            success: true,
            valid: true,
            message: '脚本语法校验通过',
          });
        } catch (syntaxErr: unknown) {
          return JSON.stringify({
            success: true,
            valid: false,
            error: String((syntaxErr as Error).message),
            message: '脚本语法校验未通过，请修正后重试',
          });
        }
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 46. script_dry_run — 脚本试运行 */
export function createScriptDryRunTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.scriptService) return null;

  return {
    name: 'script_dry_run',
    description:
      '在沙箱中试运行脚本代码，不实际保存到数据库。返回执行结果、日志和可能的错误。适合在正式创建脚本前验证逻辑。',
    category: 'script',
    frontend: false,
    params: [
      { name: 'code', type: 'string', description: 'JavaScript 脚本代码（必填）', required: true },
      { name: 'projectId', type: 'string', description: '项目 ID（必填）', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { code, projectId } = params;
      try {
        // 语法检查
        try {
          new Function(String(code));
        } catch (syntaxErr: unknown) {
          return JSON.stringify({
            success: false,
            error: `语法错误: ${String((syntaxErr as Error).message)}`,
          });
        }

        // 创建临时脚本并执行
        const tempScript = await services.scriptService!.create({
          name: `_dry_run_${Date.now()}`,
          code: String(code),
          triggerType: 'manual',
          projectId: String(projectId),
          enabled: false,
        });
        const result = await services.scriptService!.executeScript(
          tempScript.id,
          String(projectId),
        );
        return JSON.stringify({
          success: result.success,
          logs: result.logs,
          result: result.result,
          error: result.error,
          message: result.success ? '试运行成功' : `试运行失败: ${result.error}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 47. script_create — 创建脚本 */
export function createScriptCreateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.scriptService) return null;

  return {
    name: 'script_create',
    description:
      '创建新的自动化脚本。支持手动触发、定时触发（Cron）、事件触发三种类型。创建前建议先调用 script_validate 校验代码。',
    category: 'script',
    frontend: false,
    params: [
      { name: 'name', type: 'string', description: '脚本名称（必填）', required: true },
      { name: 'code', type: 'string', description: 'JavaScript 脚本代码（必填）', required: true },
      {
        name: 'triggerType',
        type: 'string',
        description: '触发类型（必填：manual/scheduled/event）',
        required: true,
      },
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'cronExpression',
        type: 'string',
        description: 'Cron 表达式（scheduled 类型必填，如 "*/5 * * * *"）',
        required: false,
      },
      { name: 'enabled', type: 'boolean', description: '是否启用（默认 true）', required: false },
      { name: 'description', type: 'string', description: '脚本描述', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const {
        name,
        code,
        triggerType,
        projectId,
        cronExpression,
        enabled,
        description: _description,
      } = params;
      try {
        const validTypes = ['manual', 'scheduled', 'event'];
        if (!validTypes.includes(String(triggerType))) {
          return JSON.stringify({
            success: false,
            error: `不支持的触发类型: ${triggerType}，请使用 manual/scheduled/event`,
          });
        }
        if (String(triggerType) === 'scheduled' && !cronExpression) {
          return JSON.stringify({
            success: false,
            error: 'scheduled 类型需要 cronExpression 参数',
          });
        }
        const result = await services.scriptService!.create({
          name: String(name),
          code: String(code),
          triggerType: String(triggerType),
          projectId: String(projectId),
          cronExpression: cronExpression ? String(cronExpression) : undefined,
          enabled: enabled !== false,
        });
        return JSON.stringify({
          success: true,
          script: { id: result.id, name: result.name },
          message: `脚本 "${result.name}" 已创建（触发类型: ${triggerType}）`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 48. script_execute — 执行脚本 */
export function createScriptExecuteTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.scriptService) return null;

  return {
    name: 'script_execute',
    description:
      '执行指定的脚本并返回结果。仅支持手动触发类型的脚本。返回执行日志、结果和可能的错误信息。',
    category: 'script',
    frontend: false,
    params: [
      { name: 'scriptId', type: 'string', description: '脚本 ID（必填）', required: true },
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { scriptId, projectId } = params;
      try {
        const result = await services.scriptService!.executeScript(
          String(scriptId),
          String(projectId),
        );
        return JSON.stringify({
          success: result.success,
          logs: result.logs,
          result: result.result,
          error: result.error,
          message: result.success ? '脚本执行成功' : `脚本执行失败: ${result.error}`,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 E: 报警处理与运维（7 个工具）
// ============================================================

/** 49. alarm_acknowledge — 确认报警 */
export function createAlarmAcknowledgeTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_acknowledge',
    description:
      '确认单条或多条报警记录。确认后报警状态变为 acknowledged。危险操作：会改变报警状态。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'recordId',
        type: 'string',
        description: '报警记录 ID（单条确认时必填）',
        required: false,
      },
      {
        name: 'recordIds',
        type: 'array',
        description: '报警记录 ID 数组（批量确认时必填）',
        required: false,
      },
      {
        name: 'userId',
        type: 'string',
        description: '操作人用户 ID（默认 admin）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, recordId, recordIds, userId } = params;
      try {
        const uid = String(userId || 'admin');
        if (Array.isArray(recordIds) && recordIds.length > 0) {
          const result = await services.alarmOpsService!.batchAcknowledge(
            recordIds.map(String),
            uid,
            String(projectId),
          );
          return JSON.stringify({ success: true, acknowledged: recordIds.length, result });
        }
        if (!recordId) {
          return JSON.stringify({ success: false, error: 'recordId 或 recordIds 至少提供一个' });
        }
        const result = await services.alarmOpsService!.acknowledge(
          String(recordId),
          uid,
          String(projectId),
        );
        return JSON.stringify({ success: true, recordId: String(recordId), result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 50. alarm_clear — 清除报警 */
export function createAlarmClearTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_clear',
    description: '清除已确认的报警记录。清除后报警状态变为 cleared，不再活跃。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'recordId', type: 'string', description: '报警记录 ID', required: true },
      {
        name: 'userId',
        type: 'string',
        description: '操作人用户 ID（默认 admin）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, recordId, userId } = params;
      try {
        const result = await services.alarmOpsService!.clear(
          String(recordId),
          String(userId || 'admin'),
          String(projectId),
        );
        return JSON.stringify({ success: true, recordId: String(recordId), result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 51. alarm_shelve — 搁置报警 */
export function createAlarmShelveTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_shelve',
    description: '搁置报警指定时长（秒），期间不产生通知。用于暂时屏蔽已知问题。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'recordId', type: 'string', description: '报警记录 ID', required: true },
      { name: 'duration', type: 'number', description: '搁置时长（秒）', required: true },
      {
        name: 'userId',
        type: 'string',
        description: '操作人用户 ID（默认 admin）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, recordId, duration, userId } = params;
      try {
        const dur = Number(duration);
        if (isNaN(dur) || dur <= 0) {
          return JSON.stringify({ success: false, error: 'duration 必须为正数（秒）' });
        }
        const result = await services.alarmOpsService!.shelve(
          String(recordId),
          dur,
          String(userId || 'admin'),
          String(projectId),
        );
        return JSON.stringify({ success: true, recordId: String(recordId), duration: dur, result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 52. alarm_statistics — 报警统计分析 */
export function createAlarmStatisticsTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_statistics',
    description: '获取项目报警统计：总数/活跃/已确认/已清除/已搁置，按级别和状态分组。',
    category: 'alarm',
    frontend: false,
    params: [{ name: 'projectId', type: 'string', description: '项目 ID', required: true }],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const stats = await services.alarmOpsService!.getStatistics(String(projectId));
        return JSON.stringify({ success: true, projectId: String(projectId), statistics: stats });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 53. alarm_escalation_list — 查询升级规则 */
export function createAlarmEscalationListTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_escalation_list',
    description:
      '查询项目中的报警升级规则列表。升级规则定义了报警在特定条件下升级到更高级别的逻辑。',
    category: 'alarm',
    frontend: false,
    params: [{ name: 'projectId', type: 'string', description: '项目 ID', required: true }],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const rules = await services.alarmOpsService!.getSuppressionRules(String(projectId));
        return JSON.stringify({
          success: true,
          projectId: String(projectId),
          rules,
          total: Array.isArray(rules) ? rules.length : 0,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 54. alarm_suppression_list — 查询抑制规则 */
export function createAlarmSuppressionListTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_suppression_list',
    description: '查询项目中的报警抑制规则列表。抑制规则用于暂时屏蔽特定报警，避免噪音。',
    category: 'alarm',
    frontend: false,
    params: [{ name: 'projectId', type: 'string', description: '项目 ID', required: true }],
    execute: async (params: Record<string, unknown>) => {
      const { projectId } = params;
      try {
        const rules = await services.alarmOpsService!.getSuppressionRules(String(projectId));
        return JSON.stringify({
          success: true,
          projectId: String(projectId),
          suppressionRules: rules,
          total: Array.isArray(rules) ? rules.length : 0,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 55. alarm_rule_toggle — 启用/禁用报警规则 */
export function createAlarmRuleToggleTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.alarmOpsService) return null;
  return {
    name: 'alarm_rule_toggle',
    description: '启用或禁用报警规则。禁用后该规则不再触发新报警。危险操作：会影响报警检测。',
    category: 'alarm',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'ruleId', type: 'string', description: '报警规则 ID', required: true },
      { name: 'enabled', type: 'boolean', description: 'true=启用，false=禁用', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, ruleId, enabled } = params;
      try {
        const result = await services.alarmOpsService!.toggleRule(
          String(ruleId),
          Boolean(enabled),
          String(projectId),
        );
        return JSON.stringify({
          success: true,
          ruleId: String(ruleId),
          enabled: Boolean(enabled),
          result,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 F: 设备运维管理（6 个工具）
// ============================================================

/** 56. device_list — 查询设备列表 */
export function createDeviceListTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceService) return null;
  return {
    name: 'device_list',
    description:
      '查询项目中的设备列表，支持按状态、分组、关键词筛选。返回设备 ID、名称、类型、状态等。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'status',
        type: 'string',
        description: '状态筛选（online/offline/connecting/degraded/error）',
        required: false,
      },
      { name: 'groupId', type: 'string', description: '按分组筛选', required: false },
      { name: 'keyword', type: 'string', description: '关键词搜索设备名称', required: false },
      { name: 'page', type: 'number', description: '页码（默认 1）', required: false },
      { name: 'pageSize', type: 'number', description: '每页条数（默认 50）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, status, groupId, keyword, page, pageSize } = params;
      try {
        const result = await services.deviceService!.findAll(String(projectId), {
          status: status ? String(status) : undefined,
          groupId: groupId ? String(groupId) : undefined,
          keyword: keyword ? String(keyword) : undefined,
          page: typeof page === 'number' ? page : 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 50,
        });
        return JSON.stringify({
          success: true,
          total: result.pagination.total,
          devices: result.data.slice(0, 30).map((d) => ({
            id: d.id,
            deviceName: d.deviceName,
            type: d.type,
            status: d.status,
            groupId: d.groupId,
          })),
          hint:
            result.data.length > 30 ? `显示前 30 条，共 ${result.pagination.total} 条` : undefined,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 57. device_update — 更新设备配置 */
export function createDeviceUpdateTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceOpsService) return null;
  return {
    name: 'device_update',
    description: '更新设备配置（采集周期、连接参数、分组、描述等）。危险操作：可能影响数据采集。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'deviceId', type: 'string', description: '设备 ID', required: true },
      { name: 'name', type: 'string', description: '设备名称', required: false },
      { name: 'scanRate', type: 'number', description: '采集周期(ms)', required: false },
      {
        name: 'groupId',
        type: 'string',
        description: '分组 ID（设为 null 移出分组）',
        required: false,
      },
      { name: 'description', type: 'string', description: '设备描述', required: false },
      { name: 'enabled', type: 'boolean', description: '是否启用', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, deviceId, name, scanRate, groupId, description, enabled } = params;
      try {
        const dto: Record<string, unknown> = {};
        if (name !== undefined) dto.deviceName = String(name);
        if (scanRate !== undefined) dto.scanRate = Number(scanRate);
        if (groupId !== undefined) dto.groupId = groupId === null ? null : String(groupId);
        if (description !== undefined) dto.description = String(description);
        if (enabled !== undefined) dto.enabled = Boolean(enabled);
        const result = await services.deviceOpsService!.update(
          String(deviceId),
          dto,
          String(projectId),
        );
        return JSON.stringify({ success: true, deviceId: String(deviceId), device: result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 58. device_delete — 删除设备 */
export function createDeviceDeleteTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceOpsService) return null;
  return {
    name: 'device_delete',
    description: '删除设备及其关联的标签和采集任务。操作不可逆。危险操作：会永久删除数据。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'deviceId', type: 'string', description: '设备 ID', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, deviceId } = params;
      try {
        await services.deviceOpsService!.remove(String(deviceId), String(projectId));
        return JSON.stringify({ success: true, deviceId: String(deviceId), deleted: true });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 59. device_group_manage — 设备分组管理 */
export function createDeviceGroupManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceGroupService) return null;
  return {
    name: 'device_group_manage',
    description:
      '设备分组的创建/查询/更新/删除操作。支持 list/tree/create/update/delete 五种操作。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      {
        name: 'action',
        type: 'string',
        description: '操作类型（list/tree/create/update/delete）',
        required: true,
      },
      {
        name: 'groupId',
        type: 'string',
        description: '分组 ID（update/delete 时必填）',
        required: false,
      },
      {
        name: 'name',
        type: 'string',
        description: '分组名称（create/update 时）',
        required: false,
      },
      { name: 'parentId', type: 'string', description: '父分组 ID（create 时）', required: false },
      { name: 'description', type: 'string', description: '分组描述', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, action, groupId, name, parentId, description } = params;
      try {
        const act = String(action);
        const pid = String(projectId);
        if (act === 'list') {
          const groups = await services.deviceGroupService!.getGroups(pid);
          return JSON.stringify({ success: true, groups, total: groups.length });
        }
        if (act === 'tree') {
          const tree = await services.deviceGroupService!.getGroupTree(pid);
          return JSON.stringify({ success: true, tree });
        }
        if (act === 'create') {
          const result = await services.deviceGroupService!.createGroup(pid, {
            name: String(name),
            parentId: parentId ? String(parentId) : undefined,
            description: description ? String(description) : undefined,
          });
          return JSON.stringify({ success: true, group: result });
        }
        if (act === 'update') {
          if (!groupId) return JSON.stringify({ success: false, error: 'update 操作需要 groupId' });
          const result = await services.deviceGroupService!.updateGroup(pid, String(groupId), {
            name: name ? String(name) : undefined,
            description: description ? String(description) : undefined,
          });
          return JSON.stringify({ success: true, group: result });
        }
        if (act === 'delete') {
          if (!groupId) return JSON.stringify({ success: false, error: 'delete 操作需要 groupId' });
          await services.deviceGroupService!.deleteGroup(pid, String(groupId));
          return JSON.stringify({ success: true, deleted: true });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 60. device_diagnostic — 设备诊断 */
export function createDeviceDiagnosticTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceDiagnosticService) return null;
  return {
    name: 'device_diagnostic',
    description:
      '对设备进行诊断，支持 ping 连通性、read-tag 读标签、write-tag 写标签、scan-addresses 扫描地址。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'deviceId', type: 'string', description: '设备 ID', required: true },
      {
        name: 'action',
        type: 'string',
        description: '诊断类型（ping/read-tag/write-tag/scan-addresses/full）',
        required: true,
      },
      { name: 'host', type: 'string', description: 'ping 时的主机 IP', required: false },
      { name: 'port', type: 'number', description: 'ping 时的端口', required: false },
      {
        name: 'tagId',
        type: 'string',
        description: 'read-tag/write-tag 时的标签 ID',
        required: false,
      },
      { name: 'address', type: 'string', description: '寄存器地址', required: false },
      { name: 'value', type: 'string', description: 'write-tag 时的写入值', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { deviceId, action, host, port, tagId, address, value } = params;
      try {
        const act = String(action);
        const diagParams: Record<string, unknown> = {};
        if (tagId) diagParams.tagId = String(tagId);
        if (address) diagParams.address = String(address);
        if (value !== undefined) diagParams.value = value;
        if (act === 'ping') {
          if (!host || !port)
            return JSON.stringify({ success: false, error: 'ping 需要 host 和 port 参数' });
          const result = await services.deviceDiagnosticService!.ping(
            String(deviceId),
            String(host),
            Number(port),
          );
          return JSON.stringify({ success: true, deviceId: String(deviceId), action: act, result });
        }
        const result = await services.deviceDiagnosticService!.runDiagnostic(
          String(deviceId),
          act,
          diagParams,
        );
        return JSON.stringify({ success: true, deviceId: String(deviceId), action: act, result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 61. device_write_tag — 写入设备标签值 */
export function createDeviceWriteTagTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.deviceOpsService) return null;
  return {
    name: 'device_write_tag',
    description:
      '向设备标签写入值，用于远程控制（开关阀门、启停电机等）。危险操作：会直接控制物理设备。',
    category: 'device',
    frontend: false,
    params: [
      { name: 'projectId', type: 'string', description: '项目 ID', required: true },
      { name: 'deviceId', type: 'string', description: '设备 ID', required: true },
      { name: 'tagId', type: 'string', description: '标签 ID', required: true },
      { name: 'value', type: 'string', description: '要写入的值', required: true },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { projectId, deviceId, tagId, value } = params;
      try {
        const result = await services.deviceOpsService!.writeTagValue(
          String(deviceId),
          String(tagId),
          value,
          String(projectId),
        );
        return JSON.stringify({
          success: true,
          deviceId: String(deviceId),
          tagId: String(tagId),
          value,
          result,
        });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 G: 用户权限管理（5 个工具）
// ============================================================

/** 62. user_manage — 用户管理 */
export function createUserManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.userService) return null;
  return {
    name: 'user_manage',
    description: '用户的查询/创建/更新/启停/重置密码/删除操作。危险操作：涉及账号安全。',
    category: 'permission',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '操作类型（list/detail/create/update/toggle-status/reset-password/delete）',
        required: true,
      },
      {
        name: 'userId',
        type: 'string',
        description: '用户 ID（detail/update/toggle-status/reset-password/delete 时必填）',
        required: false,
      },
      { name: 'username', type: 'string', description: '用户名（create 时必填）', required: false },
      { name: 'password', type: 'string', description: '密码（create 时必填）', required: false },
      {
        name: 'role',
        type: 'string',
        description: '角色（admin/operator/viewer）',
        required: false,
      },
      { name: 'email', type: 'string', description: '邮箱', required: false },
      {
        name: 'isActive',
        type: 'boolean',
        description: '启用/禁用（toggle-status 时）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, userId, username, password, role, email, isActive } = params;
      try {
        const act = String(action);
        if (act === 'list') {
          const users = await services.userService!.findAll({});
          return JSON.stringify({ success: true, users, total: users.length });
        }
        if (act === 'create') {
          if (!username || !password)
            return JSON.stringify({ success: false, error: 'create 需要 username 和 password' });
          const result = await services.userService!.adminCreateUser({
            username: String(username),
            password: String(password),
            role: role ? String(role) : 'viewer',
            email: email ? String(email) : undefined,
          });
          return JSON.stringify({ success: true, user: result });
        }
        if (act === 'toggle-status') {
          if (!userId)
            return JSON.stringify({ success: false, error: 'toggle-status 需要 userId' });
          const result = await services.userService!.toggleUserStatus(
            String(userId),
            Boolean(isActive),
          );
          return JSON.stringify({
            success: true,
            userId: String(userId),
            isActive: Boolean(isActive),
            result,
          });
        }
        if (act === 'reset-password') {
          if (!userId)
            return JSON.stringify({ success: false, error: 'reset-password 需要 userId' });
          const result = await services.userService!.resetPassword(String(userId));
          return JSON.stringify({
            success: true,
            userId: String(userId),
            tempPassword: result.tempPassword || result.password,
          });
        }
        if (act === 'delete') {
          if (!userId) return JSON.stringify({ success: false, error: 'delete 需要 userId' });
          await services.userService!.deleteUser(String(userId));
          return JSON.stringify({ success: true, userId: String(userId), deleted: true });
        }
        if (act === 'update') {
          if (!userId) return JSON.stringify({ success: false, error: 'update 需要 userId' });
          const dto: Record<string, unknown> = {};
          if (username) dto.username = String(username);
          if (role) dto.role = String(role);
          if (email) dto.email = String(email);
          const result = await services.userService!.adminUpdateUser(String(userId), dto);
          return JSON.stringify({ success: true, user: result });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 63. role_manage — 角色与授权管理 */
export function createRoleManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.roleService) return null;
  return {
    name: 'role_manage',
    description:
      '角色 CRUD + 项目/设备授权配置。支持 list/detail/create/update/delete/get-project-auths/set-project-auths 等操作。',
    category: 'permission',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型', required: true },
      {
        name: 'roleId',
        type: 'string',
        description: '角色 ID（除 list/create 外必填）',
        required: false,
      },
      {
        name: 'projectId',
        type: 'string',
        description: '项目 ID（device-auths 时必填）',
        required: false,
      },
      {
        name: 'name',
        type: 'string',
        description: '角色名称（create/update 时）',
        required: false,
      },
      { name: 'code', type: 'string', description: '角色代码（create 时）', required: false },
      { name: 'description', type: 'string', description: '角色描述', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, roleId, projectId, name, code, description } = params;
      try {
        const act = String(action);
        if (act === 'list') {
          const roles = await services.roleService!.findAll();
          return JSON.stringify({ success: true, roles, total: roles.length });
        }
        if (act === 'create') {
          const result = await services.roleService!.create({
            name: String(name || ''),
            code: String(code || ''),
            description: description ? String(description) : undefined,
          });
          return JSON.stringify({ success: true, role: result });
        }
        if (!roleId) return JSON.stringify({ success: false, error: '该操作需要 roleId' });
        if (act === 'detail') {
          const role = await services.roleService!.findById(String(roleId));
          return JSON.stringify({ success: true, role });
        }
        if (act === 'update') {
          const dto: Record<string, unknown> = {};
          if (name) dto.name = String(name);
          if (description) dto.description = String(description);
          const result = await services.roleService!.update(String(roleId), dto);
          return JSON.stringify({ success: true, role: result });
        }
        if (act === 'delete') {
          await services.roleService!.delete(String(roleId));
          return JSON.stringify({ success: true, deleted: true });
        }
        if (act === 'get-project-auths') {
          const auths = await services.roleService!.getProjectAuths(String(roleId));
          return JSON.stringify({ success: true, projectAuths: auths });
        }
        if (act === 'get-device-auths') {
          if (!projectId) return JSON.stringify({ success: false, error: '需要 projectId' });
          const auths = await services.roleService!.getDeviceAuths(
            String(roleId),
            String(projectId),
          );
          return JSON.stringify({ success: true, deviceAuths: auths });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 64. menu_manage — 菜单与按钮权限 */
export function createMenuManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.menuService) return null;
  return {
    name: 'menu_manage',
    description:
      '菜单树 CRUD + 按钮权限管理。支持 get-tree/create-item/update-item/delete-item/get-buttons 等操作。',
    category: 'permission',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型', required: true },
      {
        name: 'menuId',
        type: 'string',
        description: '菜单 ID（update-item/delete-item 时）',
        required: false,
      },
      {
        name: 'subsystem',
        type: 'string',
        description: '子系统标识（get-tree 时筛选）',
        required: false,
      },
      {
        name: 'labelKey',
        type: 'string',
        description: '菜单标签 key（create-item 时）',
        required: false,
      },
      { name: 'path', type: 'string', description: '菜单路径', required: false },
      { name: 'icon', type: 'string', description: '菜单图标', required: false },
      { name: 'parentId', type: 'string', description: '父菜单 ID', required: false },
      { name: 'sortOrder', type: 'number', description: '排序', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, menuId, subsystem, labelKey, path, icon, parentId, sortOrder } = params;
      try {
        const act = String(action);
        if (act === 'get-tree') {
          const tree = await services.menuService!.getMenu(
            subsystem ? String(subsystem) : undefined,
          );
          return JSON.stringify({ success: true, tree, total: tree.length });
        }
        if (act === 'get-buttons') {
          const buttons = await services.menuService!.getMenuButtons();
          return JSON.stringify({ success: true, buttons, total: buttons.length });
        }
        if (act === 'create-item') {
          await services.menuService!.createMenuItem(
            {
              labelKey: labelKey ? String(labelKey) : undefined,
              path: path ? String(path) : undefined,
              icon: icon ? String(icon) : undefined,
              sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
            },
            parentId ? String(parentId) : null,
          );
          return JSON.stringify({ success: true, created: true });
        }
        if (act === 'update-item') {
          if (!menuId) return JSON.stringify({ success: false, error: '需要 menuId' });
          await services.menuService!.updateMenuItem(
            String(menuId),
            {
              labelKey: labelKey ? String(labelKey) : undefined,
              path: path ? String(path) : undefined,
              icon: icon ? String(icon) : undefined,
              sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
            },
            parentId ? String(parentId) : undefined,
          );
          return JSON.stringify({ success: true, updated: true });
        }
        if (act === 'delete-item') {
          if (!menuId) return JSON.stringify({ success: false, error: '需要 menuId' });
          await services.menuService!.deleteMenuItem(String(menuId));
          return JSON.stringify({ success: true, deleted: true });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 65. session_manage — 会话管理 */
export function createSessionManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.sessionService) return null;
  return {
    name: 'session_manage',
    description: '查询在线会话、强制下线、查询登录历史。管理员可操作任意用户会话。',
    category: 'permission',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '操作类型（list/force-logout/logout-others/history）',
        required: true,
      },
      {
        name: 'userId',
        type: 'string',
        description: '用户 ID（默认 admin 用户）',
        required: false,
      },
      {
        name: 'sessionId',
        type: 'string',
        description: '会话 ID（force-logout 时必填）',
        required: false,
      },
      {
        name: 'currentSessionId',
        type: 'string',
        description: '当前会话 ID（logout-others 时必填）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, userId, sessionId, currentSessionId } = params;
      try {
        const act = String(action);
        const uid = String(userId || 'admin');
        if (act === 'list') {
          const sessions = services.sessionService!.getUserSessions(uid);
          return JSON.stringify({ success: true, sessions, count: sessions.length });
        }
        if (act === 'history') {
          const history = services.sessionService!.getLoginHistory(uid);
          return JSON.stringify({ success: true, history, count: history.length });
        }
        if (act === 'force-logout') {
          if (!sessionId) return JSON.stringify({ success: false, error: '需要 sessionId' });
          const result = services.sessionService!.forceLogout(String(sessionId));
          return JSON.stringify({ success: result, sessionId: String(sessionId) });
        }
        if (act === 'logout-others') {
          if (!currentSessionId)
            return JSON.stringify({ success: false, error: '需要 currentSessionId' });
          const count = services.sessionService!.logoutAllExcept(uid, String(currentSessionId));
          return JSON.stringify({ success: true, loggedOutCount: count });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 66. audit_log_query — 审计日志查询 */
export function createAuditLogQueryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.auditLogService) return null;
  return {
    name: 'audit_log_query',
    description: '查询操作审计日志和统计，支持按用户/操作/资源/时间筛选，可选清理过期日志。',
    category: 'permission',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '查询类型（query/stats/cleanup）',
        required: true,
      },
      { name: 'userId', type: 'string', description: '用户 ID 筛选', required: false },
      { name: 'username', type: 'string', description: '用户名筛选', required: false },
      {
        name: 'opAction',
        type: 'string',
        description: '操作类型筛选（create/update/delete/login/logout）',
        required: false,
      },
      { name: 'resource', type: 'string', description: '资源类型筛选', required: false },
      {
        name: 'status',
        type: 'string',
        description: '状态筛选（success/failed）',
        required: false,
      },
      { name: 'startTime', type: 'string', description: '开始时间（ISO 8601）', required: false },
      { name: 'endTime', type: 'string', description: '结束时间（ISO 8601）', required: false },
      { name: 'page', type: 'number', description: '页码（默认 1）', required: false },
      { name: 'pageSize', type: 'number', description: '每页条数（默认 20）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const {
        action,
        userId,
        username,
        opAction,
        resource,
        status,
        startTime,
        endTime,
        page,
        pageSize,
      } = params;
      try {
        const act = String(action);
        if (act === 'stats') {
          const stats = await services.auditLogService!.getStats();
          return JSON.stringify({ success: true, stats });
        }
        if (act === 'cleanup') {
          const deleted = await services.auditLogService!.cleanupExpired();
          return JSON.stringify({ success: true, deleted });
        }
        const result = await services.auditLogService!.query({
          userId: userId ? String(userId) : undefined,
          username: username ? String(username) : undefined,
          action: opAction ? String(opAction) : undefined,
          resource: resource ? String(resource) : undefined,
          status: status ? String(status) : undefined,
          startTime: startTime ? String(startTime) : undefined,
          endTime: endTime ? String(endTime) : undefined,
          page: typeof page === 'number' ? page : 1,
          pageSize: typeof pageSize === 'number' ? pageSize : 20,
        });
        return JSON.stringify({ success: true, result });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 H: 采集器与服务运维（7 个工具）
// ============================================================

/** 67. plugin_manage — 采集插件管理 */
export function createPluginManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.pluginManagerService) return null;
  return {
    name: 'plugin_manage',
    description:
      '采集插件的列表/激活/停用/热更新/回滚/校验/监控。危险操作：激活/停用会影响该协议下所有设备。',
    category: 'collector',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型', required: true },
      {
        name: 'protocol',
        type: 'string',
        description: '协议名称（除 list/discover/health 外必填）',
        required: false,
      },
      { name: 'status', type: 'string', description: '状态筛选（list 时）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, protocol, status } = params;
      try {
        const act = String(action);
        if (act === 'list') {
          const plugins = await services.pluginManagerService!.listPlugins(
            status ? { status: String(status) } : {},
          );
          return JSON.stringify({ success: true, plugins, total: plugins.length });
        }
        if (act === 'health') {
          const report = await services.pluginManagerService!.healthCheck();
          return JSON.stringify({ success: true, report });
        }
        if (!protocol) return JSON.stringify({ success: false, error: '该操作需要 protocol' });
        const p = String(protocol);
        if (act === 'detail' || act === 'status') {
          const s = services.pluginManagerService!.getPluginStatus(p);
          return JSON.stringify({ success: true, protocol: p, status: s });
        }
        if (act === 'activate') {
          const result = await services.pluginManagerService!.activate(p);
          return JSON.stringify({ success: true, protocol: p, result });
        }
        if (act === 'deactivate') {
          const result = await services.pluginManagerService!.deactivate(p);
          return JSON.stringify({ success: true, protocol: p, result });
        }
        if (act === 'update') {
          const result = await services.pluginManagerService!.hotReload(p);
          return JSON.stringify({ success: true, protocol: p, result });
        }
        if (act === 'rollback') {
          const result = await services.pluginManagerService!.rollback(p);
          return JSON.stringify({ success: true, protocol: p, result });
        }
        if (act === 'monitor') {
          const data = await services.pluginManagerService!.getMonitorData(p);
          return JSON.stringify({ success: true, protocol: p, monitor: data });
        }
        if (act === 'get-config') {
          const cfg = services.pluginManagerService!.getPluginConfig(p);
          return JSON.stringify({ success: true, protocol: p, config: cfg });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 68. pipeline_diagnose — Pipeline 诊断 */
export function createPipelineDiagnoseTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.pipelineDiagService) return null;
  return {
    name: 'pipeline_diagnose',
    description: 'Pipeline 编排引擎的诊断、指标、百分位、耗时分解。用于排查采集性能问题。',
    category: 'collector',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '诊断类型（metrics/percentiles/breakdowns/diagnostic）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action } = params;
      try {
        const act = String(action);
        if (act === 'metrics') {
          const snapshot = services.pipelineDiagService!.getMetricsSnapshot();
          return JSON.stringify({ success: true, metrics: snapshot });
        }
        if (act === 'percentiles') {
          const stats = services.pipelineDiagService!.getStepTimingStats();
          return JSON.stringify({ success: true, percentiles: stats });
        }
        if (act === 'breakdowns') {
          const breakdowns = services.pipelineDiagService!.getTimingBreakdowns(50);
          return JSON.stringify({ success: true, breakdowns, total: breakdowns.length });
        }
        if (act === 'diagnostic') {
          const info = services.pipelineDiagService!.getDiagnosticInfo();
          const metrics = services.pipelineDiagService!.getMetricsSnapshot();
          return JSON.stringify({ success: true, diagnostic: { orchestrator: info, metrics } });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 69. offline_cache_manage — 离线缓存管理 */
export function createOfflineCacheManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.offlineCacheService) return null;
  return {
    name: 'offline_cache_manage',
    description:
      'Pipeline 离线缓存的统计/刷新/清空。断网时数据暂存在缓存，网络恢复后刷新。危险操作：clear 会丢失数据。',
    category: 'collector',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '操作类型（stats/flush/clear）',
        required: true,
      },
      { name: 'maxBatch', type: 'number', description: 'flush 时单次最大刷新数', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, maxBatch } = params;
      try {
        const act = String(action);
        if (act === 'stats') {
          const stats = services.offlineCacheService!.getBufferStats();
          return JSON.stringify({ success: true, stats });
        }
        if (act === 'flush') {
          const items = await services.offlineCacheService!.flush(
            typeof maxBatch === 'number' ? maxBatch : undefined,
          );
          return JSON.stringify({ success: true, flushed: items.length });
        }
        if (act === 'clear') {
          services.offlineCacheService!.clear();
          return JSON.stringify({ success: true, cleared: true });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 70. collector_diagnostic — 采集器诊断 */
export function createCollectorDiagnosticTool(
  services: BackendToolServices,
): BackendToolDef | null {
  if (!services.collectorDiagService) return null;
  return {
    name: 'collector_diagnostic',
    description: '设备/标签/插件级采集诊断。排查采集不到数据、标签不可读等问题。',
    category: 'collector',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '诊断类型（device/tag/plugin/full）',
        required: true,
      },
      {
        name: 'deviceId',
        type: 'string',
        description: '设备 ID（device 时必填）',
        required: false,
      },
      { name: 'tagId', type: 'string', description: '标签 ID（tag 时必填）', required: false },
      {
        name: 'protocol',
        type: 'string',
        description: '协议名称（plugin 时必填）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, deviceId, tagId, protocol } = params;
      try {
        const act = String(action);
        if (act === 'device') {
          if (!deviceId)
            return JSON.stringify({ success: false, error: 'device 诊断需要 deviceId' });
          const report = await services.collectorDiagService!.runFullDiagnosis(String(deviceId));
          return JSON.stringify({ success: true, deviceId: String(deviceId), report });
        }
        if (act === 'tag') {
          if (!tagId) return JSON.stringify({ success: false, error: 'tag 诊断需要 tagId' });
          const result = await services.collectorDiagService!.checkTagReadability(String(tagId));
          return JSON.stringify({ success: true, tagId: String(tagId), result });
        }
        if (act === 'plugin') {
          if (!protocol)
            return JSON.stringify({ success: false, error: 'plugin 诊断需要 protocol' });
          const result = await services.collectorDiagService!.checkPluginHealth(String(protocol));
          return JSON.stringify({ success: true, protocol: String(protocol), result });
        }
        if (act === 'full') {
          const report = await services.collectorDiagService!.runFullDiagnosis(
            deviceId ? String(deviceId) : undefined,
          );
          return JSON.stringify({ success: true, report });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 71. base_service_manage — 基础服务管理 */
export function createBaseServiceManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.baseServicesService) return null;
  return {
    name: 'base_service_manage',
    description:
      'Redis/InfluxDB 等基础服务的状态/启停/重启/日志管理。危险操作：启停会影响在线业务。',
    category: 'ops',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '操作类型（list/detail/start/stop/restart/logs）',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        description: '服务名称（除 list 外必填，如 redis/influxdb）',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: '日志条数（logs 时，默认 200）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, name, limit } = params;
      try {
        const act = String(action);
        if (act === 'list') {
          const servicesList = await services.baseServicesService!.getAllStatus();
          return JSON.stringify({
            success: true,
            services: servicesList,
            total: servicesList.length,
          });
        }
        if (!name) return JSON.stringify({ success: false, error: '该操作需要 name' });
        const n = String(name);
        if (act === 'detail') {
          const status = await services.baseServicesService!.getStatus(n);
          return JSON.stringify({ success: true, name: n, status });
        }
        if (act === 'start') {
          const result = await services.baseServicesService!.start(n);
          return JSON.stringify({ success: true, name: n, result });
        }
        if (act === 'stop') {
          const result = await services.baseServicesService!.stop(n);
          return JSON.stringify({ success: true, name: n, result });
        }
        if (act === 'restart') {
          const result = await services.baseServicesService!.restart(n);
          return JSON.stringify({ success: true, name: n, result });
        }
        if (act === 'logs') {
          const logs = await services.baseServicesService!.getLogs(
            n,
            typeof limit === 'number' ? limit : 200,
          );
          return JSON.stringify({ success: true, name: n, logs });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 72. influxdb_admin — InfluxDB 管理 */
export function createInfluxdbAdminTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.influxAdminService) return null;
  return {
    name: 'influxdb_admin',
    description: 'InfluxDB 初始化状态/健康/配置/Bucket 管理/一键初始化。',
    category: 'ops',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '操作类型（setup-status/health/config/buckets/setup）',
        required: true,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action } = params;
      try {
        const act = String(action);
        if (act === 'setup-status') {
          const result = await services.influxAdminService!.checkSetupStatus();
          return JSON.stringify({ success: true, setupStatus: result });
        }
        if (act === 'health') {
          const result = await services.influxAdminService!.checkHealth();
          return JSON.stringify({ success: true, health: result });
        }
        if (act === 'config') {
          const result = await services.influxAdminService!.getConfig();
          return JSON.stringify({ success: true, config: result });
        }
        if (act === 'buckets') {
          const buckets = await services.influxAdminService!.listBuckets();
          return JSON.stringify({ success: true, buckets, total: buckets.length });
        }
        if (act === 'setup') {
          const result = await services.influxAdminService!.setup();
          return JSON.stringify({ success: true, setup: result });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 73. system_config_manage — 系统配置管理 */
export function createSystemConfigManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.systemConfigService) return null;
  return {
    name: 'system_config_manage',
    description: '系统配置项的查询/更新/删除 + 重启协调。危险操作：修改配置可能需要重启服务。',
    category: 'ops',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型', required: true },
      { name: 'key', type: 'string', description: '配置 key（get/set 时必填）', required: false },
      { name: 'value', type: 'string', description: '配置值（set 时）', required: false },
      {
        name: 'writeEnv',
        type: 'boolean',
        description: '是否回写 env 文件（默认 false）',
        required: false,
      },
      {
        name: 'username',
        type: 'string',
        description: '操作人（restart 时，默认 admin）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, key, value, writeEnv, username } = params;
      try {
        const act = String(action);
        if (act === 'list' || act === 'full') {
          const items = await services.systemConfigService!.getAllWithMeta();
          return JSON.stringify({ success: true, configs: items, total: items.length });
        }
        if (act === 'get') {
          if (!key) return JSON.stringify({ success: false, error: '需要 key' });
          const configValue = await services.systemConfigService!.get(String(key));
          return JSON.stringify({ success: true, key: String(key), value: configValue });
        }
        if (act === 'set') {
          if (!key) return JSON.stringify({ success: false, error: '需要 key' });
          const result = await services.systemConfigService!.setWithMeta(
            String(key),
            String(value || ''),
            { writeEnv: Boolean(writeEnv) },
          );
          return JSON.stringify({ success: true, key: String(key), result });
        }
        if (act === 'restart-required-list') {
          const keys = await services.systemConfigService!.getRestartRequired();
          return JSON.stringify({ success: true, keys, count: keys.length });
        }
        if (act === 'restart') {
          const result = await services.systemConfigService!.triggerRestart(
            String(username || 'admin'),
          );
          return JSON.stringify({ success: true, result });
        }
        if (act === 'restart-status') {
          const status = await services.systemConfigService!.getRestartStatus();
          return JSON.stringify({ success: true, status });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批次 I: 数据治理与备份（5 个工具）
// ============================================================

/** 74. data_export — 数据导出 */
export function createDataExportTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.dataExportService) return null;
  return {
    name: 'data_export',
    description: '标签历史数据的 CSV/JSON 导出。返回文件名和下载路径，不直接返回文件内容。',
    category: 'data',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '导出类型（tag-csv/tag-json/batch-json）',
        required: true,
      },
      {
        name: 'tagId',
        type: 'string',
        description: '标签 ID（tag-csv/tag-json 时必填）',
        required: false,
      },
      {
        name: 'tagIds',
        type: 'array',
        description: '标签 ID 数组（batch-json 时必填）',
        required: false,
      },
      { name: 'startTime', type: 'string', description: '开始时间（ISO 8601）', required: true },
      { name: 'endTime', type: 'string', description: '结束时间（ISO 8601）', required: true },
      { name: 'projectId', type: 'string', description: '项目 ID', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, tagId, tagIds, startTime, endTime, projectId } = params;
      try {
        const act = String(action);
        const st = new Date(String(startTime));
        const et = new Date(String(endTime));
        if (act === 'tag-csv') {
          if (!tagId) return JSON.stringify({ success: false, error: '需要 tagId' });
          const result = await services.dataExportService!.exportCsv(String(tagId), st, et);
          return JSON.stringify({
            success: true,
            filename: result.filename,
            format: 'csv',
            sizeBytes: result.csv.length,
          });
        }
        if (act === 'tag-json') {
          if (!tagId) return JSON.stringify({ success: false, error: '需要 tagId' });
          const result = await services.dataExportService!.exportJson(String(tagId), st, et);
          return JSON.stringify({
            success: true,
            filename: result.filename,
            format: 'json',
            sizeBytes: result.json.length,
          });
        }
        if (act === 'batch-json') {
          if (!Array.isArray(tagIds) || tagIds.length === 0)
            return JSON.stringify({ success: false, error: '需要 tagIds 数组' });
          const result = await services.dataExportService!.exportBatchJson(
            tagIds.map(String),
            st,
            et,
            projectId ? String(projectId) : undefined,
          );
          return JSON.stringify({
            success: true,
            filename: result.filename,
            format: 'json',
            tagCount: tagIds.length,
            sizeBytes: result.json.length,
          });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 75. database_status — 数据库状态查询 */
export function createDatabaseStatusTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.databaseService) return null;
  return {
    name: 'database_status',
    description: '查询系统库与项目库的运行状态（大小/表数/行数）。',
    category: 'ops',
    frontend: false,
    params: [],
    execute: async (_params: Record<string, unknown>) => {
      try {
        const status = await services.databaseService!.getAllDatabasesStatus();
        return JSON.stringify({ success: true, status });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 76. database_maintain — 数据库维护 */
export function createDatabaseMaintainTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.databaseService) return null;
  return {
    name: 'database_maintain',
    description:
      '数据库完整性检查与 VACUUM 空间回收。危险操作：VACUUM 会锁定写入，建议低峰期执行。',
    category: 'ops',
    frontend: false,
    params: [
      {
        name: 'action',
        type: 'string',
        description: '维护类型（integrity-check/vacuum）',
        required: true,
      },
      { name: 'scope', type: 'string', description: '范围（system/project）', required: true },
      {
        name: 'projectName',
        type: 'string',
        description: '项目名称（scope=project 时必填）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, scope, projectName } = params;
      try {
        const act = String(action);
        const sc = String(scope);
        if (act === 'integrity-check') {
          if (sc === 'project') {
            if (!projectName)
              return JSON.stringify({ success: false, error: 'scope=project 需要 projectName' });
            const result = await services.databaseService!.checkProjectIntegrity(
              String(projectName),
            );
            return JSON.stringify({
              success: true,
              scope: sc,
              projectName: String(projectName),
              result,
            });
          }
          const result = await services.databaseService!.checkSystemIntegrity();
          return JSON.stringify({ success: true, scope: sc, result });
        }
        if (act === 'vacuum') {
          if (sc === 'project') {
            if (!projectName)
              return JSON.stringify({ success: false, error: 'scope=project 需要 projectName' });
            const result = await services.databaseService!.vacuumProject(String(projectName));
            return JSON.stringify({
              success: true,
              scope: sc,
              projectName: String(projectName),
              result,
            });
          }
          const result = await services.databaseService!.vacuumSystem();
          return JSON.stringify({ success: true, scope: sc, result });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 77. backup_manage — 备份管理 */
export function createBackupManageTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.backupService) return null;
  return {
    name: 'backup_manage',
    description: '备份的创建/列表/删除/恢复 + 配置管理。危险操作：restore 会覆盖现有数据。',
    category: 'ops',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型', required: true },
      {
        name: 'filename',
        type: 'string',
        description: '备份文件名（delete/restore 时必填）',
        required: false,
      },
      {
        name: 'projectName',
        type: 'string',
        description: '项目名称（create-project 时）',
        required: false,
      },
      { name: 'dbType', type: 'string', description: '数据库类型（list 时筛选）', required: false },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, filename, projectName, dbType } = params;
      try {
        const act = String(action);
        if (act === 'list') {
          const backups = await services.backupService!.listBackups(
            dbType ? String(dbType) : undefined,
          );
          return JSON.stringify({ success: true, backups, total: backups.length });
        }
        if (act === 'stats') {
          const stats = await services.backupService!.getBackupStats();
          return JSON.stringify({ success: true, stats });
        }
        if (act === 'get-config') {
          const cfg = await services.backupService!.getBackupConfig();
          return JSON.stringify({ success: true, config: cfg });
        }
        if (act === 'create-system') {
          const result = await services.backupService!.createSystemBackup('manual', 'admin');
          return JSON.stringify({ success: true, backup: result });
        }
        if (act === 'create-project') {
          if (!projectName) return JSON.stringify({ success: false, error: '需要 projectName' });
          const result = await services.backupService!.createProjectBackup(
            String(projectName),
            'manual',
            'admin',
          );
          return JSON.stringify({ success: true, backup: result });
        }
        if (act === 'delete') {
          if (!filename) return JSON.stringify({ success: false, error: '需要 filename' });
          await services.backupService!.deleteBackup(String(filename));
          return JSON.stringify({ success: true, deleted: true, filename: String(filename) });
        }
        if (act === 'restore') {
          if (!filename) return JSON.stringify({ success: false, error: '需要 filename' });
          await services.backupService!.restoreBackup(String(filename));
          return JSON.stringify({ success: true, restored: true, filename: String(filename) });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

/** 78. backup_log_query — 备份日志与清理 */
export function createBackupLogQueryTool(services: BackendToolServices): BackendToolDef | null {
  if (!services.backupService) return null;
  return {
    name: 'backup_log_query',
    description: '备份日志查询 + 过期备份清理。危险操作：cleanup 会永久删除过期备份。',
    category: 'ops',
    frontend: false,
    params: [
      { name: 'action', type: 'string', description: '操作类型（logs/cleanup）', required: true },
      {
        name: 'dbType',
        type: 'string',
        description: '数据库类型筛选（system/project）',
        required: false,
      },
      {
        name: 'status',
        type: 'string',
        description: '状态筛选（success/failed）',
        required: false,
      },
      { name: 'limit', type: 'number', description: '返回条数（默认 50）', required: false },
      {
        name: 'days',
        type: 'number',
        description: '清理 N 天前的备份（cleanup 时必填）',
        required: false,
      },
    ],
    execute: async (params: Record<string, unknown>) => {
      const { action, dbType, status, limit, days } = params;
      try {
        const act = String(action);
        if (act === 'logs') {
          const logs = await services.backupService!.getBackupLogs({
            dbType: dbType ? String(dbType) : undefined,
            status: status ? String(status) : undefined,
            limit: typeof limit === 'number' ? limit : 50,
          });
          return JSON.stringify({ success: true, logs, total: logs.length });
        }
        if (act === 'cleanup') {
          if (!dbType)
            return JSON.stringify({ success: false, error: '需要 dbType（system/project）' });
          if (typeof days !== 'number')
            return JSON.stringify({ success: false, error: '需要 days（清理天数）' });
          const deleted = await services.backupService!.cleanupExpired(String(dbType), days);
          return JSON.stringify({ success: true, deleted, dbType: String(dbType), days });
        }
        return JSON.stringify({ success: false, error: `不支持的操作: ${act}` });
      } catch (err: unknown) {
        return JSON.stringify({ success: false, error: String((err as Error).message) });
      }
    },
  };
}

// ============================================================
// 批量创建
// ============================================================

/** 根据可用服务批量创建所有后端工具 */
export function createAllBackendTools(services: BackendToolServices): BackendToolDef[] {
  const factories = [
    // 原有 17 个工具
    createDataQueryTool,
    createDataAggregateTool,
    createDeviceStatusTool,
    createDeviceHistoryTool,
    createAlarmHistoryTool,
    createKnowledgeSearchTool,
    createSystemHealthTool,
    createTemplateListTool,
    createTemplateDetailTool,
    createTemplateCreateTool,
    createDriverListTool,
    createDeviceCreateTool,
    createDictListTool,
    createDictDetailTool,
    createDictCreateTool,
    createDictAddItemsTool,
    createDictSearchTool,
    // 批次 A: 外部数据库接入 (5) + 项目管理 (4)
    createDbConnectionListTool,
    createDbConnectionCreateTool,
    createDbConnectionTestTool,
    createDbConnectionTablesTool,
    createDbConnectionQueryTool,
    createProjectListTool,
    createProjectInfoTool,
    createProjectExportTool,
    createProjectImportTool,
    // 批次 B: 趋势数据 (4) + 项目诊断 (4)
    createTagListTool,
    createTrendQueryTool,
    createTrendAggregateTool,
    createTrendExportTool,
    createProjectManageInfoTool,
    createProjectDiagnoseTool,
    createProjectInitResourcesTool,
    createSystemHealthDetailedTool,
    // 批次 C: 报表 (4) + 报警 (3) + 标签 (2)
    createReportTemplateListTool,
    createReportTemplateCreateTool,
    createReportScheduleCreateTool,
    createReportGenerateTool,
    createAlarmRuleListTool,
    createAlarmRuleCreateTool,
    createAlarmSuppressionAddTool,
    createDatatagConfigureTool,
    createDatatagBatchConfigureTool,
    // 批次 D: 脚本 (5)
    createScriptApiListTool,
    createScriptValidateTool,
    createScriptDryRunTool,
    createScriptCreateTool,
    createScriptExecuteTool,
    // 批次 E: 报警处理与运维 (7)
    createAlarmAcknowledgeTool,
    createAlarmClearTool,
    createAlarmShelveTool,
    createAlarmStatisticsTool,
    createAlarmEscalationListTool,
    createAlarmSuppressionListTool,
    createAlarmRuleToggleTool,
    // 批次 F: 设备运维管理 (6)
    createDeviceListTool,
    createDeviceUpdateTool,
    createDeviceDeleteTool,
    createDeviceGroupManageTool,
    createDeviceDiagnosticTool,
    createDeviceWriteTagTool,
    // 批次 G: 用户权限管理 (5)
    createUserManageTool,
    createRoleManageTool,
    createMenuManageTool,
    createSessionManageTool,
    createAuditLogQueryTool,
    // 批次 H: 采集器与服务运维 (7)
    createPluginManageTool,
    createPipelineDiagnoseTool,
    createOfflineCacheManageTool,
    createCollectorDiagnosticTool,
    createBaseServiceManageTool,
    createInfluxdbAdminTool,
    createSystemConfigManageTool,
    // 批次 I: 数据治理与备份 (5)
    createDataExportTool,
    createDatabaseStatusTool,
    createDatabaseMaintainTool,
    createBackupManageTool,
    createBackupLogQueryTool,
  ];

  const tools: BackendToolDef[] = [];
  for (const factory of factories) {
    const tool = factory(services);
    if (tool) {
      tools.push(tool);
    }
  }
  return tools;
}
