// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 后端 MCP 工具单元测试 — P2-T01
 *
 * 验证 78 组工具工厂的正确性：
 *   - 原有 12 组：data_query / data_aggregate / device_getStatus / device_getHistory /
 *                  alarm_getHistory / knowledge_search / system_getHealth /
 *                  template_list / template_detail / template_create / driver_list / device_create
 *   - 字典 5 组：dict_list / dict_detail / dict_create / dict_addItems / dict_search
 *   - 批次 A 9 组：db_connection_* / project_list / project_info / project_export / project_import
 *   - 批次 B 8 组：tag_list / trend_* / project_manage_info / project_diagnose / project_init_resources / system_health_detailed
 *   - 批次 C 9 组：report_* / alarm_rule_* / alarm_suppression_add / datatag_configure / datatag_batch_configure
 *   - 批次 D 5 组：script_*
 *   - 批次 E 7 组：alarm_acknowledge / alarm_clear / alarm_shelve / alarm_statistics /
 *                  alarm_escalation_list / alarm_suppression_list / alarm_rule_toggle
 *   - 批次 F 6 组：device_list / device_update / device_delete / device_group_manage /
 *                  device_diagnostic / device_write_tag
 *   - 批次 G 5 组：user_manage / role_manage / menu_manage / session_manage / audit_log_query
 *   - 批次 H 7 组：plugin_manage / pipeline_diagnose / offline_cache_manage /
 *                  collector_diagnostic / base_service_manage / influxdb_admin / system_config_manage
 *   - 批次 I 5 组：data_export / database_status / database_maintain / backup_manage / backup_log_query
 *
 * 每个工具测试包含：
 *   1. 创建后 schema 验证（参数、分类、frontend 标记）
 *   2. 正常调用验证（传入 mock service 返回正确 JSON）
 *   3. 异常处理验证（service 抛异常时返回错误 JSON）
 *   4. 参数校验验证（无效参数返回错误 JSON）
 */

import {
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
  createDbConnectionListTool,
  createDbConnectionCreateTool,
  createDbConnectionTestTool,
  createDbConnectionTablesTool,
  createDbConnectionQueryTool,
  createProjectListTool,
  createProjectInfoTool,
  createProjectExportTool,
  createProjectImportTool,
  createTagListTool,
  createTrendQueryTool,
  createTrendAggregateTool,
  createTrendExportTool,
  createProjectManageInfoTool,
  createProjectDiagnoseTool,
  createProjectInitResourcesTool,
  createSystemHealthDetailedTool,
  createReportTemplateListTool,
  createReportTemplateCreateTool,
  createReportScheduleCreateTool,
  createReportGenerateTool,
  createAlarmRuleListTool,
  createAlarmRuleCreateTool,
  createAlarmSuppressionAddTool,
  createDatatagConfigureTool,
  createDatatagBatchConfigureTool,
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
  createAllBackendTools,
  type BackendToolServices,
} from '../backend-tools';

// ============================================================
// Mock Services
// ============================================================

function mockDeviceService() {
  return {
    getDeviceStats: jest.fn().mockResolvedValue({
      total: 10,
      online: 5,
      offline: 3,
      connecting: 1,
      degraded: 1,
      error: 0,
      totalTags: 45,
    }),
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'd1',
          deviceName: '设备A',
          type: 'modbus',
          ip: '192.168.1.1',
          port: 502,
          status: 'online',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: { total: 1 },
    }),
    findOne: jest.fn().mockResolvedValue({
      id: 'd1',
      deviceName: '设备A',
      type: 'modbus',
      ip: '192.168.1.1',
      port: 502,
      status: 'online',
    }),
  };
}

function mockAlarmService() {
  return {
    getRecords: jest.fn().mockResolvedValue([
      {
        id: 'a1',
        rule: { name: '温度过高' },
        status: 'ACTIVE',
        level: 'ERROR',
        triggerValue: 95,
        createdAt: new Date(),
      },
    ]),
  };
}

function mockDataQueryService() {
  return {
    queryTimeRange: jest.fn().mockResolvedValue({
      data: [{ tagId: 't1', numericValue: 42, timestamp: new Date() }],
      total: 100,
    }),
    aggregate: jest.fn().mockResolvedValue({
      aggregation: 'avg',
      value: 52.5,
      tagId: 't1',
    }),
    getTagStats: jest.fn().mockResolvedValue({
      avg: 50,
      max: 100,
      min: 0,
      sum: 5000,
      count: 100,
      tagId: 't1',
    }),
  };
}

function mockKnowledgeService() {
  return {
    search: jest.fn().mockResolvedValue([
      {
        title: '设备接入指南',
        snippet: '本文介绍如何接入 Modbus 设备...',
        module: '设备管理',
        score: 0.95,
      },
    ]),
  };
}

function mockHealthService() {
  // 实现使用原始字节数，由工具转换为 MB/GB
  return {
    getDetailed: jest.fn().mockResolvedValue({
      status: 'healthy',
      uptime: 3600,
      timestamp: new Date().toISOString(),
      database: { status: 'connected' },
      memory: {
        total: 4096 * 1024 * 1024,
        free: 3584 * 1024 * 1024,
        used: 512 * 1024 * 1024,
        usagePercent: 12.5,
      },
      disks: {
        appDir: {
          usedBytes: 5 * 1024 * 1024 * 1024,
          totalBytes: 100 * 1024 * 1024 * 1024,
          usagePercent: 5,
        },
      },
      cpuLoad: [0.5, 0.3, 0.2],
    }),
  };
}

function mockAlarmStatsService() {
  return {
    getStatistics: jest.fn().mockResolvedValue({
      total: 50,
      active: 3,
      acknowledged: 5,
      cleared: 42,
      shelved: 0,
      byLevel: { INFO: 10, WARNING: 20, ERROR: 15, CRITICAL: 5 },
      byStatus: { ACTIVE: 3, ACKNOWLEDGED: 5, CLEARED: 42, SHELVED: 0 },
    }),
  };
}

function mockTemplateService() {
  return {
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'tpl-temp-hum-001',
          name: '温湿度传感器模板',
          deviceType: 'sensor',
          version: '1.0.0',
          description: '标准温湿度传感器采集模板',
          variables: [
            {
              name: 'temperature',
              label: '温度',
              address: '40001',
              dataType: 'float32',
              unit: '°C',
            },
            { name: 'humidity', label: '湿度', address: '40003', dataType: 'float32', unit: '%RH' },
          ],
          variableCount: 2,
        },
      ],
      pagination: { total: 1 },
    }),
    findById: jest.fn().mockResolvedValue({
      id: 'tpl-temp-hum-001',
      name: '温湿度传感器模板',
      deviceType: 'sensor',
      version: '1.0.0',
      description: '标准温湿度传感器采集模板',
      variables: [
        {
          name: 'temperature',
          label: '温度',
          address: '40001',
          dataType: 'float32',
          readWrite: 'read',
          unit: '°C',
          scale: 1,
          offset: 0,
          deadband: 0.5,
          description: '环境温度',
        },
        {
          name: 'humidity',
          label: '湿度',
          address: '40003',
          dataType: 'float32',
          readWrite: 'read',
          unit: '%RH',
          description: '环境湿度',
        },
      ],
    }),
    create: jest.fn().mockResolvedValue({
      id: 'tpl-pressure-001',
      name: '压力传感器模板',
      version: '1.0',
      variableCount: 2,
    }),
  };
}

function mockDeviceCreateService() {
  return {
    createDevice: jest.fn().mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      deviceName: '温湿度传感器',
      deviceCode: 'temp-hum-001',
      driver: 'modbus_tcp',
      templateId: 'tpl-temp-hum-001',
      status: 'offline',
      createdAt: new Date('2026-07-24T10:00:00.000Z'),
    }),
  };
}

function mockDictService() {
  return {
    getAllCategories: jest.fn().mockReturnValue([
      {
        category: '设备类型',
        tables: [{ dictId: 'device-type', dictName: '设备类型', version: '1.0', itemCount: 5 }],
      },
    ]),
    getDict: jest.fn().mockReturnValue({
      dictId: 'device-type',
      dictName: '设备类型',
      category: '设备类型',
      description: '设备类型字典',
      version: '1.0',
      items: [
        { value: 'sensor', label: '传感器', sortOrder: 1, description: '传感器设备' },
        { value: 'actuator', label: '执行器', sortOrder: 2, description: '执行器设备' },
      ],
    }),
    createTable: jest.fn(),
    updateTable: jest.fn(),
    getAllDicts: jest.fn().mockReturnValue([
      {
        dictId: 'device-type',
        dictName: '设备类型',
        category: '设备类型',
        description: '设备类型字典',
        version: '1.0',
        items: [{ value: 'sensor', label: '传感器', sortOrder: 1, description: '' }],
      },
    ]),
  };
}

function mockDbConnectionService() {
  return {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 'conn-1',
        name: '生产数据库',
        dbType: 'mysql',
        host: '192.168.1.100',
        port: 3306,
        database: 'production',
        enabled: true,
        createdAt: new Date(),
      },
    ]),
    create: jest.fn().mockResolvedValue({ id: 'conn-2', name: '新连接' }),
    test: jest.fn().mockResolvedValue({ success: true, latency: 15 }),
    getTables: jest.fn().mockResolvedValue(['users', 'orders', 'products']),
    getColumns: jest.fn().mockResolvedValue([
      { name: 'id', type: 'int' },
      { name: 'name', type: 'varchar' },
    ]),
    executeQuery: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }]),
  };
}

function mockProjectService() {
  return {
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          projectId: 'proj-001',
          projectName: '测试工程',
          description: '测试项目',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-07-01T00:00:00Z',
        },
      ],
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    }),
    findOne: jest.fn().mockResolvedValue({
      projectId: 'proj-001',
      projectName: '测试工程',
      description: '测试项目',
      version: '1.0.0',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      config: { theme: 'dark' },
    }),
    exportProjectZip: jest.fn().mockResolvedValue({
      filePath: '/tmp/export/proj-001.zip',
      projectName: '测试工程',
      fileName: 'proj-001_20260724.zip',
    }),
    importProjectZip: jest.fn().mockResolvedValue({
      data: { projectId: 'proj-002', projectName: '导入工程' },
      warnings: [],
    }),
    getManageInfo: jest.fn().mockResolvedValue({
      projectName: '测试工程',
      projectId: 'proj-001',
      tenantId: 'proj-001',
      pageCount: 5,
      dbSize: 1024000,
      rtdbSize: 512000,
      dbMode: 'isolated',
    }),
    diagnose: jest.fn().mockResolvedValue({
      health: 'healthy',
      resources: { db: 'ok', rtdb: 'ok', pages: 'ok' },
      issues: [],
    }),
    initResources: jest.fn().mockResolvedValue({
      health: 'healthy',
      resources: { db: 'ok' },
      issues: [],
      initialized: ['db'],
      skipped: [],
    }),
  };
}

