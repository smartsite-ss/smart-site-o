// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Module,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, TypeOrmModuleOptions, getRepositoryToken } from '@nestjs/typeorm';
import {
  AuthModule,
  UserModule,
  WebSocketModule,
  EventBusModule,
  CacheModule,
  HealthModule,
  MetricsModule,
  ConnectionModule,
  RateLimitGuard,
  OperationLogInterceptor,
  DeviceStateModule,
  AiModule,
  DatabaseModule,
  PathModule,
  RedisModule,
  RoleService,
  UserService,
  SessionService,
  createAllBackendTools,
  AgentOrchestratorService,
  SystemEventModule,
  EventLogModule,
  AuditLoggerModule,
  WechatAuthModule,
  WechatSubscribeMessageModule,
} from '@ss-node/ss-core';
import {
  DeviceModule,
  DeviceService,
  DeviceDiagnosticService,
  DeviceDataService,
} from '@ss-node/ss-device';
import { ProjectModule, ProjectService } from '@ss-node/ss-project';
import {
  AlarmModule,
  AlarmService,
  AlarmStatisticsService,
  AlarmSuppressionService,
} from '@ss-node/ss-alarm';
import { ModbusCollectorModule } from '@ss-node/ss-collector-modbus';
import { S7CollectorModule } from '@ss-node/ss-collector-s7';
import { VirtualCollectorModule } from '@ss-node/ss-collector-virtual';
import { MqttCollectorModule } from '@ss-node/ss-collector-mqtt';
import { OpcUaCollectorModule } from '@ss-node/ss-collector-opcua';
import {
  PipelineModule,
  PluginModule,
  PluginExplorerService,
  PluginManagerService,
  PROVIDER_SCANNER,
  OfflineCacheService,
  PipelineMetricsService,
  CollectorDiagnosticsService,
  DiagnosticsModule,
} from '@ss-node/ss-collector-sdk';
import { DataModule, DataQueryService } from '@ss-node/ss-storage-influx';
import { Influxdb3StorageModule } from '@ss-node/ss-storage-influx3';
import { TdengineStorageModule } from '@ss-node/ss-storage-tdengine';
import {
  SystemModule,
  OperationLog,
  KnowledgeService,
  HealthService,
  DeviceTemplateService,
  DictionaryLoaderService,
  UserAdminService,
  OperationLogService,
  BackupService,
  DatabaseService,
  SystemConfigService,
  SystemMenuConfigService,
  SystemRestartService,
  BaseServicesService,
} from '@ss-node/ss-system';
import { DatatagModule, DataTagService } from '@ss-node/ss-datatag';
import { ReportModule, ReportService } from '@ss-node/ss-report';
import { ScriptModule, ScriptService } from '@ss-node/ss-script';
import { DataSourceModule, DbConnectionService } from '@ss-node/ss-datasource';
import { DataExportModule, DataExportService } from './export/data-export.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CollectorModule } from './collector/collector.module';
import { I18nModule, ResponseI18nInterceptor, I18nMiddleware } from '@ss-node/ss-i18n';
import { VersionController } from './version/version.controller';
import { VersionMiddleware } from './version/version.middleware';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * 产品模式类型
 * - full:  集成部署（ss-scada + ss-data 全部能力）
 * - scada: ss-scada 独立部署（仅组态编辑/运行）
 * - data:  ss-data 独立部署（仅数据中台/系统管理）
 */
export type ProductMode = 'full' | 'scada' | 'data';

/**
 * 获取当前产品模式
 * 通过环境变量 APP_PRODUCT_MODE 控制，默认为 full（兼容现状）
 */
export function getProductMode(): ProductMode {
  const mode = (process.env.APP_PRODUCT_MODE || 'full').toLowerCase();
  if (mode === 'scada' || mode === 'data') {
    return mode;
  }
  return 'full';
}

/**
 * 初始化项目根目录并设置到全局环境变量 SS_NODE_ROOT
 *
 * 项目根定义：
 * - dev 模式：ss-services/ss-node/（.env.base / .env.dev 相对路径基准）
 * - prod 模式：ss-run/ss/services/ss-node/（.env 相对路径基准）
 *
 * 本文件位于 apps/ss-node-server/src/（或 dist/），3 级上溯到 ss-services/ss-node/ 稳定不变。
 * 设置到 process.env.SS_NODE_ROOT 后，packages 下所有服务可通过 PathResolverService
 * 获取项目根，无需再依赖 __dirname 上溯。
 *
 * 必须在 ConfigModule.forRoot() 之前调用，确保 env 文件加载时 SS_NODE_ROOT 已可用。
 */
function initProjectRoot(): string {
  if (process.env.SS_NODE_ROOT) return process.env.SS_NODE_ROOT;

  const projectRoot =
    process.env.NODE_ENV === 'production'
      ? process.cwd()
      : path.resolve(__dirname, '..', '..', '..');
  process.env.SS_NODE_ROOT = projectRoot;
  return projectRoot;
}

