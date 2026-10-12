// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { EventBusService } from '../event-bus/event-bus.service';
import { PathResolverService } from '../path/path-resolver.service';
import { EventLogService } from '../event-log/event-log.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sqlite3 = require('sqlite3');

/** SQL 初始化脚本文件名 */
const INIT_SCRIPT = 'init-system-db.sql';

/**
 * 连接池配置
 */
export interface PoolConfig {
  /** 最大连接数，默认 10 */
  maxConnections: number;
  /** 空闲连接超时时间（ms），默认 30000 */
  idleTimeoutMs: number;
  /** 连接健康检查间隔（ms），默认 60000 */
  healthCheckIntervalMs: number;
  /** 获取连接超时时间（ms），默认 5000 */
  acquireTimeoutMs: number;
}

/**
 * 连接池统计信息
 */
export interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalCreated: number;
  totalDestroyed: number;
  acquireFailures: number;
  healthCheckFailures: number;
  lastHealthCheck: Date | null;
}

/** 默认连接池配置 */
const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: 10,
  idleTimeoutMs: 30000,
  healthCheckIntervalMs: 60000,
  acquireTimeoutMs: 5000,
};

/** SQLite 忙等待超时（ms），防止并发访问时 SQLITE_BUSY 导致死锁 */
const BUSY_TIMEOUT = 10000;

/**
 * 项目数据库模式
 * - isolated: 每个项目拥有独立的 system.db（默认）
 * - unified: 所有项目共用全局 ss-data.db
 */
export type ProjectDbMode = 'unified' | 'isolated';

/**
 * 项目数据库连接信息
 */
export interface ProjectDbConnection {
  /** 系统配置数据库（设备、标签、报警规则、脚本、告警记录等） */
  system: DataSource;
}

/**
 * 项目级数据库连接管理服务（全局单例）
 *
 * 职责：
 * 1. 管理按项目隔离的 TypeORM DataSource 实例（system.db）
 * 2. 提供懒加载能力：首次访问时自动创建连接
 * 3. 支持实体类动态注册：各业务包（ss-device 等）在启动时注册自己的实体类
 * 4. 监听 project.beforeDelete 事件，自动关闭对应连接
 * 5. 提供连接池配置、统计、健康检查
 *
 * 使用方式：
 * - ss-device 在 DeviceModule.onModuleInit() 中调用 registerSystemEntities([Device, ...])
 * - ss-project 在创建项目时调用 initProjectDatabases(tid)
 * - 业务代码调用 getSystemDb(projectId) 获取 DataSource（自动懒加载）
 */