function mockReportService() {
  return {
    generateDailyReport: jest.fn().mockResolvedValue({
      id: 'rpt-001',
      type: 'daily',
      projectId: 'proj-001',
      date: '2026-07-24',
      generatedAt: new Date().toISOString(),
      data: { summary: { totalDevices: 10, onlineDevices: 8 } },
    }),
    generateMonthlyReport: jest.fn().mockResolvedValue({
      id: 'rpt-002',
      type: 'monthly',
      projectId: 'proj-001',
      month: '2026-07',
      generatedAt: new Date().toISOString(),
    }),
    generateCustomReport: jest.fn().mockResolvedValue({
      id: 'rpt-003',
      type: 'custom',
      projectId: 'proj-001',
      dateRange: '2026-07-01 ~ 2026-07-24',
      generatedAt: new Date().toISOString(),
    }),
    generateAlarmReport: jest.fn().mockResolvedValue({
      id: 'rpt-004',
      type: 'alarm',
      projectId: 'proj-001',
      generatedAt: new Date().toISOString(),
    }),
    generateTrendReport: jest.fn().mockResolvedValue({
      id: 'rpt-005',
      type: 'trend',
      projectId: 'proj-001',
      generatedAt: new Date().toISOString(),
    }),
    exportReport: jest.fn().mockResolvedValue({
      reportId: 'rpt-001',
      format: 'pdf',
      fileName: 'report_rpt-001.pdf',
      filePath: '/tmp/reports/report_rpt-001.pdf',
    }),
    queryReports: jest.fn().mockResolvedValue({
      data: [{ id: 'rpt-001', type: 'daily', generatedAt: new Date().toISOString() }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
    saveReportConfig: jest.fn().mockResolvedValue({
      id: 'cfg-001',
      name: '日报模板',
      createdAt: new Date().toISOString(),
    }),
    getSchedules: jest
      .fn()
      .mockResolvedValue([
        { id: 'sch-001', templateId: 'tpl-001', cronExpression: '0 0 8 * * *', enabled: true },
      ]),
    createSchedule: jest.fn().mockResolvedValue({
      id: 'sch-002',
      templateId: 'tpl-001',
      cronExpression: '0 0 9 * * *',
      enabled: true,
    }),
  };
}

function mockDatatagService() {
  return {
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'tag-001',
          name: '温度',
          dataType: 'float32',
          deviceId: 'd1',
          unit: '°C',
          enabled: true,
          scanRate: 1000,
        },
        {
          id: 'tag-002',
          name: '湿度',
          dataType: 'float32',
          deviceId: 'd1',
          unit: '%RH',
          enabled: true,
          scanRate: 1000,
        },
      ],
      total: 2,
    }),
    update: jest.fn().mockResolvedValue({ id: 'tag-001', name: '温度' }),
    batchUpdate: jest.fn().mockResolvedValue([
      { id: 'tag-001', name: '温度' },
      { id: 'tag-002', name: '湿度' },
    ]),
  };
}

function mockScriptService() {
  return {
    getApiFunctions: jest.fn().mockResolvedValue([
      {
        name: 'readTag',
        description: '读取标签值',
        parameters: [{ name: 'tagId', type: 'string' }],
      },
      {
        name: 'writeTag',
        description: '写入标签值',
        parameters: [
          { name: 'tagId', type: 'string' },
          { name: 'value', type: 'number' },
        ],
      },
    ]),
    create: jest.fn().mockResolvedValue({
      id: 'script-001',
      name: '自动阀门控制',
    }),
    executeScript: jest.fn().mockResolvedValue({
      success: true,
      logs: ['[2026-07-24 10:00:00] 开始执行', '[2026-07-24 10:00:01] 执行完成'],
      result: { valveClosed: true },
    }),
  };
}

function mockExtendedDataQueryService() {
  return {
    queryTimeRange: mockDataQueryService().queryTimeRange,
    aggregate: mockDataQueryService().aggregate,
    getTagStats: mockDataQueryService().getTagStats,
    queryTrend: jest.fn().mockResolvedValue({
      data: [
        {
          tagId: 'tag-001',
          data: [
            { timestamp: '2026-07-24T08:00:00Z', value: 25.5 },
            { timestamp: '2026-07-24T09:00:00Z', value: 26.0 },
          ],
        },
      ],
    }),
    exportTrend: jest.fn().mockResolvedValue({
      filePath: '/tmp/export/trend_20260724.csv',
      fileName: 'trend_20260724.csv',
    }),
  };
}

function mockExtendedAlarmService() {
  return {
    getRecords: mockAlarmService().getRecords,
    getRules: jest.fn().mockResolvedValue([
      {
        id: 'rule-001',
        name: '温度过高',
        tagId: 'tag-001',
        level: 'CRITICAL',
        condition: 'gt',
        conditionValue: 80,
        enabled: true,
        debounceMs: 5000,
        debounceCount: 3,
      },
    ]),
    createRule: jest.fn().mockResolvedValue({ id: 'rule-002', name: '压力过高' }),
    addSuppressionRule: jest.fn().mockResolvedValue({ id: 'supp-001' }),
  };
}

// ============================================================
// 批次 E-I Mock Services
// ============================================================

function mockAlarmOpsService() {
  return {
    acknowledge: jest.fn().mockResolvedValue({ id: 'rec-001', status: 'acknowledged' }),
    batchAcknowledge: jest.fn().mockResolvedValue({ acknowledged: 2 }),
    clear: jest.fn().mockResolvedValue({ id: 'rec-001', status: 'cleared' }),
    shelve: jest.fn().mockResolvedValue({ id: 'rec-001', status: 'shelved', duration: 3600 }),
    getStatistics: jest.fn().mockResolvedValue({
      total: 50,
      active: 3,
      acknowledged: 5,
      cleared: 42,
      shelved: 0,
      byLevel: { INFO: 10, WARNING: 20, ERROR: 15, CRITICAL: 5 },
    }),
    toggleRule: jest.fn().mockResolvedValue({ id: 'rule-001', enabled: false }),
    getSuppressionRules: jest
      .fn()
      .mockResolvedValue([{ id: 'supp-001', type: 'parent_child', name: '抑制规则A' }]),
  };
}

function mockDeviceOpsService() {
  return {
    update: jest.fn().mockResolvedValue({ id: 'd1', deviceName: '设备A-updated', scanRate: 2000 }),
    remove: jest.fn().mockResolvedValue(undefined),
    moveDevice: jest.fn().mockResolvedValue({ id: 'd1', groupId: 'g2' }),
    writeTagValue: jest.fn().mockResolvedValue({ success: true, tagId: 't1', value: 1 }),
  };
}

function mockDeviceGroupService() {
  return {
    getGroups: jest.fn().mockResolvedValue([{ id: 'g1', name: '分组A', deviceId: 'd1' }]),
    getGroupTree: jest.fn().mockResolvedValue([{ id: 'g1', name: '分组A', children: [] }]),
    createGroup: jest.fn().mockResolvedValue({ id: 'g2', name: '新分组' }),
    updateGroup: jest.fn().mockResolvedValue({ id: 'g1', name: '更新分组' }),
    deleteGroup: jest.fn().mockResolvedValue(undefined),
  };
}

function mockDeviceDiagnosticService() {
  return {
    ping: jest.fn().mockResolvedValue({ reachable: true, latency: 5 }),
    readTag: jest.fn().mockResolvedValue({ tagId: 't1', value: 42, quality: 'good' }),
    writeTag: jest.fn().mockResolvedValue({ success: true }),
    scanAddresses: jest.fn().mockResolvedValue([{ address: '40001', value: 1 }]),
    runDiagnostic: jest.fn().mockResolvedValue({ status: 'healthy', checks: { connection: 'ok' } }),
  };
}

function mockUserService() {
  return {
    findAll: jest.fn().mockResolvedValue([
      { id: 'u1', username: 'admin', role: 'admin', isActive: true },
      { id: 'u2', username: 'operator1', role: 'operator', isActive: true },
    ]),
    adminCreateUser: jest.fn().mockResolvedValue({ id: 'u3', username: 'newuser', role: 'viewer' }),
    adminUpdateUser: jest.fn().mockResolvedValue({ id: 'u1', username: 'admin', email: 'a@b.c' }),
    toggleUserStatus: jest.fn().mockResolvedValue({ id: 'u2', isActive: false }),
    resetPassword: jest.fn().mockResolvedValue({ tempPassword: 'Temp12345!' }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    assignRole: jest.fn().mockResolvedValue({ id: 'u2', role: 'admin' }),
  };
}

function mockRoleService() {
  return {
    findAll: jest.fn().mockResolvedValue([
      { id: 'r1', name: '管理员', code: 'admin' },
      { id: 'r2', name: '操作员', code: 'operator' },
    ]),
    findById: jest.fn().mockResolvedValue({ id: 'r1', name: '管理员', code: 'admin' }),
    create: jest.fn().mockResolvedValue({ id: 'r3', name: '新角色', code: 'custom' }),
    update: jest.fn().mockResolvedValue({ id: 'r1', name: '超级管理员' }),
    delete: jest.fn().mockResolvedValue(undefined),
    getProjectAuths: jest.fn().mockResolvedValue([{ projectId: 'p1', canRead: true }]),
    setProjectAuths: jest.fn().mockResolvedValue(undefined),
    getDeviceAuths: jest.fn().mockResolvedValue([{ deviceId: 'd1', canWrite: true }]),
    setDeviceAuths: jest.fn().mockResolvedValue(undefined),
  };
}

function mockSessionService() {
  return {
    getUserSessions: jest.fn().mockReturnValue([
      {
        sessionId: 's1',
        userId: 'admin',
        ip: '192.168.1.1',
        createdAt: new Date().toISOString(),
      },
    ]),
    forceLogout: jest.fn().mockReturnValue(true),
    logoutAllExcept: jest.fn().mockReturnValue(2),
    getLoginHistory: jest
      .fn()
      .mockReturnValue([
        { userId: 'admin', loginAt: new Date().toISOString(), ip: '192.168.1.1', success: true },
      ]),
  };
}

function mockAuditLogService() {
  return {
    query: jest.fn().mockResolvedValue({
      data: [{ id: 'log-001', userId: 'admin', action: 'create', resource: 'device' }],
      total: 1,
    }),
    getStats: jest.fn().mockResolvedValue({
      total: 100,
      byAction: { create: 40, update: 30, delete: 20, login: 10 },
    }),
    cleanupExpired: jest.fn().mockResolvedValue(5),
  };
}

function mockMenuService() {
  return {
    getMenu: jest
      .fn()
      .mockResolvedValue([
        { id: 'm1', labelKey: 'nav.device', path: '/system/device', children: [] },
      ]),
    createMenuItem: jest.fn().mockResolvedValue(undefined),
    updateMenuItem: jest.fn().mockResolvedValue(undefined),
    deleteMenuItem: jest.fn().mockResolvedValue(undefined),
    getMenuButtons: jest.fn().mockResolvedValue([{ id: 'b1', code: 'add', label: '新增' }]),
    updateMenuButtons: jest.fn().mockResolvedValue(undefined),
  };
}

function mockPluginManagerService() {
  return {
    listPlugins: jest.fn().mockResolvedValue([
      { protocol: 'modbus', status: 'active', version: '1.0.0' },
      { protocol: 'opcua', status: 'inactive', version: '1.0.0' },
    ]),
    activate: jest.fn().mockResolvedValue({ protocol: 'opcua', status: 'active' }),
    deactivate: jest.fn().mockResolvedValue({ protocol: 'modbus', status: 'inactive' }),
    getPluginStatus: jest
      .fn()
      .mockReturnValue({ protocol: 'modbus', status: 'active', uptime: 3600 }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true, plugins: 2, active: 1 }),
    hotReload: jest.fn().mockResolvedValue({ protocol: 'modbus', reloaded: true }),
    rollback: jest
      .fn()
      .mockResolvedValue({ protocol: 'modbus', rolledBack: true, version: '0.9.0' }),
    getMonitorData: jest.fn().mockResolvedValue({ cpu: 5, memory: 50, errors: 0 }),
    validateChannelConfig: jest.fn().mockResolvedValue({ valid: true }),
    getPluginConfig: jest.fn().mockReturnValue({ scanRate: 1000, timeout: 3000 }),
    updatePluginConfig: jest.fn().mockResolvedValue({ scanRate: 2000 }),
  };
}