// 模块加载时立即初始化（在 ConfigModule.forRoot 之前）
const SS_NODE_ROOT = initProjectRoot();

function getDatabaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const dbType = configService.get<string>('DB_TYPE') || 'sqlite';

  if (dbType === 'mysql') {
    return {
      type: 'mysql',
      host: configService.get<string>('DATABASE_HOST') || 'localhost',
      port: configService.get<number>('DATABASE_PORT') || 3306,
      username: configService.get<string>('DATABASE_USER') || 'root',
      password: configService.get<string>('DATABASE_PASSWORD') || '',
      database: configService.get<string>('DATABASE_NAME') || 'smart_scada',
      charset: 'utf8mb4',
      autoLoadEntities: true,
      synchronize: false,
      logging: false,
    };
  }

  const dbPath = configService.get<string>('DATABASE_PATH') || './data/ss-node.db';
  // 使用 initProjectRoot() 设置的 SS_NODE_ROOT 作为路径解析基准，
  // 与 packages 下各服务的 PathResolverService 保持一致。
  // - dev 模式：SS_NODE_ROOT = ss-services/ss-node/
  // - prod 模式：SS_NODE_ROOT = ss-run/ss/services/ss-node/
  const absoluteDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(SS_NODE_ROOT, dbPath);

  // CODE-08: 生产环境关闭 synchronize，避免每次启动自动改表结构带来的数据风险与启动开销
  // （开发环境保留 true 便于实体变更快速生效；生产应走 migration）
  const isProduction = process.env.NODE_ENV === 'production';
  // CODE-06: SQLite PRAGMA 通过 extra.pragma 配置，作用于连接池中所有连接
  // （原 main.ts 用 ds.query('PRAGMA ...') 仅作用于单个连接，cache_size 优化实测未生效）
  // cache_size=-16000 ≈ 16MB，在 1.8G 小内存机器上较 64MB 更合适
  const sqlitePragma = [
    'journal_mode=WAL',
    'synchronous=NORMAL',
    'cache_size=-16000',
    'temp_store=MEMORY',
  ];

  return {
    type: 'sqlite',
    database: absoluteDbPath,
    autoLoadEntities: true,
    synchronize: !isProduction,
    logging: false,
    extra: {
      busyTimeout: 10000,
      // CODE-06: sqlite3 驱动支持 pragma 数组，对连接池内每个新连接自动执行
      pragma: sqlitePragma,
    },
  };
}

/**
 * 构建 env 文件加载路径
 * 优先级（生产部署）：process.cwd()/.env（单一文件，含全部配置）
 * 优先级（开发环境）：.env.local（本地覆盖，不入库） → .env.{productMode} → .env.base
 * 兼容：如未配置 APP_PRODUCT_MODE，回退到 .env.{APP_ENV|dev} + .env.base
 *
 * .env.local 用途：存放本地机密凭证（如微信小程序 APPID/SECRET），
 * 已被 .gitignore 覆盖（.env.local 规则），优先级最高（dotenv 数组首个文件胜出）。
 */
function buildEnvFilePaths(): string[] {
  // 生产部署：.env 文件位于服务目录（process.cwd()），由 publish-node.bat 生成
  if (process.env.NODE_ENV === 'production') {
    const cwdEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(cwdEnv)) {
      return [cwdEnv];
    }
  }

  // 使用 initProjectRoot() 设置的 SS_NODE_ROOT（dev 模式 = ss-services/ss-node/）
  const projectRoot = SS_NODE_ROOT;
  const productMode = getProductMode();

  // .env.local 本地覆盖文件（存在才加载，凭证不入库）
  const localEnv = path.resolve(projectRoot, '.env.local');
  const localEnvPaths = fs.existsSync(localEnv) ? [localEnv] : [];

  // 配置了产品模式：加载 .env.local + .env.{mode} + .env.base
  if (process.env.APP_PRODUCT_MODE) {
    return [
      ...localEnvPaths,
      path.resolve(projectRoot, `.env.${productMode}`),
      path.resolve(projectRoot, '.env.base'),
    ];
  }

  // 未配置产品模式：加载 .env.local + .env.{APP_ENV|dev} + .env.base
  return [
    ...localEnvPaths,
    path.resolve(projectRoot, `.env.${process.env.APP_ENV || 'dev'}`),
    path.resolve(projectRoot, '.env.base'),
  ];
}

// 产品模式（模块加载时计算一次）
const PRODUCT_MODE = getProductMode();

// 启动日志：明确标注当前产品模式
if (require.main === module || process.env.NODE_ENV !== 'test') {
  // 仅在应用主进程启动时打印，避免测试环境噪音
  try {
    // eslint-disable-next-line no-console
    console.log(`\n[SS-Platform] Product Mode: ${PRODUCT_MODE}\n`);
  } catch {
    // 忽略日志错误
  }
}