@Injectable()
export class ProjectDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectDatabaseService.name);

  /** 项目名 → 数据库连接池映射 */
  private readonly connections = new Map<string, ProjectDbConnection>();

  /** 正在加载中的项目连接 Promise（防并发重复初始化） */
  private readonly pendingLoads = new Map<string, Promise<ProjectDbConnection>>();

  /** 已注册的实体类 */
  private registeredEntities: any[] = [];

  /** 连接池配置 */
  private poolConfig: PoolConfig;

  /** 连接池统计 */
  private poolStats: PoolStats = {
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    acquireFailures: 0,
    healthCheckFailures: 0,
    lastHealthCheck: null,
  };

  /** 健康检查定时器 */
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly pathResolver: PathResolverService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {
    this.poolConfig = this.loadPoolConfig();
  }

  // ============================================================
  // 生命周期
  // ============================================================

  onModuleInit(): void {
    // wrap helper：通过 EventLogService.wrapSubscriber 自动追踪处理结果和业务效果
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(eventType, 'ProjectDatabaseService', handler)
        : async (...args: T) => { await handler(...args); };
      return async (...args: T) => {
        try { await traced(...args); }
        catch (err) { this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`); }
      };
    };

    // 监听项目删除事件，提前关闭该项目的 DataSource
    // 防止项目目录被删除时 SQLite 文件仍被占用（EBUSY/EPERM）
    this.eventBus.on(
      'project.beforeDelete',
      wrap('project.beforeDelete', async (payload: { projectId: string; tenantId?: string }) => {
        const projectId = payload?.projectId || payload?.tenantId;
        if (projectId) {
          this.logger.log(
            `[Event] project.beforeDelete received for "${projectId}", closing DataSource`,
          );
          await this.unloadProjectDatabases(projectId);
          return { dataSourceClosed: true, projectId };
        }
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.stopHealthCheck();
    const projectNames = Array.from(this.connections.keys());
    await Promise.all(projectNames.map((name) => this.unloadProjectDatabases(name)));
    this.logger.log('All project databases unloaded');
  }

  // ============================================================
  // 实体类注册
  // ============================================================

  /**
   * 注册 system.db 实体类
   *
   * 各业务包（如 ss-device）在模块初始化时调用此方法注册自己的实体类。
   * 注册的实体类将用于：
   * - initProjectDatabases() 时的 TypeORM synchronize 建表
   * - loadProjectDatabases() 时的 DataSource 创建
   * - getSystemDb() 懒加载时的自动创建
   *
   * @param entities 实体类数组
   */
  registerSystemEntities(entities: any[]): void {
    for (const entity of entities) {
      if (!this.registeredEntities.includes(entity)) {
        this.registeredEntities.push(entity);
      }
    }
    this.logger.log(
      `Registered ${entities.length} entities (total: ${this.registeredEntities.length})`,
    );
  }

  // ============================================================
  // 模式与路径
  // ============================================================

  /**
   * 获取当前数据库模式
   * 默认 isolated（每个项目独立数据库），可通过 PROJECT_DB_MODE=unified 回退到共用全局库
   */
  getMode(): ProjectDbMode {
    const mode = this.configService.get<string>('PROJECT_DB_MODE') || 'isolated';
    if (mode !== 'isolated' && mode !== 'unified') {
      this.logger.warn(`Unknown PROJECT_DB_MODE="${mode}", fallback to "isolated"`);
      return 'isolated';
    }
    return mode;
  }

  /**
   * 获取项目数据库目录路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node
   *   （本文件编译后位于 packages/ss-core/dist/database/，4 级上溯：
   *    dist/database/ → dist/ → ss-core/ → packages/ → ss-node/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node（.env 中相对路径基准）
   *
   * 修复历史：
   * - v1.4 之前用 process.cwd()，dev 模式下 cwd = apps/ss-node-server，
   *   导致 .env.dev 中 ../../ss-run/ss/data/projects 被解析到错误路径。
   * - v1.5 之前用 3 级上溯，但本文件编译后位于 packages/ss-core/dist/database/，
   *   3 级上溯只能到 packages/（错误），导致 PROJECTS_DIR=../../ss-run/ss/data/projects
   *   被解析为 ss-services/ss-run/ss/data/projects（多了一级 ss-services），
   *   在错误路径下创建空 system.db，正确路径下的真实 system.db 不被加载。
   * - 现在与 collector-bootstrap.service.ts resolveProjectsDir()（同样位于 dist/子目录/）
   *   保持一致，使用 4 级上溯。注意 project.service.ts 位于 packages/ss-project/dist/（无子目录），
   *   3 级上溯即可，两者层级不同，不可统一。
   */
  getProjectDbDir(projectId: string): string {
    const projectsDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    const absoluteProjectsDir = this.pathResolver.resolve(projectsDir);
    return path.join(absoluteProjectsDir, projectId, 'db');
  }

  /**
   * 获取 SQL 初始化脚本目录（绝对路径）
   *
   * 通过环境变量 PROJECT_DB_INIT_DIR 配置，默认 ./data/init。
   *
   * 相对路径基准：
   * - 生产部署下，服务从 `ss-run/ss/services/ss-node` 启动（process.cwd()），
   *   .env 中的 `PROJECT_DB_INIT_DIR=../../data/init` 即相对于该目录解析为
   *   `ss-run/ss/data/init`。
   * - 不能使用 `path.resolve(__dirname, '..', '..', '..', '..')` 作为基准，
   *   因为本文件编译后位于 `node_modules/@ss-node/ss-core/dist/database/`，
   *   向上 4 级得到 `node_modules/`，再解析 `../../data/init` 会得到
   *   `ss-run/ss/services/data/init`（错误路径，多了一级 services）。
   */
  private getInitDir(): string {
    const initDir = this.configService.get<string>('PROJECT_DB_INIT_DIR') || './data/init';
    return this.pathResolver.resolve(initDir);
  }

  // ============================================================
  // 初始化
  // ============================================================

  /**
   * 初始化项目的 system.db
   *
   * 实体类来源优先级：
   * 1. 显式传入的 entities 参数（向后兼容）
   * 2. 通过 registerSystemEntities() 注册的实体类
   *
   * 建表策略：
   * - 有实体：TypeORM DataSource + synchronize 自动建表
   * - 无实体：读取 SQL 脚本通过原生 sqlite3 执行初始化
   *
   * @param projectId    项目名称（tid）
   * @param entities       system.db 实体类数组（可选，默认使用已注册的）
   */
  async initProjectDatabases(projectId: string, entities?: any[]): Promise<void> {
    const sysEntities = entities ?? this.registeredEntities;

    const dbDir = this.getProjectDbDir(projectId);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 初始化 system.db
    const systemDbPath = path.join(dbDir, 'system.db');
    if (!fs.existsSync(systemDbPath)) {
      await this.initSingleDb(systemDbPath, INIT_SCRIPT, sysEntities, projectId);
    }
  }

  /**
   * 初始化单个数据库文件
   * - 有实体：TypeORM DataSource + synchronize 自动建表
   * - 无实体：读取 SQL 脚本通过原生 sqlite3 执行初始化
   */
  private async initSingleDb(
    dbPath: string,
    scriptName: string,
    entities: any[],
    projectId: string,
  ): Promise<void> {
    const hasEntities = entities && entities.length > 0;

    if (hasEntities) {
      // TypeORM 建表
      const ds = new DataSource({
        type: 'sqlite',
        database: dbPath,
        entities,
        synchronize: true,
        extra: { busyTimeout: BUSY_TIMEOUT },
      });
      await ds.initialize();
      await ds.destroy();
      this.logger.log(`[${projectId}] ${path.basename(dbPath)} initialized with TypeORM entities`);
    } else {
      // SQL 脚本初始化
      await this.executeInitScript(dbPath, scriptName);
      this.logger.log(
        `[${projectId}] ${path.basename(dbPath)} initialized via SQL script: ${scriptName}`,
      );
    }
  }

  /**
   * 读取 SQL 初始化脚本并通过原生 sqlite3 逐条执行
   */
  private executeInitScript(dbPath: string, scriptName: string): Promise<void> {
    const initDir = this.getInitDir();
    const scriptPath = path.join(initDir, scriptName);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(
        `SQL init script not found: ${scriptPath}. ` +
          `Check PROJECT_DB_INIT_DIR env (current: ${initDir})`,
      );
    }

    const sqlContent = fs.readFileSync(scriptPath, 'utf-8');
    this.logger.log(`Executing init script: ${scriptPath} (${sqlContent.length} bytes)`);

    const statements = this.splitSqlStatements(sqlContent);

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to create database ${dbPath}: ${err.message}`));
          return;
        }

        let idx = 0;
        let skippedGlobal = 0;
        const errors: string[] = [];

        const runNext = () => {
          if (idx >= statements.length) {
            db.close((closeErr) => {
              if (errors.length > 0) {
                reject(
                  new Error(
                    `SQL init script error (${scriptName}): ${errors.length} statement(s) failed. ` +
                      `First: ${errors[0]}`,
                  ),
                );
              } else if (closeErr) {
                reject(new Error(`Failed to close database ${dbPath}: ${closeErr.message}`));
              } else {
                if (skippedGlobal > 0) {
                  this.logger.warn(
                    `Init script ${scriptName}: ${skippedGlobal} global-table statement(s) skipped`,
                  );
                }
                this.logger.log(`SQL init script ${scriptName} executed successfully`);
                resolve();
              }
            });
            return;
          }

          const stmt = statements[idx];
          idx++;

          db.run(stmt, (runErr: Error | null) => {
            if (runErr) {
              const msg = runErr.message || String(runErr);
              if (msg.includes('no such table') && stmt.toLowerCase().includes('sys_menus')) {
                skippedGlobal++;
              } else {
                errors.push(`${msg} [SQL: ${stmt.substring(0, 100)}...]`);
              }
            }
            runNext();
          });
        };

        runNext();
      });
    });
  }

  /**
   * 将 SQL 脚本拆分为逐条语句
   */
  private splitSqlStatements(sql: string): string[] {
    const lines = sql.split('\n');
    const statements: string[] = [];
    let current = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      current += line + '\n';
      if (trimmed.endsWith(';')) {
        const stmt = current.trim();
        if (stmt) statements.push(stmt);
        current = '';
      }
    }
    if (current.trim()) {
      statements.push(current.trim());
    }
    return statements;
  }

  // ============================================================
  // 连接管理
  // ============================================================

  /**
   * 加载项目数据库连接（建立 DataSource）
   * 如果连接已存在则直接返回，否则创建新连接
   *
   * 实体类来源优先级：
   * 1. 显式传入的 entities 参数（向后兼容）
   * 2. 通过 registerSystemEntities() 注册的实体类
   *
   * @param projectId     项目名称
   * @param entities        system.db 实体类数组（可选）
   */
  async loadProjectDatabases(projectId: string, entities?: any[]): Promise<ProjectDbConnection> {
    // 已加载则直接返回
    const existing = this.connections.get(projectId);
    if (existing) {
      return existing;
    }

    // 并发初始化保护：同一项目正在加载中，等待已有 Promise
    const pending = this.pendingLoads.get(projectId);
    if (pending) {
      this.logger.debug(`[${projectId}] Waiting for in-progress database load...`);
      return pending;
    }

    const loadPromise = this.doLoadProjectDatabases(projectId, entities);
    this.pendingLoads.set(projectId, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.pendingLoads.delete(projectId);
    }
  }

  private async doLoadProjectDatabases(
    projectId: string,
    entities?: any[],
  ): Promise<ProjectDbConnection> {
    const sysEntities = entities ?? this.registeredEntities;

    const dbDir = this.getProjectDbDir(projectId);
    const systemDbPath = path.join(dbDir, 'system.db');

    // 如果文件不存在，先初始化
    if (!fs.existsSync(systemDbPath)) {
      await this.initProjectDatabases(projectId, sysEntities);
    }

    // 数据迁移：ProjectScopedEntity 引入后，已有记录的 projectId 可能为 NULL。
    // 必须在 TypeORM synchronize 之前执行，否则 synchronize 重建表时，
    // 临时表复制数据会遇到 NOT NULL constraint failed 错误。
    await this.migrateNullProjectIdsPreSync(systemDbPath, projectId);
    // 策略 B：重命名 dev_devices 列 tid→device_code / name→device_name
    // 必须在 TypeORM synchronize 之前执行，否则 synchronize 会删除旧列导致数据丢失
    await this.renameDeviceColumnsPreSync(systemDbPath, projectId);

    const systemDs = new DataSource({
      type: 'sqlite',
      database: systemDbPath,
      entities: sysEntities,
      synchronize: true,
      extra: {
        max: this.poolConfig.maxConnections,
        idleTimeoutMillis: this.poolConfig.idleTimeoutMs,
        acquireTimeoutMillis: this.poolConfig.acquireTimeoutMs,
        busyTimeout: BUSY_TIMEOUT,
      },
    });
    await systemDs.initialize();
    await this.enableWalMode(systemDs, systemDbPath, projectId);
    this.poolStats.totalCreated++;

    const connection: ProjectDbConnection = { system: systemDs };
    this.connections.set(projectId, connection);
    this.poolStats.activeConnections++;
    this.logger.log(`[${projectId}] system.db loaded`);
    return connection;
  }

  /**
   * 启用 SQLite WAL 模式 + 性能优化 PRAGMAs
   *
   * WAL（Write-Ahead Logging）模式允许读写并发：
   * - 读操作不阻塞写操作
   * - 写操作不阻塞读操作（大部分情况）
   * - 相比默认的 DELETE 模式，可消除绝大多数 SQLITE_BUSY 错误
   *
   * 性能 PRAGMAs：
   * - synchronous=NORMAL：降低 fsync 频率，提升写入吞吐
   * - cache_size=-64000：64MB 页面缓存
   * - temp_store=MEMORY：临时表/索引存内存
   */
  private async enableWalMode(ds: DataSource, dbPath: string, projectId: string): Promise<void> {
    try {
      await ds.query('PRAGMA journal_mode=WAL');
      await ds.query('PRAGMA synchronous=NORMAL');
      await ds.query('PRAGMA cache_size=-64000');
      await ds.query('PRAGMA temp_store=MEMORY');
      this.logger.log(`[${projectId}] system.db WAL mode enabled (synchronous=NORMAL, cache=64MB)`);
    } catch (err) {
      this.logger.warn(
        `[${projectId}] Failed to enable WAL for system.db: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 获取项目的 system.db DataSource（懒加载，自动创建）
   *
   * 如果连接不存在，会自动调用 loadProjectDatabases() 创建。
   * 使用已注册的实体类。
   *
   * @param projectId 项目名称
   * @returns system.db 的 DataSource
   */
  async getSystemDb(projectId: string): Promise<DataSource> {
    const existing = this.connections.get(projectId);
    if (existing) {
      return existing.system;
    }
    const conn = await this.loadProjectDatabases(projectId);
    return conn.system;
  }

  /**
   * 获取已加载的 system.db DataSource（同步，不自动创建）
   *
   * @returns 连接对象或 undefined（未加载时）
   */
  getLoadedSystemDb(projectId: string): DataSource | undefined {
    return this.connections.get(projectId)?.system;
  }

  /**
   * 获取已加载的项目数据库连接（同步，不自动创建）
   * @returns 连接对象或 undefined（未加载时）
   */
  getConnection(projectId: string): ProjectDbConnection | undefined {
    return this.connections.get(projectId);
  }

  /**
   * 卸载项目数据库连接（关闭 DataSource）
   */
  async unloadProjectDatabases(projectId: string): Promise<void> {
    const connection = this.connections.get(projectId);
    if (!connection) return;

    let destroyed = 0;
    try {
      if (connection.system.isInitialized) {
        await connection.system.destroy();
        destroyed++;
      }
    } catch (err) {
      this.logger.error(
        `[${projectId}] Failed to destroy system DataSource: ${(err as Error).message}`,
      );
    }

    this.connections.delete(projectId);
    this.poolStats.activeConnections -= destroyed;
    this.poolStats.totalDestroyed += destroyed;
    this.logger.log(`[${projectId}] system.db unloaded`);
  }

  /**
   * 删除项目数据库文件（物理删除 db/ 目录）
   * 先关闭连接，再删除文件
   */
  async deleteProjectDatabases(projectId: string): Promise<void> {
    await this.unloadProjectDatabases(projectId);

    const dbDir = this.getProjectDbDir(projectId);
    if (fs.existsSync(dbDir)) {
      fs.rmSync(dbDir, { recursive: true, force: true });
      this.logger.log(`[${projectId}] Database directory deleted: ${dbDir}`);
    }
  }

  /**
   * 检查项目数据库文件是否存在
   */
  hasDatabaseFiles(projectId: string): boolean {
    const dbDir = this.getProjectDbDir(projectId);
    const systemDbPath = path.join(dbDir, 'system.db');
    return fs.existsSync(systemDbPath);
  }

  /**
   * VACUUM 压缩项目数据库
   */
  async vacuumProjectDatabases(projectId: string): Promise<void> {
    const connection = this.connections.get(projectId);
    if (!connection) return;

    try {
      await connection.system.query('VACUUM');
      this.logger.log(`[${projectId}] system.db vacuumed`);
    } catch (err) {
      this.logger.warn(`[${projectId}] VACUUM failed: ${(err as Error).message}`);
    }
  }

  /**
   * 获取当前已加载的项目数量
   */
  get loadedProjectCount(): number {
    return this.connections.size;
  }

  /**
   * 获取当前已加载的项目名列表（用于跨项目定时扫描等场景）
   *
   * 返回已建立 DataSource 的项目名数组（快照副本）。
   * 在 isolated 模式下，业务定时任务可据此遍历各项目库执行扫描。
   */
  getLoadedProjectNames(): string[] {
    return Array.from(this.connections.keys());
  }

  // ============================================================
  // 连接池管理
  // ============================================================

  private loadPoolConfig(): PoolConfig {
    return {
      maxConnections:
        this.configService.get<number>('DB_POOL_MAX_CONNECTIONS') ||
        DEFAULT_POOL_CONFIG.maxConnections,
      idleTimeoutMs:
        this.configService.get<number>('DB_POOL_IDLE_TIMEOUT_MS') ||
        DEFAULT_POOL_CONFIG.idleTimeoutMs,
      healthCheckIntervalMs:
        this.configService.get<number>('DB_POOL_HEALTH_CHECK_MS') ||
        DEFAULT_POOL_CONFIG.healthCheckIntervalMs,
      acquireTimeoutMs:
        this.configService.get<number>('DB_POOL_ACQUIRE_TIMEOUT_MS') ||
        DEFAULT_POOL_CONFIG.acquireTimeoutMs,
    };
  }

  getPoolConfig(): PoolConfig {
    return { ...this.poolConfig };
  }

  updatePoolConfig(config: Partial<PoolConfig>): void {
    this.poolConfig = { ...this.poolConfig, ...config };
    this.logger.log(
      `Pool config updated: max=${this.poolConfig.maxConnections}, ` +
        `idle=${this.poolConfig.idleTimeoutMs}ms, ` +
        `health=${this.poolConfig.healthCheckIntervalMs}ms`,
    );
  }

  getPoolStats(): PoolStats {
    return { ...this.poolStats };
  }

  async checkConnectionHealth(projectId: string): Promise<boolean> {
    const connection = this.connections.get(projectId);
    if (!connection) return false;

    try {
      if (connection.system.isInitialized) {
        await connection.system.query('SELECT 1');
      } else {
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`[${projectId}] Health check failed: ${(err as Error).message}`);
      this.poolStats.healthCheckFailures++;
      return false;
    }
  }

  async checkAllConnectionsHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const projectNames = Array.from(this.connections.keys());
    for (const name of projectNames) {
      results.set(name, await this.checkConnectionHealth(name));
    }
    this.poolStats.lastHealthCheck = new Date();
    const healthyCount = Array.from(results.values()).filter(Boolean).length;
    this.logger.log(`Health check completed: ${healthyCount}/${results.size} connections healthy`);
    return results;
  }

  startHealthCheck(): void {
    if (this.healthCheckTimer) {
      this.logger.warn('Health check timer already running');
      return;
    }
    this.healthCheckTimer = setInterval(() => {
      this.checkAllConnectionsHealth();
    }, this.poolConfig.healthCheckIntervalMs);
    this.logger.log(`Health check started (interval: ${this.poolConfig.healthCheckIntervalMs}ms)`);
  }

  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.logger.log('Health check stopped');
    }
  }

  isHealthCheckRunning(): boolean {
    return this.healthCheckTimer !== null;
  }

  resetPoolStats(): void {
    this.poolStats = {
      activeConnections: this.connections.size,
      idleConnections: 0,
      pendingRequests: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      acquireFailures: 0,
      healthCheckFailures: 0,
      lastHealthCheck: null,
    };
  }

  /**
   * 数据迁移（PreSync）：在 TypeORM synchronize 之前，用临时 DataSource 迁移 NULL projectId。
   *
   * TypeORM 的 synchronize 在检测到 schema 变更时会创建临时表来重建，
   * 如果现有记录的 projectId 为 NULL，临时表的 NOT NULL 约束会导致 SQLITE_CONSTRAINT 错误。
   * 因此必须在 synchronize 之前完成迁移。
   *
   * 处理两种场景：
   * 1. 表已有 projectId 列但值为 NULL → UPDATE
   * 2. 表完全没有 projectId 列 → ALTER TABLE ADD COLUMN + UPDATE
   *
   * 优化：先检查是否需要 PreSync，如果所有表都已有 projectId 列则跳过，
   * 避免每次启动都对大表（如 historical_data）执行不必要的 schema 检查。
   */
  private async migrateNullProjectIdsPreSync(dbPath: string, projectId: string): Promise<void> {
    // 快速检查：如果所有表都已有 projectId 列，跳过 PreSync
    const needsPreSync = await this.isPreSyncNeeded(dbPath);
    if (!needsPreSync) {
      return;
    }

    // 先使用原生 sqlite3 处理缺少 projectId 列的表（ALTER TABLE）
    await this.preSyncAddMissingColumns(dbPath, projectId);

    // 再用 TypeORM DataSource 处理已有列但值为 NULL 的情况
    let ds: DataSource | null = null;
    try {
      ds = new DataSource({
        type: 'sqlite',
        database: dbPath,
        entities: this.registeredEntities,
        synchronize: false,
        logging: false,
        extra: { busyTimeout: BUSY_TIMEOUT },
      });
      await ds.initialize();

      await this.migrateNullProjectIds(ds, this.registeredEntities, projectId);

      await ds.destroy();
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!msg.includes('no such table')) {
        this.logger.warn(`[${projectId}] PreSync migration error: ${msg}`);
      }
      if (ds?.isInitialized) {
        try {
          await ds.destroy();
        } catch {
          /* ignore */
        }
      }
    }
  }

  /**
   * 检查是否需要 PreSync：如果所有表都已存在 projectId 列，则跳过
   */
  private isPreSyncNeeded(dbPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, (openErr: Error | null) => {
        if (openErr) {
          resolve(true);
          return;
        }

        db.get(
          `SELECT COUNT(*) as cnt FROM sqlite_master
           WHERE type='table' AND name NOT LIKE 'sqlite_%'
           AND name NOT LIKE 'temporary_%'`,
          [],
          (err: Error | null, row: { cnt: number }) => {
            if (err) {
              db.close();
              resolve(true);
              return;
            }

            const totalTables = row?.cnt ?? 0;
            if (totalTables === 0) {
              db.close();
              resolve(false);
              return;
            }

            // 检查所有用户表中已包含 projectId 列的数量
            db.all(
              `SELECT DISTINCT m.name as tbl_name
               FROM sqlite_master m
               WHERE m.type='table'
                 AND m.name NOT LIKE 'sqlite_%'
                 AND m.name NOT LIKE 'temporary_%'
                 AND EXISTS (
                   SELECT 1 FROM pragma_table_info(m.name) WHERE name='projectId'
                 )`,
              [],
              (err2: Error | null, rows: { tbl_name: string }[]) => {
                db.close();
                if (err2) {
                  resolve(true);
                  return;
                }
                const tablesWithProjectId = rows?.length ?? 0;
                // 如果所有表都已有 projectId 列，不需要 PreSync
                resolve(tablesWithProjectId < totalTables);
              },
            );
          },
        );
      });
    });
  }

  /**
   * 为缺少 projectId 列的表添加该列并填充值。
   * 必须在 TypeORM synchronize 之前完成，
   * 否则 synchronize 创建临时表时会因 NOT NULL 约束而失败。
   */
  private async preSyncAddMissingColumns(dbPath: string, projectId: string): Promise<void> {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, (openErr: Error | null) => {
        if (openErr) {
          resolve();
          return;
        }

        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'temporary_%'",
          [],
          (tableErr: Error | null, tables: { name: string }[]) => {
            if (tableErr) {
              db.close();
              resolve();
              return;
            }

            let pending = tables.length;
            if (pending === 0) {
              db.close();
              resolve();
              return;
            }

            for (const { name: tableName } of tables) {
              db.all(
                `SELECT name FROM pragma_table_info('${tableName}') WHERE name='projectId'`,
                [],
                (colErr: Error | null, cols: { name: string }[]) => {
                  if (colErr) {
                    if (--pending === 0) {
                      db.close();
                      resolve();
                    }
                    return;
                  }

                  if (!cols || cols.length === 0) {
                    // 该表缺少 projectId 列：先添加列，再填充值
                    db.run(
                      `ALTER TABLE "${tableName}" ADD COLUMN projectId varchar DEFAULT ''`,
                      [],
                      (alterErr: Error | null) => {
                        if (alterErr) {
                          if (--pending === 0) {
                            db.close();
                            resolve();
                          }
                          return;
                        }
                        // 填充默认值
                        db.run(
                          `UPDATE "${tableName}" SET projectId = ? WHERE projectId IS NULL OR projectId = ''`,
                          [projectId],
                          (updateErr: Error | null) => {
                            if (!updateErr) {
                              this.logger.log(
                                `[${projectId}] PreSync: added projectId column to "${tableName}"`,
                              );
                            }
                            if (--pending === 0) {
                              db.close();
                              resolve();
                            }
                          },
                        );
                      },
                    );
                  } else {
                    if (--pending === 0) {
                      db.close();
                      resolve();
                    }
                  }
                },
              );
            }
          },
        );
      });
    });
  }

  /**
   * Pre-sync 迁移：重命名 dev_devices 表的 tid→device_code / name→device_name 列
   *
   * 策略 B（DB 列名与 TS 属性名对齐）的配套迁移。
   * 必须在 TypeORM synchronize 之前执行，否则 synchronize 会删除旧列（数据丢失）并新增空列。
   *
   * 幂等性：
   * - 已迁移的 DB（tid/name 列不存在）：跳过
   * - 新建的 DB（device_code/device_name 列已存在）：跳过
   * - 待迁移的 DB（tid/name 列存在）：执行 RENAME COLUMN + 重建索引
   *
   * @param dbPath    项目 system.db 路径
   * @param projectId 项目标识符（用于日志）
   */
  private async renameDeviceColumnsPreSync(dbPath: string, projectId: string): Promise<void> {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbPath, (openErr: Error | null) => {
        if (openErr) {
          // 文件不存在或无法打开：跳过（新项目由 init-system-db.sql 创建）
          resolve();
          return;
        }

        // 1. 检查 dev_devices 表是否存在
        db.get(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='dev_devices'",
          [],
          (tableErr: Error | null, row: { name: string } | undefined) => {
            if (tableErr || !row) {
              // 表不存在（新项目）：跳过
              db.close();
              resolve();
              return;
            }

            // 2. 获取 dev_devices 列名
            db.all(
              "SELECT name FROM pragma_table_info('dev_devices')",
              [],
              (colErr: Error | null, cols: { name: string }[]) => {
                if (colErr) {
                  db.close();
                  resolve();
                  return;
                }

                const columnNames = (cols || []).map((c) => c.name);
                const hasTid = columnNames.includes('tid');
                const hasName = columnNames.includes('name');
                const hasDeviceCode = columnNames.includes('device_code');
                const hasDeviceName = columnNames.includes('device_name');

                // 3. 构建迁移 SQL（仅当旧列存在且新列不存在时）
                const statements: string[] = [];

                if (hasTid && !hasDeviceCode) {
                  statements.push('ALTER TABLE dev_devices RENAME COLUMN tid TO device_code');
                }
                if (hasName && !hasDeviceName) {
                  statements.push('ALTER TABLE dev_devices RENAME COLUMN name TO device_name');
                }

                if (statements.length === 0) {
                  db.close();
                  resolve();
                  return;
                }

                // 4. 执行列重命名
                // 注：SQLite 在 RENAME COLUMN 时自动更新索引/触发器中的列引用，
                //     索引名由 TypeORM synchronize 基于 @Index/@Unique 装饰器管理，
                //     此处无需手动重建索引。
                db.exec(statements.join(';\n') + ';', (execErr: Error | null) => {
                  if (execErr) {
                    this.logger.warn(
                      `[${projectId}] PreSync: dev_devices column rename failed: ${execErr.message}`,
                    );
                  } else {
                    this.logger.log(
                      `[${projectId}] PreSync: renamed dev_devices columns (${statements.join(', ')})`,
                    );
                  }
                  db.close();
                  resolve();
                });
              },
            );
          },
        );
      });
    });
  }

  /**
   * 数据迁移：ProjectScopedEntity 引入后，已有记录的 projectId 列可能为 NULL。
   * 在 isolated 模式下，所有记录都属于当前项目，统一设置为 projectId。
   *
   * 通过 TypeORM 元数据自动发现所有含 projectId 列的表，逐表执行 UPDATE。
   */
  private async migrateNullProjectIds(
    ds: DataSource,
    entities: any[],
    projectId: string,
  ): Promise<void> {
    const migratedTables: string[] = [];
    for (const entity of entities) {
      try {
        const metadata = ds.getMetadata(entity);
        const tableName = metadata.tableName;
        const hasProjectId = metadata.columns.some((c) => c.propertyName === 'projectId');
        if (!hasProjectId) continue;

        const result = await ds.query(
          `UPDATE "${tableName}" SET projectId = ? WHERE projectId IS NULL`,
          [projectId],
        );
        // SQLite better-sqlite3 returns { changes: N } for UPDATE
        const affected =
          typeof result === 'object' && result !== null ? ((result as any).changes ?? 0) : 0;
        if (affected > 0) {
          migratedTables.push(tableName);
          this.logger.log(
            `[${projectId}] Migrated ${affected} NULL projectId(s) in "${tableName}"`,
          );
        }
      } catch (err) {
        // 表不存在（实体注册但尚未建表）时静默跳过
        const msg = (err as Error).message || '';
        if (msg.includes('no such table')) {
          continue;
        }
        this.logger.warn(`[${projectId}] projectId migration for entity "${entity.name}": ${msg}`);
      }
    }
    if (migratedTables.length > 0) {
      this.logger.log(`[${projectId}] projectId migration completed: ${migratedTables.join(', ')}`);
    }
  }
}