function mockPipelineDiagService() {
  return {
    getMetricsSnapshot: jest.fn().mockReturnValue({ totalRuns: 100, avgLatency: 15 }),
    getStepTimingStats: jest.fn().mockReturnValue({ p50: 10, p95: 50, p99: 100 }),
    getTimingBreakdowns: jest.fn().mockReturnValue([
      { step: 'connect', avgMs: 5 },
      { step: 'read', avgMs: 10 },
    ]),
    getDiagnosticInfo: jest.fn().mockReturnValue({ queueSize: 0, workers: 4 }),
  };
}

function mockOfflineCacheService() {
  return {
    getBufferStats: jest.fn().mockReturnValue({ buffered: 10, sizeBytes: 1024 }),
    flush: jest.fn().mockResolvedValue([{ id: 'item-1' }, { id: 'item-2' }]),
    clear: jest.fn(),
  };
}

function mockCollectorDiagService() {
  return {
    runFullDiagnosis: jest
      .fn()
      .mockResolvedValue({ healthy: true, checks: { connection: 'ok', tags: 'ok' } }),
    checkTagReadability: jest.fn().mockResolvedValue({ tagId: 't1', readable: true, value: 42 }),
    checkPluginHealth: jest.fn().mockResolvedValue({ protocol: 'modbus', healthy: true }),
  };
}

function mockBaseServicesService() {
  return {
    getAllStatus: jest.fn().mockResolvedValue([
      { name: 'redis', status: 'running', pid: 1234 },
      { name: 'influxdb', status: 'running', pid: 5678 },
    ]),
    getStatus: jest.fn().mockResolvedValue({ name: 'redis', status: 'running', uptime: 3600 }),
    start: jest.fn().mockResolvedValue({ name: 'redis', status: 'running' }),
    stop: jest.fn().mockResolvedValue({ name: 'redis', status: 'stopped' }),
    restart: jest.fn().mockResolvedValue({ name: 'redis', status: 'running' }),
    getLogs: jest.fn().mockResolvedValue(['[2026-07-24] started', '[2026-07-24] ready']),
  };
}

function mockInfluxAdminService() {
  return {
    checkSetupStatus: jest.fn().mockResolvedValue({ initialized: true }),
    checkHealth: jest.fn().mockResolvedValue({ status: 'healthy', version: '2.7.0' }),
    getConfig: jest.fn().mockResolvedValue({ url: 'http://localhost:8086', org: 'ss' }),
    listBuckets: jest
      .fn()
      .mockResolvedValue([{ id: 'b1', name: 'ss_node_data_p1', retention: '30d' }]),
    setup: jest.fn().mockResolvedValue({ initialized: true, username: 'admin' }),
  };
}

function mockSystemConfigService() {
  return {
    getAllWithMeta: jest
      .fn()
      .mockResolvedValue([
        { key: 'PORT', value: '4000', category: 'network', restartRequired: false },
      ]),
    get: jest.fn().mockResolvedValue('4000'),
    setWithMeta: jest.fn().mockResolvedValue({ key: 'PORT', value: '4000', updated: true }),
    getRestartRequired: jest.fn().mockResolvedValue(['INFLUX_URL']),
    triggerRestart: jest.fn().mockResolvedValue({ scheduled: true, message: 'restart in 5s' }),
    getRestartStatus: jest.fn().mockResolvedValue({ pending: false }),
  };
}

function mockDataExportService() {
  return {
    exportCsv: jest
      .fn()
      .mockResolvedValue({ csv: 'tagId,value\nt1,42', filename: 'export_t1.csv' }),
    exportJson: jest.fn().mockResolvedValue({ json: '{"data":[]}', filename: 'export_t1.json' }),
    exportBatchJson: jest
      .fn()
      .mockResolvedValue({ json: '{"data":[]}', filename: 'export_batch.json' }),
    exportToResult: jest
      .fn()
      .mockResolvedValue({ filename: 'export.csv', data: 'csv', rowCount: 10 }),
  };
}

function mockDatabaseService() {
  return {
    getAllDatabasesStatus: jest.fn().mockResolvedValue({
      system: { size: 1024000, tables: 10 },
      projects: [{ name: 'proj-001', size: 512000, tables: 5 }],
    }),
    checkSystemIntegrity: jest.fn().mockResolvedValue({ ok: true, errors: [] }),
    checkProjectIntegrity: jest.fn().mockResolvedValue({ ok: true, errors: [] }),
    vacuumSystem: jest.fn().mockResolvedValue({ reclaimed: 512000 }),
    vacuumProject: jest.fn().mockResolvedValue({ reclaimed: 256000 }),
  };
}

function mockBackupService() {
  return {
    listBackups: jest
      .fn()
      .mockResolvedValue([
        { filename: 'backup_20260724.db', size: 1024000, createdAt: new Date().toISOString() },
      ]),
    getBackupStats: jest.fn().mockResolvedValue({ total: 5, totalSize: 5120000 }),
    getBackupLogs: jest
      .fn()
      .mockResolvedValue([{ id: 'log-1', status: 'success', createdAt: new Date().toISOString() }]),
    createSystemBackup: jest
      .fn()
      .mockResolvedValue({ filename: 'backup_manual.db', size: 1024000 }),
    createProjectBackup: jest.fn().mockResolvedValue({ filename: 'proj_backup.db', size: 512000 }),
    deleteBackup: jest.fn().mockResolvedValue(undefined),
    restoreBackup: jest.fn().mockResolvedValue(undefined),
    restoreProjectBackup: jest.fn().mockResolvedValue(undefined),
    cleanupExpired: jest.fn().mockResolvedValue(3),
    getBackupConfig: jest.fn().mockResolvedValue({ autoBackup: true, retentionDays: 30 }),
    saveBackupConfig: jest.fn().mockResolvedValue({ autoBackup: false }),
  };
}

function makeServices(overrides: Partial<BackendToolServices> = {}): BackendToolServices {
  return {
    deviceService: mockDeviceService(),
    alarmService: mockExtendedAlarmService(),
    dataQueryService: mockExtendedDataQueryService(),
    knowledgeService: mockKnowledgeService(),
    healthService: mockHealthService(),
    alarmStatisticsService: mockAlarmStatsService(),
    templateService: mockTemplateService(),
    deviceCreateService: mockDeviceCreateService(),
    dictService: mockDictService(),
    dbConnectionService: mockDbConnectionService(),
    projectService: mockProjectService(),
    reportService: mockReportService(),
    datatagService: mockDatatagService(),
    scriptService: mockScriptService(),
    // 批次 E-I 新增服务
    alarmOpsService: mockAlarmOpsService(),
    deviceOpsService: mockDeviceOpsService(),
    deviceGroupService: mockDeviceGroupService(),
    deviceDiagnosticService: mockDeviceDiagnosticService(),
    userService: mockUserService(),
    roleService: mockRoleService(),
    sessionService: mockSessionService(),
    auditLogService: mockAuditLogService(),
    menuService: mockMenuService(),
    pluginManagerService: mockPluginManagerService(),
    pipelineDiagService: mockPipelineDiagService(),
    offlineCacheService: mockOfflineCacheService(),
    collectorDiagService: mockCollectorDiagService(),
    baseServicesService: mockBaseServicesService(),
    influxAdminService: mockInfluxAdminService(),
    systemConfigService: mockSystemConfigService(),
    dataExportService: mockDataExportService(),
    databaseService: mockDatabaseService(),
    backupService: mockBackupService(),
    ...overrides,
  };
}

// ============================================================
// data_query
// ============================================================