/**
 * 共享模块（所有产品模式均注册）
 * 包含：配置、数据库、认证、用户、项目、WebSocket、i18n、EventBus、缓存、健康检查
 */
const sharedModules: any[] = [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: buildEnvFilePaths(),
    expandVariables: true,
  }),
  // CODE-11: Throttler 配置改为读取环境变量，与 .env 中 RATE_LIMIT_MAX / RATE_LIMIT_TTL_MS 对齐
  // 默认 ttl=60s / limit=100（保守值），生产可通过 .env 放宽（如 RATE_LIMIT_MAX=6000）
  ThrottlerModule.forRoot([
    {
      ttl: Number(process.env.RATE_LIMIT_TTL_MS) || 60000,
      limit: Number(process.env.RATE_LIMIT_MAX) || 100,
    },
  ]),
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    inject: [ConfigService],
  }),
  I18nModule.forRoot({
    fallbackLanguage: 'zh-CN',
    // 使用 initProjectRoot() 设置的 SS_NODE_ROOT 作为路径解析基准
    // dev 模式：SS_NODE_ROOT = ss-services/ss-node/ → packages/ss-sdk/src/i18n/
    // prod 模式：SS_NODE_ROOT = ss-run/ss/services/ss-node/ → cwd/i18n/
    loaderPath:
      process.env.NODE_ENV === 'production'
        ? path.resolve(SS_NODE_ROOT, 'i18n')
        : path.resolve(SS_NODE_ROOT, 'packages', 'ss-sdk', 'src', 'i18n'),
  }),
  EventBusModule,
  DatabaseModule,
  PathModule,
  CacheModule,
  HealthModule,
  ConnectionModule,
  // S-M02: 审计日志独立通道（全局模块，需在 AuthModule 之前注册）
  AuditLoggerModule,
  AuthModule,
  // WechatAuthModule 移出 sharedModules，改为条件注册（见下方 WECHAT_LOGIN_ENABLED）
  // 订阅消息模块（@Global）：提供小程序订阅消息通道与偏好接口，供报警分发器 @Optional 注入
  WechatSubscribeMessageModule,
  UserModule,
  ProjectModule,
  WebSocketModule,
  RedisModule,
  SystemEventModule,
  EventLogModule,
];

/**
 * ss-scada 专有模块（full + scada 模式注册）
 * 包含：图元插件存储
 */
const scadaModules: any[] = [DiscoveryModule, PluginModule.forRoot({ autoDiscover: true })];

/**
 * ss-data 专有模块（full + data 模式注册）
 * 包含：设备、报警、采集、存储、协议、系统管理、数据标签、报表、脚本、数据源、AI
 *
 * CODE-07: AiModule 按 AI_ENABLED 条件导入。
 * 关闭 AI（AI_ENABLED !== 'true'）时不加载 AiModule，节省内存与启动时间；
 * 同步地，BACKEND_TOOLS_INIT provider 也会被门控（避免注入未提供的 AgentOrchestratorService）。
 */
const AI_ENABLED = process.env.AI_ENABLED === 'true';
// 微信扫码登录功能总开关：关闭时不注册 WechatAuthModule，前端通过 /auth/features 接口获取状态
const WECHAT_LOGIN_ENABLED = process.env.WECHAT_LOGIN_ENABLED === 'true';

const dataModules: any[] = [
  DeviceStateModule,
  MetricsModule,
  DeviceModule,
  AlarmModule,
  DataModule,
  // 时序存储适配层：InfluxDB 3 Core / TDengine 适配器注册（按 STORAGE_DEFAULT_ENGINE / 项目级覆盖路由）
  Influxdb3StorageModule,
  TdengineStorageModule,
  PipelineModule,
  CollectorModule,
  DiagnosticsModule,
  ModbusCollectorModule,
  S7CollectorModule,
  VirtualCollectorModule,
  MqttCollectorModule,
  OpcUaCollectorModule,
  SystemModule,
  DatatagModule,
  ReportModule,
  ScriptModule,
  DataSourceModule,
  DataExportModule,
  DashboardModule,
  // CODE-07: AiModule 仅在 AI_ENABLED=true 时加载
  ...(AI_ENABLED ? [AiModule] : []),
];