describe('data_query', () => {
  it('应有正确的 schema', () => {
    const tool = createDataQueryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('data_query');
    expect(tool!.category).toBe('data');
    expect(tool!.frontend).toBe(false);
    expect(tool!.params.length).toBe(4);
    expect(tool!.params[0].required).toBe(true); // tagId
    expect(tool!.params[3].required).toBe(false); // pageSize
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDataQueryTool({});
    expect(tool).toBeNull();
  });

  it('应正确查询并返回 JSON', async () => {
    const services = makeServices();
    const tool = createDataQueryTool(services)!;
    const result = await tool.execute({
      tagId: 't1',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tagId).toBe('t1');
    expect(parsed.total).toBe(100);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.dataQueryService!.queryTimeRange = jest
      .fn()
      .mockRejectedValue(new Error('DB 连接失败'));
    const tool = createDataQueryTool(services)!;
    const result = await tool.execute({
      tagId: 't1',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('DB 连接失败');
  });
});

// ============================================================
// data_aggregate
// ============================================================

describe('data_aggregate', () => {
  it('应有正确的 schema', () => {
    const tool = createDataAggregateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('data_aggregate');
    expect(tool!.category).toBe('data');
  });

  it('应拒绝无效聚合类型', async () => {
    const tool = createDataAggregateTool(makeServices())!;
    const result = await tool.execute({
      tagId: 't1',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
      type: 'median',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不支持的聚合类型');
  });

  it('应正确执行 avg 聚合', async () => {
    const tool = createDataAggregateTool(makeServices())!;
    const result = await tool.execute({
      tagId: 't1',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
      type: 'avg',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.type).toBe('avg');
    expect(parsed.value).toBe(52.5);
  });
});

// ============================================================
// device_getStatus
// ============================================================

describe('device_getStatus', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceStatusTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_getStatus');
    expect(tool!.category).toBe('device');
    expect(tool!.frontend).toBe(false);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceStatusTool({});
    expect(tool).toBeNull();
  });

  it('应查询单个设备详情', async () => {
    const tool = createDeviceStatusTool(makeServices())!;
    const result = await tool.execute({ projectId: 'p1', deviceId: 'd1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.device.id).toBe('d1');
    expect(parsed.device.deviceName).toBe('设备A');
  });

  it('应返回设备统计总览', async () => {
    const tool = createDeviceStatusTool(makeServices())!;
    const result = await tool.execute({ projectId: 'p1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.summary.total).toBe(10);
    expect(parsed.summary.online).toBe(5);
    expect(parsed.summary.offline).toBe(3);
  });

  it('应按状态过滤设备', async () => {
    const tool = createDeviceStatusTool(makeServices())!;
    const result = await tool.execute({ projectId: 'p1', status: 'online' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.filterStatus).toBe('online');
    expect(parsed.filteredTotal).toBe(1);
  });
});

// ============================================================
// device_getHistory
// ============================================================

describe('device_getHistory', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceHistoryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_getHistory');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 dataQueryService）', () => {
    const tool = createDeviceHistoryTool({ deviceService: mockDeviceService() });
    expect(tool).toBeNull();
  });

  it('应返回标签历史数据+统计', async () => {
    const tool = createDeviceHistoryTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'p1',
      tagId: 't1',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.stats.avg).toBe(50);
    expect(parsed.stats.max).toBe(100);
    expect(parsed.recordCount).toBe(100);
  });
});

// ============================================================
// alarm_getHistory
// ============================================================

describe('alarm_getHistory', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmHistoryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_getHistory');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmHistoryTool({});
    expect(tool).toBeNull();
  });

  it('应返回报警记录列表', async () => {
    const tool = createAlarmHistoryTool(makeServices())!;
    const result = await tool.execute({ projectId: 'p1', limit: 10 });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.records[0].rule).toBe('温度过高');
    expect(parsed.records[0].level).toBe('ERROR');
  });

  it('summary 模式应返回统计概览', async () => {
    const tool = createAlarmHistoryTool(makeServices())!;
    const result = await tool.execute({ projectId: 'p1', mode: 'summary' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.summary.total).toBe(50);
    expect(parsed.summary.active).toBe(3);
  });

  it('无统计服务时 summary 回退到 records', async () => {
    const services = makeServices();
    delete services.alarmStatisticsService;
    const tool = createAlarmHistoryTool(services)!;
    const result = await tool.execute({ projectId: 'p1', mode: 'summary' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.records).toBeDefined();
  });
});

// ============================================================
// knowledge_search
// ============================================================

describe('knowledge_search', () => {
  it('应有正确的 schema', () => {
    const tool = createKnowledgeSearchTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('knowledge_search');
    expect(tool!.category).toBe('knowledge');
    expect(tool!.params[0].required).toBe(true); // query
    expect(tool!.params[1].required).toBe(false); // product
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createKnowledgeSearchTool({});
    expect(tool).toBeNull();
  });

  it('应正确搜索知识库', async () => {
    const tool = createKnowledgeSearchTool(makeServices())!;
    const result = await tool.execute({ query: 'Modbus 设备接入' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
    expect(parsed.results[0].title).toBe('设备接入指南');
  });
});

// ============================================================
// system_getHealth
// ============================================================

describe('system_getHealth', () => {
  it('应有正确的 schema', () => {
    const tool = createSystemHealthTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('system_getHealth');
    expect(tool!.category).toBe('system');
    expect(tool!.params.length).toBe(0); // 无参数
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createSystemHealthTool({});
    expect(tool).toBeNull();
  });

  it('应返回系统健康状态', async () => {
    const tool = createSystemHealthTool(makeServices())!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe('healthy');
    expect(parsed.database).toBe('connected');
    expect(parsed.memory.usedMB).toBe(512);
    expect(parsed.cpu).toBe(0.5);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.healthService!.getDetailed = jest.fn().mockRejectedValue(new Error('DB 连接超时'));
    const tool = createSystemHealthTool(services)!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('DB 连接超时');
  });
});

// ============================================================
// template_list
// ============================================================

describe('template_list', () => {
  it('应有正确的 schema', () => {
    const tool = createTemplateListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('template_list');
    expect(tool!.category).toBe('template');
    expect(tool!.frontend).toBe(false);
    expect(tool!.params.length).toBe(3);
    expect(tool!.params[0].required).toBe(false); // deviceType
    expect(tool!.params[1].required).toBe(false); // keyword
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createTemplateListTool({});
    expect(tool).toBeNull();
  });

  it('应正确查询模板列表', async () => {
    const tool = createTemplateListTool(makeServices())!;
    const result = await tool.execute({ keyword: '温湿度' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
    expect(parsed.templates[0].name).toBe('温湿度传感器模板');
    expect(parsed.templates[0].variableCount).toBe(2);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.templateService!.findAll = jest.fn().mockRejectedValue(new Error('模板加载失败'));
    const tool = createTemplateListTool(services)!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('模板加载失败');
  });
});

// ============================================================
// template_detail
// ============================================================

describe('template_detail', () => {
  it('应有正确的 schema', () => {
    const tool = createTemplateDetailTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('template_detail');
    expect(tool!.category).toBe('template');
    expect(tool!.params.length).toBe(1);
    expect(tool!.params[0].required).toBe(true); // templateId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createTemplateDetailTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回模板详情', async () => {
    const tool = createTemplateDetailTool(makeServices())!;
    const result = await tool.execute({ templateId: 'tpl-temp-hum-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.template.name).toBe('温湿度传感器模板');
    expect(parsed.template.variables).toHaveLength(2);
    expect(parsed.template.variables[0].name).toBe('temperature');
    expect(parsed.template.variables[0].readWrite).toBe('read');
    expect(parsed.template.variables[0].deadband).toBe(0.5);
  });

  it('模板不存在时应返回错误', async () => {
    const services = makeServices();
    services.templateService!.findById = jest
      .fn()
      .mockRejectedValue(new Error('设备采集变量模板不存在'));
    const tool = createTemplateDetailTool(services)!;
    const result = await tool.execute({ templateId: 'nonexistent' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('设备采集变量模板不存在');
  });
});

// ============================================================
// template_create
// ============================================================

describe('template_create', () => {
  it('应有正确的 schema', () => {
    const tool = createTemplateCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('template_create');
    expect(tool!.category).toBe('template');
    expect(tool!.params.length).toBe(4);
    expect(tool!.params[0].required).toBe(true); // name
    expect(tool!.params[1].required).toBe(true); // deviceType
    expect(tool!.params[3].required).toBe(true); // variables
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createTemplateCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建模板', async () => {
    const tool = createTemplateCreateTool(makeServices())!;
    const result = await tool.execute({
      name: '压力传感器模板',
      deviceType: 'sensor',
      variables: [
        {
          name: 'pressure',
          label: '压力',
          address: 'ns=2;s=Pressure',
          dataType: 'float32',
          unit: 'MPa',
        },
      ],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.template.name).toBe('压力传感器模板');
    expect(parsed.template.variableCount).toBe(2);
  });

  it('变量为空时应返回错误', async () => {
    const tool = createTemplateCreateTool(makeServices())!;
    const result = await tool.execute({
      name: '空模板',
      deviceType: 'sensor',
      variables: [],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('请至少定义一个变量');
  });

  it('无 variables 参数时应返回错误', async () => {
    const tool = createTemplateCreateTool(makeServices())!;
    const result = await tool.execute({
      name: '空模板',
      deviceType: 'sensor',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('请至少定义一个变量');
  });
});

// ============================================================
// driver_list
// ============================================================

describe('driver_list', () => {
  it('应有正确的 schema', () => {
    const tool = createDriverListTool({});
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('driver_list');
    expect(tool!.category).toBe('device');
    expect(tool!.frontend).toBe(false);
    expect(tool!.params.length).toBe(0); // 无参数
  });

  it('无需 service 即可创建', () => {
    const tool = createDriverListTool({});
    expect(tool).not.toBeNull();
  });

  it('应返回 6 种驱动', async () => {
    const tool = createDriverListTool({})!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.drivers).toHaveLength(6);
  });

  it('应包含所有驱动类型', async () => {
    const tool = createDriverListTool({})!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    const names = parsed.drivers.map((d: { name: string }) => d.name);
    expect(names).toContain('modbus_tcp');
    expect(names).toContain('modbus_rtu');
    expect(names).toContain('opc_ua');
    expect(names).toContain('mqtt');
    expect(names).toContain('siemens_s7');
    expect(names).toContain('virtual');
  });

  it('每个驱动应有连接配置模板', async () => {
    const tool = createDriverListTool({})!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    for (const driver of parsed.drivers) {
      expect(driver.connectionTemplate).toBeDefined();
      expect(typeof driver.connectionTemplate).toBe('object');
    }
  });
});

// ============================================================
// device_create
// ============================================================

describe('device_create', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_create');
    expect(tool!.category).toBe('device');
    expect(tool!.params.length).toBe(9);
    expect(tool!.params[0].required).toBe(true); // projectId
    expect(tool!.params[4].required).toBe(true); // driver
    expect(tool!.params[5].required).toBe(true); // connection
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建设备', async () => {
    const tool = createDeviceCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: '测试工程',
      name: '温湿度传感器',
      deviceCode: 'temp-hum-001',
      templateId: 'tpl-temp-hum-001',
      driver: 'modbus_tcp',
      connection: { host: '192.168.1.100', port: 502, slaveId: 1 },
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.device.deviceName).toBe('温湿度传感器');
    expect(parsed.device.deviceCode).toBe('temp-hum-001');
    expect(parsed.device.driver).toBe('modbus_tcp');
    expect(parsed.device.status).toBe('offline');
    expect(parsed.message).toContain('采集任务将在下次调度时自动注册');
  });

  it('缺少 connection 时应返回错误', async () => {
    const tool = createDeviceCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: '测试工程',
      name: '温湿度传感器',
      deviceCode: 'temp-hum-001',
      templateId: 'tpl-temp-hum-001',
      driver: 'modbus_tcp',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('connection');
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.deviceCreateService!.createDevice = jest
      .fn()
      .mockRejectedValue(new Error('设备名称已存在'));
    const tool = createDeviceCreateTool(services)!;
    const result = await tool.execute({
      projectId: '测试工程',
      name: '温湿度传感器',
      deviceCode: 'temp-hum-001',
      templateId: 'tpl-temp-hum-001',
      driver: 'modbus_tcp',
      connection: { host: '192.168.1.100', port: 502 },
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('设备名称已存在');
  });
});

// ============================================================
// dict_list
// ============================================================

describe('dict_list', () => {
  it('应有正确的 schema', () => {
    const tool = createDictListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('dict_list');
    expect(tool!.category).toBe('dict');
    expect(tool!.frontend).toBe(false);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDictListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回字典分类列表', async () => {
    const tool = createDictListTool(makeServices())!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0].category).toBe('设备类型');
    expect(parsed.categories[0].tables[0].dictId).toBe('device-type');
  });
});

// ============================================================
// dict_detail
// ============================================================

describe('dict_detail', () => {
  it('应有正确的 schema', () => {
    const tool = createDictDetailTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('dict_detail');
    expect(tool!.category).toBe('dict');
    expect(tool!.params[0].required).toBe(true); // dictId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDictDetailTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回字典详情', async () => {
    const tool = createDictDetailTool(makeServices())!;
    const result = await tool.execute({ dictId: 'device-type' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.dict.dictId).toBe('device-type');
    expect(parsed.dict.items).toHaveLength(2);
    expect(parsed.dict.items[0].value).toBe('sensor');
  });

  it('字典不存在时应返回错误', async () => {
    const services = makeServices();
    services.dictService!.getDict = jest.fn().mockReturnValue(undefined);
    const tool = createDictDetailTool(services)!;
    const result = await tool.execute({ dictId: 'nonexistent' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不存在');
  });
});

// ============================================================
// dict_create
// ============================================================

describe('dict_create', () => {
  it('应有正确的 schema', () => {
    const tool = createDictCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('dict_create');
    expect(tool!.category).toBe('dict');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDictCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建字典', async () => {
    const tool = createDictCreateTool(makeServices())!;
    const result = await tool.execute({
      locale: 'zh-CN',
      dictId: 'test-level',
      dictName: '测试级别',
      category: '测试',
      items: [{ value: 'L1', label: '等级1' }],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.dict.dictId).toBe('test-level');
  });

  it('缺少必填参数时应返回错误', async () => {
    const tool = createDictCreateTool(makeServices())!;
    const result = await tool.execute({ dictId: 'test' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('非空数组');
  });
});

// ============================================================
// dict_addItems
// ============================================================

describe('dict_addItems', () => {
  it('应有正确的 schema', () => {
    const tool = createDictAddItemsTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('dict_addItems');
    expect(tool!.category).toBe('dict');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDictAddItemsTool({});
    expect(tool).toBeNull();
  });

  it('应正确追加条目', async () => {
    const tool = createDictAddItemsTool(makeServices())!;
    const result = await tool.execute({
      dictId: 'device-type',
      items: [{ value: 'gateway', label: '网关' }],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('字典不存在时应返回错误', async () => {
    const services = makeServices();
    services.dictService!.getDict = jest.fn().mockReturnValue(undefined);
    const tool = createDictAddItemsTool(services)!;
    const result = await tool.execute({
      dictId: 'nonexistent',
      items: [{ value: 'test', label: '测试' }],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不存在');
  });
});

// ============================================================
// dict_search
// ============================================================

describe('dict_search', () => {
  it('应有正确的 schema', () => {
    const tool = createDictSearchTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('dict_search');
    expect(tool!.category).toBe('dict');
    expect(tool!.params[0].required).toBe(true); // keyword
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDictSearchTool({});
    expect(tool).toBeNull();
  });

  it('应正确搜索字典条目', async () => {
    const tool = createDictSearchTool(makeServices())!;
    const result = await tool.execute({ keyword: '传感器' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 批次 A: 外部数据库接入 (5) + 项目管理 (4)
// ============================================================

describe('db_connection_list', () => {
  it('应有正确的 schema', () => {
    const tool = createDbConnectionListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('db_connection_list');
    expect(tool!.category).toBe('datasource');
    expect(tool!.frontend).toBe(false);
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDbConnectionListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回连接列表', async () => {
    const tool = createDbConnectionListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections[0].name).toBe('生产数据库');
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.dbConnectionService!.findAll = jest.fn().mockRejectedValue(new Error('查询失败'));
    const tool = createDbConnectionListTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('查询失败');
  });
});

describe('db_connection_create', () => {
  it('应有正确的 schema', () => {
    const tool = createDbConnectionCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('db_connection_create');
    expect(tool!.category).toBe('datasource');
    expect(tool!.params[0].required).toBe(true); // projectId
    expect(tool!.params[1].required).toBe(true); // name
    expect(tool!.params[2].required).toBe(true); // dbType
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDbConnectionCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建连接', async () => {
    const tool = createDbConnectionCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '新连接',
      dbType: 'mysql',
      host: '192.168.1.200',
      port: 3306,
      database: 'test',
      username: 'root',
      password: '123456',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.connection.id).toBe('conn-2');
  });

  it('缺少必填参数时应返回错误', async () => {
    const tool = createDbConnectionCreateTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('缺少');
  });
});

describe('db_connection_test', () => {
  it('应有正确的 schema', () => {
    const tool = createDbConnectionTestTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('db_connection_test');
    expect(tool!.category).toBe('datasource');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDbConnectionTestTool({});
    expect(tool).toBeNull();
  });

  it('应正确测试连接', async () => {
    const tool = createDbConnectionTestTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', connectionId: 'conn-1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.latency).toBe(15);
  });

  it('连接失败时应返回错误', async () => {
    const services = makeServices();
    services.dbConnectionService!.test = jest.fn().mockResolvedValue({
      success: false,
      latency: 0,
      error: 'Connection refused',
    });
    const tool = createDbConnectionTestTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', connectionId: 'conn-1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Connection refused');
  });
});

describe('db_connection_tables', () => {
  it('应有正确的 schema', () => {
    const tool = createDbConnectionTablesTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('db_connection_tables');
    expect(tool!.category).toBe('datasource');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDbConnectionTablesTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回表列表', async () => {
    const tool = createDbConnectionTablesTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', connectionId: 'conn-1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tables).toHaveLength(3);
    expect(parsed.tables).toContain('users');
  });
});

describe('db_connection_query', () => {
  it('应有正确的 schema', () => {
    const tool = createDbConnectionQueryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('db_connection_query');
    expect(tool!.category).toBe('datasource');
    expect(tool!.params[2].required).toBe(true); // sql
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDbConnectionQueryTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行查询', async () => {
    const tool = createDbConnectionQueryTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      connectionId: 'conn-1',
      sql: 'SELECT * FROM users',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].id).toBe(1);
  });

  it('应拒绝非 SELECT 语句', async () => {
    const tool = createDbConnectionQueryTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      connectionId: 'conn-1',
      sql: 'DROP TABLE users',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('SELECT');
  });
});

describe('project_list', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_list');
    expect(tool!.category).toBe('project');
    expect(tool!.frontend).toBe(false);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回项目列表', async () => {
    const tool = createProjectListTool(makeServices())!;
    const result = await tool.execute({ userId: 'user-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.projects[0].name).toBe('测试工程');
    expect(parsed.total).toBe(1);
  });
});

describe('project_info', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectInfoTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_info');
    expect(tool!.category).toBe('project');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectInfoTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回项目详情', async () => {
    const tool = createProjectInfoTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', userId: 'user-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.project.name).toBe('测试工程');
    expect(parsed.project.version).toBe('1.0.0');
  });
});

describe('project_export', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectExportTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_export');
    expect(tool!.category).toBe('project');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectExportTool({});
    expect(tool).toBeNull();
  });

  it('应正确导出项目', async () => {
    const tool = createProjectExportTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      userId: 'user-001',
      includeRtdb: false,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.filePath).toBeDefined();
    expect(parsed.fileName).toContain('.zip');
  });
});

describe('project_import', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectImportTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_import');
    expect(tool!.category).toBe('project');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectImportTool({});
    expect(tool).toBeNull();
  });

  it('应正确导入项目', async () => {
    const tool = createProjectImportTool(makeServices())!;
    const result = await tool.execute({
      filePath: '/tmp/proj-001.zip',
      userId: 'user-001',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.project.name).toBe('导入工程');
  });

  it('缺少 filePath 时应返回错误', async () => {
    const tool = createProjectImportTool(makeServices())!;
    const result = await tool.execute({ userId: 'user-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('filePath');
  });
});

// ============================================================
// 批次 B: 趋势数据 (4) + 项目诊断 (4)
// ============================================================

describe('tag_list', () => {
  it('应有正确的 schema', () => {
    const tool = createTagListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('tag_list');
    expect(tool!.category).toBe('datatag');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createTagListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回标签列表', async () => {
    const tool = createTagListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tags).toHaveLength(2);
    expect(parsed.total).toBe(2);
  });

  it('应支持关键词搜索', async () => {
    const tool = createTagListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', keyword: '温度' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('trend_query', () => {
  it('应有正确的 schema', () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendQueryTool(services);
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('trend_query');
    expect(tool!.category).toBe('data');
  });

  it('应返回 null（缺少 queryTrend）', () => {
    const tool = createTrendQueryTool({ dataQueryService: mockDataQueryService() });
    expect(tool).toBeNull();
  });

  it('应正确查询趋势数据', async () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendQueryTool(services)!;
    const result = await tool.execute({
      tagIds: ['tag-001'],
      startTime: '2026-07-24T00:00:00Z',
      endTime: '2026-07-24T23:59:59Z',
      projectId: 'proj-001',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].tagId).toBe('tag-001');
  });

  it('tagIds 为空时应返回错误', async () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendQueryTool(services)!;
    const result = await tool.execute({
      tagIds: [],
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-02T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('tagIds');
  });
});

describe('trend_aggregate', () => {
  it('应有正确的 schema', () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendAggregateTool(services);
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('trend_aggregate');
    expect(tool!.category).toBe('data');
  });

  it('应返回 null（缺少 aggregate）', () => {
    const tool = createTrendAggregateTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行聚合', async () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendAggregateTool(services)!;
    const result = await tool.execute({
      tagId: 'tag-001',
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-24T00:00:00Z',
      type: 'avg',
      projectId: 'proj-001',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('trend_export', () => {
  it('应有正确的 schema', () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendExportTool(services);
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('trend_export');
    expect(tool!.category).toBe('data');
  });

  it('应返回 null（缺少 exportTrend）', () => {
    const tool = createTrendExportTool({});
    expect(tool).toBeNull();
  });

  it('应正确导出趋势数据', async () => {
    const services = makeServices();
    services.dataQueryService = mockExtendedDataQueryService();
    const tool = createTrendExportTool(services)!;
    const result = await tool.execute({
      tagIds: ['tag-001'],
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-24T00:00:00Z',
      projectId: 'proj-001',
      format: 'csv',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.fileName).toContain('trend');
  });
});

describe('project_manage_info', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectManageInfoTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_manage_info');
    expect(tool!.category).toBe('project');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectManageInfoTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回项目概览', async () => {
    const tool = createProjectManageInfoTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.info.projectName).toBe('测试工程');
    expect(parsed.info.pageCount).toBe(5);
    expect(parsed.info.dbMode).toBe('isolated');
  });
});

describe('project_diagnose', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectDiagnoseTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_diagnose');
    expect(tool!.category).toBe('project');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectDiagnoseTool({});
    expect(tool).toBeNull();
  });

  it('应正确诊断项目', async () => {
    const tool = createProjectDiagnoseTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.health).toBe('healthy');
    expect(parsed.issues).toHaveLength(0);
  });

  it('发现问题时应返回 issues', async () => {
    const services = makeServices();
    services.projectService!.diagnose = jest.fn().mockResolvedValue({
      health: 'degraded',
      resources: { db: 'ok', rtdb: 'missing' },
      issues: ['rtdb 目录缺失'],
    });
    const tool = createProjectDiagnoseTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.health).toBe('degraded');
    expect(parsed.issues).toContain('rtdb 目录缺失');
  });
});

describe('project_init_resources', () => {
  it('应有正确的 schema', () => {
    const tool = createProjectInitResourcesTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('project_init_resources');
    expect(tool!.category).toBe('project');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createProjectInitResourcesTool({});
    expect(tool).toBeNull();
  });

  it('应正确初始化资源', async () => {
    const tool = createProjectInitResourcesTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.initialized).toContain('db');
  });
});

describe('system_health_detailed', () => {
  it('应有正确的 schema', () => {
    const tool = createSystemHealthDetailedTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('system_health_detailed');
    expect(tool!.category).toBe('system');
    expect(tool!.params.length).toBe(0);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createSystemHealthDetailedTool({});
    expect(tool).toBeNull();
  });

  it('应返回详细健康状态', async () => {
    const tool = createSystemHealthDetailedTool(makeServices())!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe('healthy');
    expect(parsed.database).toBe('connected');
  });
});

// ============================================================
// 批次 C: 报表 (4) + 报警 (3) + 标签 (2)
// ============================================================

describe('report_template_list', () => {
  it('应有正确的 schema', () => {
    const tool = createReportTemplateListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('report_template_list');
    expect(tool!.category).toBe('report');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createReportTemplateListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回模板列表', async () => {
    const tool = createReportTemplateListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('report_template_create', () => {
  it('应有正确的 schema', () => {
    const tool = createReportTemplateCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('report_template_create');
    expect(tool!.category).toBe('report');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createReportTemplateCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建模板', async () => {
    const tool = createReportTemplateCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '日报模板',
      description: '每日数据汇总',
      config: { type: 'daily', metrics: ['avg', 'max'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.template.name).toBe('日报模板');
  });
});

describe('report_schedule_create', () => {
  it('应有正确的 schema', () => {
    const tool = createReportScheduleCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('report_schedule_create');
    expect(tool!.category).toBe('report');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createReportScheduleCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建定时导出', async () => {
    const tool = createReportScheduleCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      templateId: 'tpl-001',
      cronExpression: '0 0 8 * * *',
      exportFormat: 'excel',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.schedule.cronExpression).toBe('0 0 9 * * *');
  });
});

describe('report_generate', () => {
  it('应有正确的 schema', () => {
    const tool = createReportGenerateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('report_generate');
    expect(tool!.category).toBe('report');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createReportGenerateTool({});
    expect(tool).toBeNull();
  });

  it('应正确生成日报', async () => {
    const tool = createReportGenerateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      type: 'daily',
      date: '2026-07-24',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.report.type).toBe('daily');
  });

  it('应正确生成月报', async () => {
    const tool = createReportGenerateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      type: 'monthly',
      month: '2026-07',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('无效的报表类型应返回错误', async () => {
    const tool = createReportGenerateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      type: 'invalid',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不支持的报表类型');
  });
});

describe('alarm_rule_list', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmRuleListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_rule_list');
    expect(tool!.category).toBe('alarm');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 getRules）', () => {
    const tool = createAlarmRuleListTool({ alarmService: mockAlarmService() });
    expect(tool).toBeNull();
  });

  it('应正确返回报警规则列表', async () => {
    const services = makeServices();
    services.alarmService = mockExtendedAlarmService();
    const tool = createAlarmRuleListTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].name).toBe('温度过高');
    expect(parsed.rules[0].level).toBe('CRITICAL');
  });
});

describe('alarm_rule_create', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmRuleCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_rule_create');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 createRule）', () => {
    const tool = createAlarmRuleCreateTool({ alarmService: mockAlarmService() });
    expect(tool).toBeNull();
  });

  it('应正确创建报警规则', async () => {
    const services = makeServices();
    services.alarmService = mockExtendedAlarmService();
    const tool = createAlarmRuleCreateTool(services)!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '压力过高',
      tagId: 'tag-002',
      level: 'WARNING',
      condition: 'gt',
      conditionValue: 100,
      debounceMs: 3000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.rule.name).toBe('压力过高');
  });

  it('无效的 condition 应返回错误', async () => {
    const services = makeServices();
    services.alarmService = mockExtendedAlarmService();
    const tool = createAlarmRuleCreateTool(services)!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '测试',
      tagId: 'tag-001',
      level: 'INFO',
      condition: 'invalid',
      conditionValue: 10,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不支持的条件');
  });
});

describe('alarm_suppression_add', () => {
  it('应有正确的 schema', () => {
    const services = makeServices();
    services.alarmService = mockExtendedAlarmService();
    const tool = createAlarmSuppressionAddTool(services);
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_suppression_add');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 addSuppressionRule）', () => {
    const tool = createAlarmSuppressionAddTool({ alarmService: mockAlarmService() });
    expect(tool).toBeNull();
  });

  it('应正确添加 parent_child 抑制规则', async () => {
    const services = makeServices();
    services.alarmService = mockExtendedAlarmService();
    const tool = createAlarmSuppressionAddTool(services)!;
    const result = await tool.execute({
      projectId: 'proj-001',
      type: 'parent_child',
      parentRuleId: 'rule-001',
      childRuleIds: ['rule-002', 'rule-003'],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.suppression.id).toBe('supp-001');
  });
});

describe('datatag_configure', () => {
  it('应有正确的 schema', () => {
    const tool = createDatatagConfigureTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('datatag_configure');
    expect(tool!.category).toBe('datatag');
    expect(tool!.params[0].required).toBe(true); // tagId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDatatagConfigureTool({});
    expect(tool).toBeNull();
  });

  it('应正确配置单个标签', async () => {
    const tool = createDatatagConfigureTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      tagId: 'tag-001',
      scale: 1,
      offset: 0,
      unit: '°C',
      scanRate: 2000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tag.id).toBe('tag-001');
  });
});

describe('datatag_batch_configure', () => {
  it('应有正确的 schema', () => {
    const tool = createDatatagBatchConfigureTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('datatag_batch_configure');
    expect(tool!.category).toBe('datatag');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDatatagBatchConfigureTool({});
    expect(tool).toBeNull();
  });

  it('应正确批量配置标签', async () => {
    const tool = createDatatagBatchConfigureTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      tagIds: ['tag-001', 'tag-002'],
      scanRate: 5000,
      enabled: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.updatedCount).toBe(2);
  });

  it('tagIds 为空时应返回错误', async () => {
    const tool = createDatatagBatchConfigureTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      tagIds: [],
      scanRate: 5000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('tagIds');
  });
});

// ============================================================
// 批次 D: 脚本 (5)
// ============================================================

describe('script_api_list', () => {
  it('应有正确的 schema', () => {
    const tool = createScriptApiListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('script_api_list');
    expect(tool!.category).toBe('script');
    expect(tool!.params.length).toBe(0);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createScriptApiListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回 API 列表', async () => {
    const tool = createScriptApiListTool(makeServices())!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.apis).toHaveLength(2);
    expect(parsed.apis[0].name).toBe('readTag');
  });
});

describe('script_validate', () => {
  it('应有正确的 schema', () => {
    const tool = createScriptValidateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('script_validate');
    expect(tool!.category).toBe('script');
    expect(tool!.params[0].required).toBe(true); // code
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createScriptValidateTool({});
    expect(tool).toBeNull();
  });

  it('应正确校验合法脚本', async () => {
    const tool = createScriptValidateTool(makeServices())!;
    const result = await tool.execute({ code: 'const x = 1;' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.valid).toBe(true);
  });

  it('应检测语法错误', async () => {
    const tool = createScriptValidateTool(makeServices())!;
    const result = await tool.execute({ code: 'const x = ;' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.valid).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});

describe('script_dry_run', () => {
  it('应有正确的 schema', () => {
    const tool = createScriptDryRunTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('script_dry_run');
    expect(tool!.category).toBe('script');
    expect(tool!.params[0].required).toBe(true); // code
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createScriptDryRunTool({});
    expect(tool).toBeNull();
  });

  it('应正确试运行脚本', async () => {
    const tool = createScriptDryRunTool(makeServices())!;
    const result = await tool.execute({ code: 'return 42;', projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.result).toBeDefined();
  });
});

describe('script_create', () => {
  it('应有正确的 schema', () => {
    const tool = createScriptCreateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('script_create');
    expect(tool!.category).toBe('script');
    expect(tool!.params[0].required).toBe(true); // projectId
    expect(tool!.params[1].required).toBe(true); // name
    expect(tool!.params[2].required).toBe(true); // code
    expect(tool!.params[3].required).toBe(true); // triggerType
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createScriptCreateTool({});
    expect(tool).toBeNull();
  });

  it('应正确创建脚本', async () => {
    const tool = createScriptCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '自动阀门控制',
      code: 'if (readTag("tag-001") > 80) { writeTag("tag-002", 0); }',
      triggerType: 'manual',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.script.name).toBe('自动阀门控制');
  });

  it('无效的 triggerType 应返回错误', async () => {
    const tool = createScriptCreateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      name: '测试',
      code: 'return 1;',
      triggerType: 'invalid',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('不支持的触发类型');
  });
});

describe('script_execute', () => {
  it('应有正确的 schema', () => {
    const tool = createScriptExecuteTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('script_execute');
    expect(tool!.category).toBe('script');
    expect(tool!.params[0].required).toBe(true); // projectId
    expect(tool!.params[1].required).toBe(true); // scriptId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createScriptExecuteTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行脚本', async () => {
    const tool = createScriptExecuteTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      scriptId: 'script-001',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.logs).toBeDefined();
    expect(parsed.logs).toHaveLength(2);
  });

  it('执行失败时应返回错误', async () => {
    const services = makeServices();
    services.scriptService!.executeScript = jest.fn().mockResolvedValue({
      success: false,
      logs: ['[ERROR] 执行失败'],
      error: 'NullPointerException',
    });
    const tool = createScriptExecuteTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', scriptId: 'script-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('NullPointerException');
  });
});

// ============================================================
// 批次 E: 报警处理与运维 (7)
// ============================================================

describe('alarm_acknowledge', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmAcknowledgeTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_acknowledge');
    expect(tool!.category).toBe('alarm');
    expect(tool!.frontend).toBe(false);
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmAcknowledgeTool({});
    expect(tool).toBeNull();
  });

  it('应正确确认单条报警', async () => {
    const tool = createAlarmAcknowledgeTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', recordId: 'rec-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.recordId).toBe('rec-001');
  });

  it('应正确批量确认报警', async () => {
    const tool = createAlarmAcknowledgeTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      recordIds: ['rec-001', 'rec-002'],
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.acknowledged).toBe(2);
  });

  it('缺少 recordId 和 recordIds 时应返回错误', async () => {
    const tool = createAlarmAcknowledgeTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('recordId');
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.alarmOpsService!.acknowledge = jest.fn().mockRejectedValue(new Error('DB 错误'));
    const tool = createAlarmAcknowledgeTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', recordId: 'rec-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('DB 错误');
  });
});

describe('alarm_clear', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmClearTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_clear');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmClearTool({});
    expect(tool).toBeNull();
  });

  it('应正确清除报警', async () => {
    const tool = createAlarmClearTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', recordId: 'rec-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.recordId).toBe('rec-001');
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.alarmOpsService!.clear = jest.fn().mockRejectedValue(new Error('权限不足'));
    const tool = createAlarmClearTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', recordId: 'rec-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('权限不足');
  });
});

describe('alarm_shelve', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmShelveTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_shelve');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmShelveTool({});
    expect(tool).toBeNull();
  });

  it('应正确搁置报警', async () => {
    const tool = createAlarmShelveTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      recordId: 'rec-001',
      duration: 3600,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.duration).toBe(3600);
  });

  it('duration 非正数时应返回错误', async () => {
    const tool = createAlarmShelveTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      recordId: 'rec-001',
      duration: -1,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('duration');
  });
});

describe('alarm_statistics', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmStatisticsTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_statistics');
    expect(tool!.category).toBe('alarm');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmStatisticsTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回统计数据', async () => {
    const tool = createAlarmStatisticsTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.statistics.total).toBe(50);
    expect(parsed.statistics.active).toBe(3);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.alarmOpsService!.getStatistics = jest.fn().mockRejectedValue(new Error('查询失败'));
    const tool = createAlarmStatisticsTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('alarm_escalation_list', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmEscalationListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_escalation_list');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmEscalationListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回升级规则列表', async () => {
    const tool = createAlarmEscalationListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });
});

describe('alarm_suppression_list', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmSuppressionListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_suppression_list');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmSuppressionListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回抑制规则列表', async () => {
    const tool = createAlarmSuppressionListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.suppressionRules).toHaveLength(1);
  });
});