@Module({
  imports: [
    ...sharedModules,
    // 微信扫码登录模块仅在 WECHAT_LOGIN_ENABLED=true 时注册
    // 关闭时 WechatAuthController 不存在，/auth/wechat/* 端点返回 404
    ...(WECHAT_LOGIN_ENABLED ? [WechatAuthModule] : []),
    // scada 模式：加载共享 + scada 专有模块
    // full 模式：加载共享 + scada + data 全部模块
    ...(PRODUCT_MODE !== 'data' ? scadaModules : []),
    // data 模式：加载共享 + data 专有模块
    // full 模式：加载共享 + scada + data 全部模块
    ...(PRODUCT_MODE !== 'scada' ? dataModules : []),
  ],
  controllers: [VersionController],
  providers: [
    ...(PRODUCT_MODE !== 'data'
      ? [
          PluginExplorerService,
          {
            provide: PROVIDER_SCANNER,
            useFactory: (discoveryService: DiscoveryService) => ({
              getProviders: () => discoveryService.getProviders(),
            }),
            inject: [DiscoveryService],
          },
        ]
      : []),
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseI18nInterceptor,
    },
    // 操作日志拦截器：仅在 OPERATION_LOG_ENABLED !== 'false' 时注册
    ...(process.env.OPERATION_LOG_ENABLED !== 'false'
      ? [
          {
            provide: APP_INTERCEPTOR,
            useFactory: (operationLogRepo: any) => {
              const interceptor = new OperationLogInterceptor();
              interceptor.setRepository(operationLogRepo);
              return interceptor;
            },
            inject: [getRepositoryToken(OperationLog)],
          },
        ]
      : []),
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    // P2-T01: 注册后端 MCP 工具（替换 stub 为真实实现）
    // CODE-07: 仅在 AI_ENABLED=true 时注册 — 该工厂注入 AgentOrchestratorService（由 AiModule 提供），
    // 关闭 AI 时不加载 AiModule，此处也必须跳过，否则启动时依赖注入会失败。
    ...(AI_ENABLED
      ? [
          {
            provide: 'BACKEND_TOOLS_INIT',
            useFactory: (
              orchestrator: AgentOrchestratorService,
              deviceService: DeviceService,
              alarmService: AlarmService,
              alarmStatsService: AlarmStatisticsService,
              alarmSuppressionService: AlarmSuppressionService,
              dataQueryService: DataQueryService,
              knowledgeService: KnowledgeService,
        healthService: HealthService,
        deviceTemplateService: DeviceTemplateService,
        dictLoaderService: DictionaryLoaderService,
        dbConnectionService: DbConnectionService,
        projectService: ProjectService,
        reportService: ReportService,
        scriptService: ScriptService,
        datatagService: DataTagService,
        // 批次 E-I 新增服务
        userAdminService: UserAdminService,
        userService: UserService,
        roleService: RoleService,
        sessionService: SessionService,
        operationLogService: OperationLogService,
        menuConfigService: SystemMenuConfigService,
        deviceDiagnosticService: DeviceDiagnosticService,
        deviceDataService: DeviceDataService,
        pluginManagerService: PluginManagerService,
        pipelineMetricsService: PipelineMetricsService,
        offlineCacheService: OfflineCacheService,
        collectorDiagnosticsService: CollectorDiagnosticsService,
        baseServicesService: BaseServicesService,
        systemConfigService: SystemConfigService,
        systemRestartService: SystemRestartService,
        dataExportService: DataExportService,
        databaseService: DatabaseService,
        backupService: BackupService,
      ) => {
        const tools = createAllBackendTools({
          // 原有服务
          deviceService,
          alarmService: {
            getRecords: (projectId, limit) => alarmService.getRecords(projectId, limit),
            getRules: (projectId) => alarmService.findAllRules(projectId),
            createRule: (projectId, dto) => alarmService.createRule(projectId, dto as any),
            addSuppressionRule: (_projectId, dto) => {
              const id = (alarmSuppressionService as any).addRule({
                id: '',
                name: dto.type || 'suppression',
                type: dto.type as any,
                targetIds: [...(dto.childRuleIds || []), ...(dto.devices || [])],
                suppressAlarms: true,
                suppressNotifications: true,
                startTime: dto.duration ? new Date() : undefined,
                endTime: dto.duration
                  ? new Date(Date.now() + (dto.duration as number) * 1000)
                  : undefined,
              });
              return Promise.resolve({ id });
            },
          } as any,
          alarmStatisticsService: alarmStatsService,
          dataQueryService: {
            queryTimeRange: (query) => dataQueryService.queryTimeRange(query),
            aggregate: (tagId, startTime, endTime, type) =>
              dataQueryService.aggregate(tagId, startTime, endTime, type as any),
            getTagStats: (tagId, startTime, endTime) =>
              dataQueryService.getTagStats(tagId, startTime, endTime),
            queryTrend: (params) =>
              dataQueryService.queryTrendData({
                tagIds: params.tagIds,
                startTime: new Date(params.startTime),
                endTime: new Date(params.endTime),
                maxPoints: params.maxPoints,
                projectId: params.projectId,
                interpolation: params.interpolation as any,
                interval: params.interval,
              }),
            exportTrend: async (tagIds, startTime, endTime, projectId, format) => {
              const fmt = (format || 'csv').toLowerCase();
              if (fmt === 'json' && tagIds.length > 1) {
                const result = await (dataQueryService as any).exportBatchJson(
                  tagIds,
                  new Date(startTime),
                  new Date(endTime),
                  projectId,
                );
                const filePath = path.join(os.tmpdir(), result.filename);
                fs.writeFileSync(filePath, result.json, 'utf-8');
                return { filePath, fileName: result.filename };
              }
              if (fmt === 'json') {
                const result = await dataQueryService.exportJson(
                  tagIds[0],
                  new Date(startTime),
                  new Date(endTime),
                  projectId,
                );
                const filePath = path.join(os.tmpdir(), result.filename);
                fs.writeFileSync(filePath, result.json, 'utf-8');
                return { filePath, fileName: result.filename };
              }
              // csv (default) - single tag
              const result = await dataQueryService.exportCsv(
                tagIds[0],
                new Date(startTime),
                new Date(endTime),
                projectId,
              );
              const filePath = path.join(os.tmpdir(), result.filename);
              fs.writeFileSync(filePath, result.csv, 'utf-8');
              return { filePath, fileName: result.filename };
            },
          } as any,
          knowledgeService,
          healthService,
          templateService: deviceTemplateService as any,
          deviceCreateService: {
            createDevice: (dto, projectId) => deviceService.create(dto as any, projectId),
          },
          dictService: dictLoaderService as any,
          // 新增服务
          dbConnectionService: {
            findAll: (projectId) => dbConnectionService.findAll(projectId),
            create: (projectId, dto) => dbConnectionService.create(projectId, dto as any),
            test: (projectId, id) => dbConnectionService.test(projectId, id),
            getTables: (projectId, id) => dbConnectionService.getTables(projectId, id),
            getColumns: (projectId, id, tableName) =>
              dbConnectionService.getColumns(projectId, id, tableName),
            executeQuery: (projectId, id, sql) =>
              dbConnectionService.executeQuery(projectId, id, sql),
          },
          projectService: {
            findAll: (userId, query) => projectService.findAll(userId, query as any),
            findOne: (id, userId) => projectService.findOne(id, userId),
            exportProjectZip: (projectId, userId, opts) =>
              projectService.exportProjectZip(projectId, userId, opts),
            importProjectZip: (filePath, userId, overwrite) =>
              projectService
                .importProjectZip(fs.readFileSync(filePath), userId, { overwrite })
                .then((r) => ({
                  data: { projectId: r.project.projectId, projectName: r.project.projectName },
                  warnings: r.warnings,
                })),
            getManageInfo: (projectId) => projectService.getManageInfo(projectId),
            diagnose: (projectId) =>
              projectService.diagnoseProject(projectId).then((r) => ({
                health: r.health,
                resources: r.resources as Record<string, string>,
                issues: r.issues,
              })),
            initResources: (projectId, resources) =>
              projectService.initProjectResources(projectId, resources).then((r) => ({
                health: r.initialized.length > 0 ? 'healthy' : 'degraded',
                resources: {} as Record<string, string>,
                issues: r.warnings,
                initialized: r.initialized,
                skipped: r.skipped,
              })),
          },
          reportService: {
            generateDailyReport: (projectId, date) =>
              reportService.generateDailyReport(projectId, date),
            generateMonthlyReport: (projectId, month) =>
              reportService.generateMonthlyReport(projectId, month),
            generateCustomReport: (projectId, config) =>
              reportService.generateCustomReport(projectId, config as any),
            generateAlarmReport: (projectId, config) =>
              reportService.generateAlarmReport(projectId, config as any),
            generateTrendReport: (projectId, config) =>
              reportService.generateTrendReport(projectId, config as any),
            exportReport: (reportId, format) => reportService.exportReport(reportId, format as any),
            queryReports: (projectId, query) => reportService.queryReports(projectId, query as any),
            saveReportConfig: (projectId, config) =>
              reportService.saveReportConfig(projectId, config as any),
            getSchedules: (projectId) => reportService.getScheduledExports(projectId),
            createSchedule: (projectId, schedule) =>
              reportService.scheduleReportExport(projectId, {
                templateId: schedule.templateId,
                cronExpression: schedule.cronExpression,
                exportFormat: schedule.exportFormat as any,
                enabled: schedule.enabled,
              }),
          },
          datatagService: {
            findAll: (projectId, query) => datatagService.findAll(projectId, query as any),
            update: (id, dto) => datatagService.update(id, dto as any),
            batchUpdate: (ids, dto) => datatagService.batchUpdate(ids, dto),
          },
          scriptService: {
            getApiFunctions: () => scriptService.getApiFunctions(),
            create: (dto) => scriptService.create(dto as any),
            executeScript: (id, projectId) => scriptService.executeScript(id, projectId) as any,
          },
          // ──────────── 批次 E: 报警处理与运维 (7 工具) ────────────
          alarmOpsService: {
            acknowledge: (recordId, userId, projectId) =>
              alarmService.acknowledgeAlarm(recordId, userId, projectId),
            batchAcknowledge: (ids, userId, projectId) =>
              alarmService.batchAcknowledge(ids, userId, projectId),
            clear: (recordId, userId, projectId) =>
              alarmService.clearAlarm(recordId, userId, projectId),
            shelve: (recordId, duration, userId, projectId) =>
              (alarmService as any).shelveAlarm(recordId, userId, String(duration), projectId),
            getStatistics: (projectId) => alarmStatsService.getStatistics(projectId),
            toggleRule: (ruleId, enabled, projectId) =>
              enabled
                ? alarmService.enableRule(ruleId, projectId)
                : alarmService.disableRule(ruleId, projectId),
            getSuppressionRules: (_projectId) =>
              Promise.resolve((alarmSuppressionService as any).getRules?.() ?? []),
          },
          // ──────────── 批次 F: 设备运维管理 (6 工具) ────────────
          deviceOpsService: {
            update: (id, dto, projectId) => deviceService.update(id, dto as any, projectId),
            remove: (id, projectId) => deviceService.remove(id, projectId),
            moveDevice: (id, targetGroupId, projectId) =>
              deviceService.moveDevice(id, targetGroupId, projectId),
            writeTagValue: (deviceId, tagId, value, projectId) =>
              deviceDataService.updateLatestValue(tagId, deviceId, value, 'good', projectId),
          },
          deviceGroupService: {
            getGroups: (projectId) => deviceService.findAllGroups(projectId),
            getGroupTree: (projectId) => deviceService.getGroupTree(projectId),
            createGroup: (projectId, dto) => deviceService.createGroup(projectId, dto as any),
            updateGroup: (projectId, groupId, dto) =>
              deviceService.updateGroup(projectId, groupId, dto as any),
            deleteGroup: (projectId, groupId) => deviceService.removeGroup(projectId, groupId),
          },
          deviceDiagnosticService: {
            ping: (deviceId, host, port) =>
              (deviceDiagnosticService as any).ping(deviceId, host, port),
            readTag: (deviceId, params) =>
              (deviceDiagnosticService as any).readTag({ deviceId, ...params }),
            writeTag: (deviceId, params) =>
              (deviceDiagnosticService as any).writeTag({ deviceId, ...params }),
            scanAddresses: (deviceId, params) =>
              (deviceDiagnosticService as any).scanAddresses({ deviceId, ...params }),
            runDiagnostic: (deviceId, action, params) =>
              (deviceDiagnosticService as any).runDiagnostic({ id: deviceId, ...params }, action),
          },
          // ──────────── 批次 G: 用户权限管理 (5 工具) ────────────
          userService: {
            findAll: (query) => userAdminService.listUsers(query as any),
            adminCreateUser: (dto) => userService.createUser(dto as any),
            adminUpdateUser: (id, dto) => userAdminService.updateUserRole(id, (dto as any).role),
            toggleUserStatus: (id, isActive) => userAdminService.toggleUserStatus(id, isActive),
            resetPassword: (id) => userAdminService.resetPassword(id),
            deleteUser: (id) => userAdminService.deleteUser(id),
            assignRole: (id, roleId) => userAdminService.updateUserRole(id, roleId as any),
          },
          roleService: {
            findAll: () => roleService.findAll(),
            findById: (id) => roleService.findById(id),
            create: (dto) => roleService.create(dto as any),
            update: (id, dto) => roleService.update(id, dto as any),
            delete: (id) => roleService.delete(id),
            getProjectAuths: (roleId) => (roleService as any).getPermissions(roleId),
            setProjectAuths: (roleId, auths) =>
              (roleService as any).setPermissions
                ? (roleService as any).setPermissions(roleId, auths)
                : Promise.reject(new Error('当前版本暂不支持设置项目权限')),
            getDeviceAuths: (roleId, projectId) =>
              (roleService as any).getDevicePermissions
                ? (roleService as any).getDevicePermissions(roleId, projectId)
                : Promise.resolve([]),
            setDeviceAuths: (roleId, projectId, auths) =>
              (roleService as any).setDevicePermissions
                ? (roleService as any).setDevicePermissions(roleId, projectId, auths)
                : Promise.reject(new Error('当前版本暂不支持设置设备权限')),
          },
          sessionService: {
            getUserSessions: (userId) => sessionService.getUserSessions(userId),
            forceLogout: (sessionId) => sessionService.forceLogout(sessionId),
            logoutAllExcept: (userId, currentSessionId) =>
              sessionService.logoutAllExcept(userId, currentSessionId),
            getLoginHistory: (userId) => sessionService.getLoginHistory(userId),
          },
          operationLogService: {
            query: (query) => operationLogService.query(query as any),
            getStats: () => operationLogService.getStats(),
            cleanupExpired: () => operationLogService.cleanupExpired(),
          },
          menuService: {
            getMenu: (subsystem) => menuConfigService.getMenu(subsystem),
            createMenuItem: (item, parentId) =>
              menuConfigService.createMenuItem(item, parentId ?? null),
            updateMenuItem: (id, item, parentId) =>
              menuConfigService.updateMenuItem(id, item, parentId),
            deleteMenuItem: (id) => menuConfigService.deleteMenuItem(id),
            getMenuButtons: () => menuConfigService.getMenuButtons(),
            updateMenuButtons: (buttons) => menuConfigService.updateMenuButtons(buttons),
          },
          // ──────────── 批次 H: 采集器与服务运维 (7 工具) ────────────
          pluginManagerService: {
            listPlugins: (query) =>
              (pluginManagerService as any).listPluginsWithRuntime(query as any),
            activate: (protocol) => pluginManagerService.activate(protocol),
            deactivate: (protocol) => pluginManagerService.deactivate(protocol),
            getPluginStatus: (protocol) =>
              (pluginManagerService as any).getPluginStatus
                ? (pluginManagerService as any).getPluginStatus(protocol)
                : (pluginManagerService as any).listPluginsWithRuntime({ protocol }),
            healthCheck: () => pluginManagerService.healthCheck(),
            hotReload: (protocol) => pluginManagerService.hotReload(protocol),
            rollback: (protocol) => pluginManagerService.rollback(protocol),
            getMonitorData: (protocol) => pluginManagerService.getMonitorData(protocol),
            validateChannelConfig: (protocol, config) =>
              pluginManagerService.validateChannelConfig(protocol, config),
            getPluginConfig: (protocol) =>
              (pluginManagerService as any).getPluginConfig
                ? (pluginManagerService as any).getPluginConfig(protocol)
                : Promise.resolve(null),
            updatePluginConfig: (protocol, config) =>
              pluginManagerService.updatePluginConfig(protocol, config as any),
          },
          pipelineDiagService: {
            getMetricsSnapshot: () => pipelineMetricsService.getMetricsSnapshot(),
            getStepTimingStats: () =>
              (pipelineMetricsService as any).getStepTimingStats
                ? (pipelineMetricsService as any).getStepTimingStats()
                : (pipelineMetricsService as any).getTimingStats
                  ? (pipelineMetricsService as any).getTimingStats()
                  : {},
            getTimingBreakdowns: (limit) =>
              (pipelineMetricsService as any).getTimingBreakdowns
                ? (pipelineMetricsService as any).getTimingBreakdowns(limit)
                : (pipelineMetricsService as any).getBreakdowns
                  ? (pipelineMetricsService as any).getBreakdowns(limit)
                  : [],
            getDiagnosticInfo: () =>
              (pipelineMetricsService as any).getDiagnosticInfo
                ? (pipelineMetricsService as any).getDiagnosticInfo()
                : (pipelineMetricsService as any).getDiagnosticInfo
                  ? (pipelineMetricsService as any).getDiagnosticInfo()
                  : {},
          },
          offlineCacheService: {
            getBufferStats: () => offlineCacheService.getBufferStats(),
            flush: (maxBatch) => offlineCacheService.flush(maxBatch),
            clear: () => offlineCacheService.clear(),
          },
          collectorDiagService: {
            runFullDiagnosis: (deviceId) => collectorDiagnosticsService.runFullDiagnosis(deviceId),
            checkTagReadability: (tagId) => collectorDiagnosticsService.checkTagReadability(tagId),
            checkPluginHealth: (protocol) =>
              collectorDiagnosticsService.checkPluginHealth(protocol),
          },
          baseServicesService: {
            getAllStatus: () => baseServicesService.getAllStatus(),
            getStatus: (name) => baseServicesService.getStatus(name),
            start: (name) => baseServicesService.start(name),
            stop: (name) => baseServicesService.stop(name),
            restart: (name) => baseServicesService.restart(name),
            getLogs: (name, limit) => baseServicesService.getLogs(name, limit),
          },
          influxAdminService: {
            checkSetupStatus: () => (baseServicesService as any).checkInfluxSetupStatus(),
            checkHealth: () => (baseServicesService as any).checkInfluxHealth(),
            getConfig: () => (baseServicesService as any).getInfluxConfig(),
            listBuckets: () => (baseServicesService as any).listInfluxBuckets(),
            setup: (options) => (baseServicesService as any).setupInfluxDB(options),
          },
          systemConfigService: {
            getAllWithMeta: () => systemConfigService.getAllWithMeta(),
            get: (key) => systemConfigService.get(key),
            setWithMeta: (key, value, options) =>
              systemConfigService.setWithMeta(key, value, options as any),
            getRestartRequired: () => systemConfigService.getRestartRequired(),
            triggerRestart: (username) => systemRestartService.triggerRestart(username),
            getRestartStatus: () => systemRestartService.getRestartStatus(),
          },
          // ──────────── 批次 I: 数据治理与备份 (5 工具) ────────────
          dataExportService: {
            exportCsv: (tagId, startTime, endTime) =>
              (dataExportService as any).exportCsv?.(tagId, startTime, endTime) ??
              (dataExportService as any).exportCSV({ tagId, startTime, endTime }),
            exportJson: (tagId, startTime, endTime) =>
              (dataExportService as any).exportJson?.(tagId, startTime, endTime) ??
              Promise.reject(new Error('当前版本暂不支持 JSON 导出')),
            exportBatchJson: (tagIds, startTime, endTime, projectId) =>
              (dataExportService as any).exportBatchJson?.(tagIds, startTime, endTime, projectId) ??
              Promise.reject(new Error('当前版本暂不支持批量 JSON 导出')),
            exportToResult: (filters) => (dataExportService as any).exportToResult(filters),
          },
          databaseService: {
            getAllDatabasesStatus: () => databaseService.getAllDatabasesStatus(),
            checkSystemIntegrity: () => databaseService.checkSystemIntegrity(),
            checkProjectIntegrity: (projectName) =>
              databaseService.checkProjectIntegrity(projectName),
            vacuumSystem: () => databaseService.vacuumSystem(),
            vacuumProject: (projectName) => databaseService.vacuumProject(projectName),
          },
          backupService: {
            listBackups: (dbType) => backupService.listBackups(dbType),
            getBackupStats: () => backupService.getBackupStats(),
            getBackupLogs: (query) => backupService.getBackupLogs(query as any),
            createSystemBackup: (backupType, operator) =>
              backupService.createSystemBackup(backupType, operator),
            createProjectBackup: (projectName, backupType, operator) =>
              backupService.createProjectBackup(projectName, backupType, operator),
            deleteBackup: (filename) => backupService.deleteBackup(filename),
            restoreBackup: (filename) => backupService.restoreBackup(filename),
            restoreProjectBackup: (filename, projectName) =>
              backupService.restoreProjectBackup(filename, projectName),
            cleanupExpired: (dbType, days) => backupService.cleanupExpired(dbType, days),
            getBackupConfig: () => backupService.getBackupConfig(),
            saveBackupConfig: (config) => backupService.saveBackupConfig(config),
          },
        } as any);
        orchestrator.injectBackendTools(tools);
        Logger.log(
          `P2-T01: 已注册 ${tools.length} 个后端 MCP 工具（数据查询/设备/报警/知识库/健康检查/模板/设备创建/字典/外部数据库/项目管理/趋势/诊断/报表/标签/脚本/报警处理/设备运维/用户权限/采集器运维/数据治理与备份）`,
          'BackendTools',
        );
      },
      inject: [
        AgentOrchestratorService,
        DeviceService,
        AlarmService,
        AlarmStatisticsService,
        AlarmSuppressionService,
        DataQueryService,
        KnowledgeService,
        HealthService,
        DeviceTemplateService,
        DictionaryLoaderService,
        DbConnectionService,
        ProjectService,
        ReportService,
        ScriptService,
        DataTagService,
        // 批次 E-I 新增服务
        UserAdminService,
        UserService,
        RoleService,
        SessionService,
        OperationLogService,
        SystemMenuConfigService,
        DeviceDiagnosticService,
        DeviceDataService,
        PluginManagerService,
        PipelineMetricsService,
        OfflineCacheService,
        CollectorDiagnosticsService,
        BaseServicesService,
        SystemConfigService,
        SystemRestartService,
        DataExportService,
        DatabaseService,
        BackupService,
      ],
    },
        ]
      : []),
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger('AppModule');

  // CODE-07: BACKEND_TOOLS_INIT 现为条件 provider（仅 AI_ENABLED=true 时注册），
  // 故注入需标记 @Optional()，避免关闭 AI 时启动报错（NestFactory 会对缺失的非可选依赖抛异常）
  constructor(@Optional() @Inject('BACKEND_TOOLS_INIT') _toolsInit: void) {
    this.logger.log(`Product Mode: ${PRODUCT_MODE}`);
    this.logger.log(
      `Modules loaded: shared(13) + ${
        PRODUCT_MODE !== 'data' ? 'scada(1)' : 'scada(0)'
      } + ${PRODUCT_MODE !== 'scada' ? `data(${dataModules.length})` : 'data(0)'}`,
    );
    this.logger.log(
      `Operation Log: ${process.env.OPERATION_LOG_ENABLED !== 'false' ? 'enabled' : 'disabled'}`,
    );
    this.logger.log(`AI Module: ${AI_ENABLED ? 'enabled' : 'disabled'}`);
    this.logger.log(`Wechat Login: ${WECHAT_LOGIN_ENABLED ? 'enabled' : 'disabled'}`);
  }

  onModuleInit() {
    // 基础服务（共享模块 + 业务模块）初始化完成
    // 使用 console.log 与 main.ts 启动阶段日志保持一致
    console.log(`[Startup] ✅ 基础服务（共享模块/业务模块）初始化完成`);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, VersionMiddleware, I18nMiddleware).forRoutes('*');
  }
}