describe('alarm_rule_toggle', () => {
  it('应有正确的 schema', () => {
    const tool = createAlarmRuleToggleTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('alarm_rule_toggle');
    expect(tool!.category).toBe('alarm');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAlarmRuleToggleTool({});
    expect(tool).toBeNull();
  });

  it('应正确禁用报警规则', async () => {
    const tool = createAlarmRuleToggleTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      ruleId: 'rule-001',
      enabled: false,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.enabled).toBe(false);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.alarmOpsService!.toggleRule = jest.fn().mockRejectedValue(new Error('规则不存在'));
    const tool = createAlarmRuleToggleTool(services)!;
    const result = await tool.execute({
      projectId: 'proj-001',
      ruleId: 'rule-xxx',
      enabled: true,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

// ============================================================
// 批次 F: 设备运维管理 (6)
// ============================================================

describe('device_list', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceListTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_list');
    expect(tool!.category).toBe('device');
    expect(tool!.params[0].required).toBe(true); // projectId
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceListTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回设备列表', async () => {
    const tool = createDeviceListTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.devices).toHaveLength(1);
    expect(parsed.total).toBe(1);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.deviceService!.findAll = jest.fn().mockRejectedValue(new Error('项目不存在'));
    const tool = createDeviceListTool(services)!;
    const result = await tool.execute({ projectId: 'bad-proj' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('device_update', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceUpdateTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_update');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceUpdateTool({});
    expect(tool).toBeNull();
  });

  it('应正确更新设备', async () => {
    const tool = createDeviceUpdateTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      scanRate: 2000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.device.scanRate).toBe(2000);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.deviceOpsService!.update = jest.fn().mockRejectedValue(new Error('设备不存在'));
    const tool = createDeviceUpdateTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', deviceId: 'bad' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('device_delete', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceDeleteTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_delete');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceDeleteTool({});
    expect(tool).toBeNull();
  });

  it('应正确删除设备', async () => {
    const tool = createDeviceDeleteTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', deviceId: 'd1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.deleted).toBe(true);
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.deviceOpsService!.remove = jest.fn().mockRejectedValue(new Error('设备不存在'));
    const tool = createDeviceDeleteTool(services)!;
    const result = await tool.execute({ projectId: 'proj-001', deviceId: 'bad' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('device_group_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceGroupManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_group_manage');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceGroupManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createDeviceGroupManageTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('应正确执行 create 操作', async () => {
    const tool = createDeviceGroupManageTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      action: 'create',
      name: '新分组',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.group.name).toBe('新分组');
  });

  it('update 缺少 groupId 时应返回错误', async () => {
    const tool = createDeviceGroupManageTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', action: 'update' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('groupId');
  });

  it('不支持的操作应返回错误', async () => {
    const tool = createDeviceGroupManageTool(makeServices())!;
    const result = await tool.execute({ projectId: 'proj-001', action: 'unknown' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('device_diagnostic', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceDiagnosticTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_diagnostic');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceDiagnosticTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 ping 诊断', async () => {
    const tool = createDeviceDiagnosticTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      action: 'ping',
      host: '192.168.1.1',
      port: 502,
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe('ping');
  });

  it('ping 缺少 host/port 时应返回错误', async () => {
    const tool = createDeviceDiagnosticTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      action: 'ping',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });

  it('应正确执行 read-tag 诊断', async () => {
    const tool = createDeviceDiagnosticTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      action: 'read-tag',
      tagId: 't1',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('device_write_tag', () => {
  it('应有正确的 schema', () => {
    const tool = createDeviceWriteTagTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('device_write_tag');
    expect(tool!.category).toBe('device');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDeviceWriteTagTool({});
    expect(tool).toBeNull();
  });

  it('应正确写入标签值', async () => {
    const tool = createDeviceWriteTagTool(makeServices())!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      tagId: 't1',
      value: '1',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tagId).toBe('t1');
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.deviceOpsService!.writeTagValue = jest.fn().mockRejectedValue(new Error('设备离线'));
    const tool = createDeviceWriteTagTool(services)!;
    const result = await tool.execute({
      projectId: 'proj-001',
      deviceId: 'd1',
      tagId: 't1',
      value: '1',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('设备离线');
  });
});

// ============================================================
// 批次 G: 用户权限管理 (5)
// ============================================================

describe('user_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createUserManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('user_manage');
    expect(tool!.category).toBe('permission');
    expect(tool!.params[0].required).toBe(true); // action
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createUserManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createUserManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
  });

  it('应正确执行 create 操作', async () => {
    const tool = createUserManageTool(makeServices())!;
    const result = await tool.execute({
      action: 'create',
      username: 'newuser',
      password: 'Pass1234!',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.user.username).toBe('newuser');
  });

  it('create 缺少 username/password 时应返回错误', async () => {
    const tool = createUserManageTool(makeServices())!;
    const result = await tool.execute({ action: 'create', username: 'newuser' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('password');
  });

  it('应正确执行 reset-password 操作', async () => {
    const tool = createUserManageTool(makeServices())!;
    const result = await tool.execute({ action: 'reset-password', userId: 'u2' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tempPassword).toBeDefined();
  });

  it('不支持的操作应返回错误', async () => {
    const tool = createUserManageTool(makeServices())!;
    const result = await tool.execute({ action: 'unknown' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('role_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createRoleManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('role_manage');
    expect(tool!.category).toBe('permission');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createRoleManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createRoleManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
  });

  it('应正确执行 detail 操作', async () => {
    const tool = createRoleManageTool(makeServices())!;
    const result = await tool.execute({ action: 'detail', roleId: 'r1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.role.name).toBe('管理员');
  });

  it('detail 缺少 roleId 时应返回错误', async () => {
    const tool = createRoleManageTool(makeServices())!;
    const result = await tool.execute({ action: 'detail' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('menu_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createMenuManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('menu_manage');
    expect(tool!.category).toBe('permission');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createMenuManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 get-tree 操作', async () => {
    const tool = createMenuManageTool(makeServices())!;
    const result = await tool.execute({ action: 'get-tree' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('应正确执行 get-buttons 操作', async () => {
    const tool = createMenuManageTool(makeServices())!;
    const result = await tool.execute({ action: 'get-buttons' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.buttons).toHaveLength(1);
  });

  it('delete-item 缺少 menuId 时应返回错误', async () => {
    const tool = createMenuManageTool(makeServices())!;
    const result = await tool.execute({ action: 'delete-item' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('session_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createSessionManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('session_manage');
    expect(tool!.category).toBe('permission');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createSessionManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createSessionManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list', userId: 'admin' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(1);
  });

  it('应正确执行 force-logout 操作', async () => {
    const tool = createSessionManageTool(makeServices())!;
    const result = await tool.execute({ action: 'force-logout', sessionId: 's1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('force-logout 缺少 sessionId 时应返回错误', async () => {
    const tool = createSessionManageTool(makeServices())!;
    const result = await tool.execute({ action: 'force-logout' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('audit_log_query', () => {
  it('应有正确的 schema', () => {
    const tool = createAuditLogQueryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('audit_log_query');
    expect(tool!.category).toBe('permission');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createAuditLogQueryTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 query 操作', async () => {
    const tool = createAuditLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'query', userId: 'admin' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('应正确执行 stats 操作', async () => {
    const tool = createAuditLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'stats' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.stats.total).toBe(100);
  });

  it('应正确执行 cleanup 操作', async () => {
    const tool = createAuditLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'cleanup' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.deleted).toBe(5);
  });
});

// ============================================================
// 批次 H: 采集器与服务运维 (7)
// ============================================================

describe('plugin_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createPluginManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('plugin_manage');
    expect(tool!.category).toBe('collector');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createPluginManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createPluginManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
  });

  it('应正确执行 activate 操作', async () => {
    const tool = createPluginManageTool(makeServices())!;
    const result = await tool.execute({ action: 'activate', protocol: 'opcua' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('activate 缺少 protocol 时应返回错误', async () => {
    const tool = createPluginManageTool(makeServices())!;
    const result = await tool.execute({ action: 'activate' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('pipeline_diagnose', () => {
  it('应有正确的 schema', () => {
    const tool = createPipelineDiagnoseTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('pipeline_diagnose');
    expect(tool!.category).toBe('collector');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createPipelineDiagnoseTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 metrics 操作', async () => {
    const tool = createPipelineDiagnoseTool(makeServices())!;
    const result = await tool.execute({ action: 'metrics' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.metrics.totalRuns).toBe(100);
  });

  it('应正确执行 diagnostic 操作', async () => {
    const tool = createPipelineDiagnoseTool(makeServices())!;
    const result = await tool.execute({ action: 'diagnostic' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.diagnostic).toBeDefined();
  });

  it('不支持的操作应返回错误', async () => {
    const tool = createPipelineDiagnoseTool(makeServices())!;
    const result = await tool.execute({ action: 'unknown' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('offline_cache_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createOfflineCacheManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('offline_cache_manage');
    expect(tool!.category).toBe('collector');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createOfflineCacheManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 stats 操作', async () => {
    const tool = createOfflineCacheManageTool(makeServices())!;
    const result = await tool.execute({ action: 'stats' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.stats.buffered).toBe(10);
  });

  it('应正确执行 flush 操作', async () => {
    const tool = createOfflineCacheManageTool(makeServices())!;
    const result = await tool.execute({ action: 'flush' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.flushed).toBe(2);
  });

  it('应正确执行 clear 操作', async () => {
    const tool = createOfflineCacheManageTool(makeServices())!;
    const result = await tool.execute({ action: 'clear' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.cleared).toBe(true);
  });
});

describe('collector_diagnostic', () => {
  it('应有正确的 schema', () => {
    const tool = createCollectorDiagnosticTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('collector_diagnostic');
    expect(tool!.category).toBe('collector');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createCollectorDiagnosticTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 device 诊断', async () => {
    const tool = createCollectorDiagnosticTool(makeServices())!;
    const result = await tool.execute({ action: 'device', deviceId: 'd1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('device 诊断缺少 deviceId 时应返回错误', async () => {
    const tool = createCollectorDiagnosticTool(makeServices())!;
    const result = await tool.execute({ action: 'device' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });

  it('应正确执行 tag 诊断', async () => {
    const tool = createCollectorDiagnosticTool(makeServices())!;
    const result = await tool.execute({ action: 'tag', tagId: 't1' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('应正确执行 full 诊断', async () => {
    const tool = createCollectorDiagnosticTool(makeServices())!;
    const result = await tool.execute({ action: 'full' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('base_service_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createBaseServiceManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('base_service_manage');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createBaseServiceManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createBaseServiceManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(2);
  });

  it('应正确执行 restart 操作', async () => {
    const tool = createBaseServiceManageTool(makeServices())!;
    const result = await tool.execute({ action: 'restart', name: 'redis' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('restart 缺少 name 时应返回错误', async () => {
    const tool = createBaseServiceManageTool(makeServices())!;
    const result = await tool.execute({ action: 'restart' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('influxdb_admin', () => {
  it('应有正确的 schema', () => {
    const tool = createInfluxdbAdminTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('influxdb_admin');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createInfluxdbAdminTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 setup-status 操作', async () => {
    const tool = createInfluxdbAdminTool(makeServices())!;
    const result = await tool.execute({ action: 'setup-status' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.setupStatus.initialized).toBe(true);
  });

  it('应正确执行 buckets 操作', async () => {
    const tool = createInfluxdbAdminTool(makeServices())!;
    const result = await tool.execute({ action: 'buckets' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('不支持的操作应返回错误', async () => {
    const tool = createInfluxdbAdminTool(makeServices())!;
    const result = await tool.execute({ action: 'unknown' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('system_config_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createSystemConfigManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('system_config_manage');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createSystemConfigManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createSystemConfigManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('应正确执行 get 操作', async () => {
    const tool = createSystemConfigManageTool(makeServices())!;
    const result = await tool.execute({ action: 'get', key: 'PORT' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.value).toBe('4000');
  });

  it('get 缺少 key 时应返回错误', async () => {
    const tool = createSystemConfigManageTool(makeServices())!;
    const result = await tool.execute({ action: 'get' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

// ============================================================
// 批次 I: 数据治理与备份 (5)
// ============================================================

describe('data_export', () => {
  it('应有正确的 schema', () => {
    const tool = createDataExportTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('data_export');
    expect(tool!.category).toBe('data');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDataExportTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 tag-csv 导出', async () => {
    const tool = createDataExportTool(makeServices())!;
    const result = await tool.execute({
      action: 'tag-csv',
      tagId: 't1',
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-24T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.format).toBe('csv');
  });

  it('tag-csv 缺少 tagId 时应返回错误', async () => {
    const tool = createDataExportTool(makeServices())!;
    const result = await tool.execute({
      action: 'tag-csv',
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-24T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });

  it('应正确执行 batch-json 导出', async () => {
    const tool = createDataExportTool(makeServices())!;
    const result = await tool.execute({
      action: 'batch-json',
      tagIds: ['t1', 't2'],
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-24T00:00:00Z',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.tagCount).toBe(2);
  });
});

describe('database_status', () => {
  it('应有正确的 schema', () => {
    const tool = createDatabaseStatusTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('database_status');
    expect(tool!.category).toBe('ops');
    expect(tool!.params).toHaveLength(0);
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDatabaseStatusTool({});
    expect(tool).toBeNull();
  });

  it('应正确返回数据库状态', async () => {
    const tool = createDatabaseStatusTool(makeServices())!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.status.system).toBeDefined();
  });

  it('异常时应返回错误 JSON', async () => {
    const services = makeServices();
    services.databaseService!.getAllDatabasesStatus = jest
      .fn()
      .mockRejectedValue(new Error('查询失败'));
    const tool = createDatabaseStatusTool(services)!;
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('database_maintain', () => {
  it('应有正确的 schema', () => {
    const tool = createDatabaseMaintainTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('database_maintain');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createDatabaseMaintainTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 system 完整性检查', async () => {
    const tool = createDatabaseMaintainTool(makeServices())!;
    const result = await tool.execute({ action: 'integrity-check', scope: 'system' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.scope).toBe('system');
  });

  it('应正确执行 system VACUUM', async () => {
    const tool = createDatabaseMaintainTool(makeServices())!;
    const result = await tool.execute({ action: 'vacuum', scope: 'system' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('project 完整性检查缺少 projectName 时应返回错误', async () => {
    const tool = createDatabaseMaintainTool(makeServices())!;
    const result = await tool.execute({ action: 'integrity-check', scope: 'project' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('projectName');
  });

  it('不支持的操作应返回错误', async () => {
    const tool = createDatabaseMaintainTool(makeServices())!;
    const result = await tool.execute({ action: 'unknown', scope: 'system' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('backup_manage', () => {
  it('应有正确的 schema', () => {
    const tool = createBackupManageTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('backup_manage');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createBackupManageTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 list 操作', async () => {
    const tool = createBackupManageTool(makeServices())!;
    const result = await tool.execute({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('应正确执行 create-system 操作', async () => {
    const tool = createBackupManageTool(makeServices())!;
    const result = await tool.execute({ action: 'create-system' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('create-project 缺少 projectName 时应返回错误', async () => {
    const tool = createBackupManageTool(makeServices())!;
    const result = await tool.execute({ action: 'create-project' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });

  it('delete 缺少 filename 时应返回错误', async () => {
    const tool = createBackupManageTool(makeServices())!;
    const result = await tool.execute({ action: 'delete' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
  });
});

describe('backup_log_query', () => {
  it('应有正确的 schema', () => {
    const tool = createBackupLogQueryTool(makeServices());
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('backup_log_query');
    expect(tool!.category).toBe('ops');
  });

  it('应返回 null（缺少 service）', () => {
    const tool = createBackupLogQueryTool({});
    expect(tool).toBeNull();
  });

  it('应正确执行 logs 操作', async () => {
    const tool = createBackupLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'logs' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(1);
  });

  it('cleanup 缺少 dbType 时应返回错误', async () => {
    const tool = createBackupLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'cleanup', days: 30 });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('dbType');
  });

  it('cleanup 缺少 days 时应返回错误', async () => {
    const tool = createBackupLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'cleanup', dbType: 'system' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('days');
  });

  it('应正确执行 cleanup 操作', async () => {
    const tool = createBackupLogQueryTool(makeServices())!;
    const result = await tool.execute({ action: 'cleanup', dbType: 'system', days: 30 });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.deleted).toBe(3);
  });
});

// ============================================================
// createAllBackendTools
// ============================================================

describe('createAllBackendTools', () => {
  it('应创建 78 个工具（全部 78 组工厂）', () => {
    const tools = createAllBackendTools(makeServices());
    expect(tools.length).toBe(78);
  });

  it('所有工具名称应唯一', () => {
    const tools = createAllBackendTools(makeServices());
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('所有工具 frontend 应为 false', () => {
    const tools = createAllBackendTools(makeServices());
    expect(tools.every((t) => t.frontend === false)).toBe(true);
  });

  it('所有工具应有 execute 函数', () => {
    const tools = createAllBackendTools(makeServices());
    expect(tools.every((t) => typeof t.execute === 'function')).toBe(true);
  });

  it('缺少 service 时仅创建可用工具', () => {
    // 仅提供 deviceService 和 dataQueryService
    const tools = createAllBackendTools({
      deviceService: mockDeviceService(),
      dataQueryService: mockDataQueryService(),
    });
    const names = tools.map((t) => t.name);
    expect(names).toContain('data_query');
    expect(names).toContain('data_aggregate');
    expect(names).toContain('device_getStatus');
    expect(names).toContain('device_getHistory');
    expect(names).not.toContain('alarm_getHistory');
    expect(names).not.toContain('knowledge_search');
    expect(names).not.toContain('system_getHealth');
    expect(names).toContain('driver_list');
  });

  it('空 services 应仅返回 driver_list（无依赖工具）', () => {
    const tools = createAllBackendTools({});
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('driver_list');
  });
});
