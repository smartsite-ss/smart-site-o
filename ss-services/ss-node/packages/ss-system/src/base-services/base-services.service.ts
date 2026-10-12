// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChildProcess, spawn, exec } from 'child_process';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { BaseServiceEntity } from './base-service.entity';
import { CreateBaseServiceDto, UpdateBaseServiceDto } from './base-service.dto';

/**
 * 服务运行状态
 */
export interface ServiceStatus {
  id: string;
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  port?: number;
  portReachable: boolean;
  processRunning: boolean;
  startedAt?: Date;
  uptimeSeconds?: number;
  binaryExists: boolean;
  configExists: boolean;
  dataDirExists: boolean;
  logDirExists: boolean;
  autoStart: boolean;
  processGuard: boolean;
  lastError?: string;
}

/**
 * 启停操作结果
 */
export interface ServiceActionResult {
  success: boolean;
  name: string;
  action: 'start' | 'stop' | 'restart';
  pid?: number;
  message: string;
  durationMs: number;
}

/** InfluxDB setup 状态 */
export interface InfluxSetupStatus {
  /** InfluxDB 是否可达 */
  reachable: boolean;
  /** 是否已完成初始化（false=需要执行 setup） */
  initialized: boolean;
  /** 当前配置的 TOKEN 是否为空 */
  tokenConfigured: boolean;
}

/** InfluxDB 初始化结果 */
export interface InfluxSetupResult {
  success: boolean;
  message: string;
  token?: string;
  org?: string;
  bucket?: string;
  details?: Record<string, any>;
}

/** InfluxDB 健康状态 */
export interface InfluxHealthStatus {
  /** 总健康状态：healthy / degraded / unhealthy */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** InfluxDB 版本号 */
  version?: string;
  /** 提交 hash */
  commit?: string;
  /** 检查耗时 (ms) */
  responseTimeMs?: number;
  /** 错误信息 */
  error?: string;
}

/** InfluxDB Bucket */
export interface InfluxBucket {
  id: string;
  name: string;
  orgID?: string;
  description?: string;
  retentionPeriodHrs?: number;
  storageBytes?: number;
  createdAt?: string;
  updatedAt?: string;
  /** measurement 数量 */
  measurementCount?: number;
  /** 最后写入时间（ISO 字符串） */
  lastWriteAt?: string;
  /** 数据点总数（近似） */
  dataPointCount?: number;
}

/** InfluxDB 环境配置 */
export interface InfluxConfig {
  url: string;
  org: string;
  bucket: string;
  tokenConfigured: boolean;
  tokenMasked: string;
}

/** NanoMQ MQTT 健康状态 */
export interface NanomqHealthStatus {
  /** MQTT 端口是否可达 */
  reachable: boolean;
  /** 检查耗时 (ms) */
  responseTimeMs?: number;
  /** 错误信息 */
  error?: string;
}

/** 日志条目 */
export interface LogEntry {
  filename: string;
  size: number;
  modifiedAt: Date;
  lines: string[];
  totalLines: number;
}

/** 服务运行时记录 */
interface RuntimeRecord {
  pid?: number;
  startedAt?: Date;
  childProcess?: ChildProcess;
}

/** 启动等待端口就绪的超时时间（毫秒） */
const START_TIMEOUT_MS = 15000;
/** 停止时等待进程退出的超时时间（毫秒） */
const STOP_TIMEOUT_MS = 5000;
/** 单次读取日志的最大行数 */
const LOG_MAX_LINES = 500;
/** 配置文件最大大小（1MB） */
const CONFIG_MAX_SIZE = 1024 * 1024;
/** 日志保留份数 */
const LOG_BACKUP_KEEP = 5;

@Injectable()
export class BaseServicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaseServicesService.name);
  /** 运行时状态（内存中的 PID 记录） */
  private readonly runtimes = new Map<string, RuntimeRecord>();
  /** 进程守护定时器 */
  private processGuardTimer: ReturnType<typeof setInterval> | null = null;
  /** 进程守护检测间隔（毫秒），默认 30 秒 */
  private readonly PROCESS_GUARD_INTERVAL_MS = 30000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BaseServiceEntity)
    private readonly serviceRepo: Repository<BaseServiceEntity>,
    private readonly pathResolver: PathResolverService,
  ) {}

  async onModuleInit(): Promise<void> {
    // 同步默认服务配置（空表全量写入，非空表按环境变量 upsert）
    await this.syncDefaultServices();
    // 自动启动标记了 autoStart 的服务
    await this.autoStartServices();
    // 启动进程守护（定时检测 processGuard 服务）
    this.startProcessGuardian();
  }

  onModuleDestroy(): void {
    this.stopProcessGuardian();
  }

  // ==================== 默认服务同步 ====================

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node
   *   （本文件位于 packages/ss-system/dist/base-services/）
   *   .env 中配置的相对路径（如 ../../ss-run/ss/base_services）相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中相对路径相对于该目录解析
   *
   * 修复历史：
   * - v1.5 之前仅用 __dirname 不区分 prod，prod 模式下 __dirname 位于
   *   node_modules/@ss-node/ss-system/dist/base-services/，4 级上溯到 node_modules/（错误）
   * - 现在与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  /**
   * 将路径解析为绝对路径。
   * - 绝对路径：原样返回
   * - 相对路径：基于项目根目录（ss-services/ss-node）解析为绝对路径
   *
   * 这样 DB 中存储的始终是绝对路径，fs.existsSync() 与 spawn() 调用
   * 不再依赖 process.cwd()，确保跨启动场景一致。
   */
  private resolveAbsolutePath(p: string | undefined): string | undefined {
    if (!p) return undefined;
    return this.pathResolver.resolve(p);
  }

  /** 默认服务配置定义（环境变量优先，BASE_SERVICES_DIR 兜底） */
  private getDefaultServiceDefs(): Array<{
    envPrefix: string;
    defaults: Partial<BaseServiceEntity>;
    startArgs: string;
  }> {
    // 如果环境变量未配置 BASE_SERVICES_DIR，按模式计算默认路径：
    // - prod：SS_NODE_ROOT = ss-run/ss/services/ss-node/ → ../../base_services
    // - dev： SS_NODE_ROOT = ss-services/ss-node/       → ../../ss-run/ss/base_services
    // 两者最终都解析到 ss-run/ss/base_services/
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultBaseDir = isProduction
      ? path.join('..', '..', 'base_services')
      : path.join('..', '..', 'ss-run', 'ss', 'base_services');

    const rawBaseDir =
      this.configService.get<string>('BASE_SERVICES_DIR') ||
      defaultBaseDir;
    // BASE_SERVICES_DIR 可能是相对路径（.env 中 ../../ss-run/ss/base_services），
    // 必须解析为绝对路径后拼接子路径，否则存入 DB 的路径会随 process.cwd() 变化
    const baseDir = this.resolveAbsolutePath(rawBaseDir)!;
    // Nginx 在 ss-run/ss/web/nginx/，与 base_services 同级
    const nginxDir = path.join(baseDir, '..', 'web', 'nginx');

    return [
      {
        envPrefix: 'REDIS',
        defaults: {
          name: 'redis',
          displayName: 'Redis',
          description: 'Redis 缓存服务',
          binaryPath: path.join(baseDir, 'redis', 'redis-server.exe'),
          configPath: path.join(baseDir, 'redis', 'redis.conf'),
          dataDir: path.join(baseDir, 'redis', 'data'),
          logDir: path.join(baseDir, 'redis', 'logs'),
          processName: 'redis-server.exe',
          port: Number(this.configService.get<string>('REDIS_PORT')) || 6379,
          startScript: '',
          stopScript: '',
          enabled: true,
          autoStart: false,
          sortOrder: 1,
        },
        startArgs: 'redis.conf',
      },
      {
        envPrefix: 'INFLUXDB',
        defaults: {
          name: 'influxdb',
          displayName: 'InfluxDB',
          description: 'InfluxDB 时序数据库',
          binaryPath: path.join(baseDir, 'influxdb2-2.7.8', 'influxd.exe'),
          configPath: path.join(baseDir, 'influxdb2-2.7.8', 'config.yaml'),
          dataDir: path.join(baseDir, 'influxdb2-2.7.8', 'data'),
          logDir: path.join(baseDir, 'influxdb2-2.7.8', 'logs'),
          processName: 'influxd.exe',
          port: 8086,
          startScript: '',
          stopScript: '',
          enabled: true,
          autoStart: false,
          sortOrder: 2,
        },
        startArgs: '',
      },
      {
        envPrefix: 'INFLUXDB3',
        defaults: {
          name: 'influxdb3',
          displayName: 'InfluxDB 3 Core',
          description: 'InfluxDB 3 Core 时序数据库（多引擎存储适配）',
          binaryPath: path.join(baseDir, 'influxdb3-3.11.2', 'influxdb3.exe'),
          configPath: '',
          dataDir: path.join(baseDir, 'influxdb3-3.11.2', 'data'),
          logDir: path.join(baseDir, 'influxdb3-3.11.2', 'logs'),
          processName: 'influxdb3.exe',
          port: Number(this.configService.get<string>('INFLUXDB3_PORT')) || 8181,
          startScript: '',
          stopScript: '',
          enabled: true,
          autoStart: false,
          sortOrder: 5,
        },
        // cwd 为二进制所在目录，--data-dir data 相对该目录（与 dataDir 一致）
        startArgs: 'serve --node-id ss-node --object-store file --data-dir data',
      },
      {
        envPrefix: 'NANOMQ',
        defaults: {
          name: 'nanomq',
          displayName: 'NanoMQ',
          description: 'NanoMQ MQTT 消息代理',
          binaryPath: path.join(baseDir, 'nanomq', 'bin', 'nanomq.exe'),
          configPath: path.join(baseDir, 'nanomq', 'etc', 'nanomq.conf'),
          dataDir: path.join(baseDir, 'nanomq', 'data'),
          logDir: path.join(baseDir, 'nanomq', 'logs'),
          processName: 'nanomq.exe',
          port: Number(this.configService.get<string>('NANOMQ_PORT')) || 1883,
          startScript: '',
          stopScript: '',
          enabled: true,
          autoStart: false,
          sortOrder: 3,
        },
        startArgs: 'start',
      },
      {
        envPrefix: 'NGINX',
        defaults: {
          name: 'nginx',
          displayName: 'Nginx',
          description: 'Nginx Web 服务（前端静态资源 + API 代理）',
          binaryPath: path.join(nginxDir, 'nginx.exe'),
          configPath: path.join(nginxDir, 'conf', 'nginx.conf'),
          dataDir: path.join(nginxDir, 'html'),
          logDir: path.join(nginxDir, 'logs'),
          processName: 'nginx.exe',
          port: Number(this.configService.get<string>('NGINX_PORT')) || 8800,
          startScript: '',
          stopScript: '',
          enabled: true,
          autoStart: false,
          sortOrder: 4,
        },
        startArgs: '',
      },
    ];
  }

  /**
   * 从环境变量读取服务路径，环境变量优先于默认值。
   *
   * 环境变量映射：
   *   {PREFIX}_BINARY_PATH  → binaryPath
   *   {PREFIX}_CONFIG_PATH  → configPath
   *   {PREFIX}_DATA_DIR     → dataDir
   *   {PREFIX}_LOG_DIR      → logDir
   *
   * 所有路径都会经过 resolveAbsolutePath 处理，确保 DB 中存储的是绝对路径。
   * 这样可以避免 process.cwd() 不同（如 pnpm --filter 启动时 cwd 为 apps/ss-node-server）
   * 导致 fs.existsSync() 解析失败。
   */
  private resolveServicePaths(
    envPrefix: string,
    defaults: Partial<BaseServiceEntity>,
  ): Partial<BaseServiceEntity> {
    const result = { ...defaults };

    const envBinaryPath = this.configService.get<string>(`${envPrefix}_BINARY_PATH`);
    const envConfigPath = this.configService.get<string>(`${envPrefix}_CONFIG_PATH`);
    const envDataDir = this.configService.get<string>(`${envPrefix}_DATA_DIR`);
    const envLogDir = this.configService.get<string>(`${envPrefix}_LOG_DIR`);

    // 环境变量优先；无论绝对还是相对路径，统一解析为绝对路径存入 DB
    if (envBinaryPath) result.binaryPath = this.resolveAbsolutePath(envBinaryPath);
    if (envConfigPath) result.configPath = this.resolveAbsolutePath(envConfigPath);
    if (envDataDir) result.dataDir = this.resolveAbsolutePath(envDataDir);
    if (envLogDir) result.logDir = this.resolveAbsolutePath(envLogDir);

    return result;
  }

  /**
   * 同步默认服务到 DB（v1.1 — 环境变量关联 + upsert）
   * - 空表：全量写入默认服务
   * - 非空表：对每个默认服务执行 upsert（不存在则插入，存在则更新字段）
   */
  async syncDefaultServices(): Promise<void> {
    const count = await this.serviceRepo.count();
    const defs = this.getDefaultServiceDefs();

    if (count === 0) {
      // 空表：全量写入
      for (const { defaults, envPrefix, startArgs } of defs) {
        const resolved = this.resolveServicePaths(envPrefix, defaults);
        const entity = this.serviceRepo.create({
          ...resolved,
          startArgs: startArgs || undefined,
        });
        await this.serviceRepo.save(entity);
      }
      this.logger.log(`Initialized ${defs.length} default base services (empty DB)`);
      return;
    }

    // 非空表：upsert
    let synced = 0;
    for (const { defaults, envPrefix, startArgs } of defs) {
      const name = defaults.name;
      if (!name) continue;

      const resolved = this.resolveServicePaths(envPrefix, defaults);
      const existing = await this.serviceRepo.findOne({ where: { name } });

      if (!existing) {
        // 不存在：插入
        const entity = this.serviceRepo.create({
          ...resolved,
          startArgs: startArgs || undefined,
        });
        await this.serviceRepo.save(entity);
        synced++;
        this.logger.log(`Inserted missing default service: ${name}`);
      } else {
        // 存在：更新路径字段（保持用户配置的 enabled/autoStart 等不变）
        const fieldsToSync: (keyof BaseServiceEntity)[] = [
          'binaryPath',
          'configPath',
          'dataDir',
          'logDir',
          'processName',
          'port',
          'displayName',
          'description',
        ];
        let updated = false;
        for (const field of fieldsToSync) {
          const newVal = resolved[field];
          if (newVal !== undefined && newVal !== existing[field]) {
            (existing as any)[field] = newVal;
            updated = true;
          }
        }
        // 同步 startArgs（仅当默认值非空或用户未设置时）
        if (startArgs && existing.startArgs !== startArgs) {
          existing.startArgs = startArgs;
          updated = true;
        }
        if (updated) {
          await this.serviceRepo.save(existing);
          synced++;
          this.logger.log(`Synced default service: ${name}`);
        }
      }
    }

    if (synced > 0) {
      this.logger.log(`Default services synced: ${synced} items inserted/updated`);
    }
  }

  /** 自动启动标记了 autoStart 的服务 */
  private async autoStartServices(): Promise<void> {
    const autoStartServices = await this.serviceRepo.find({
      where: { autoStart: true, enabled: true },
    });
    for (const svc of autoStartServices) {
      try {
        const result = await this.start(svc.name);
        if (result.success) {
          this.logger.log(`Auto-started service: ${svc.name}`);
        } else {
          this.logger.warn(`Auto-start failed for ${svc.name}: ${result.message}`);
        }
      } catch (err: any) {
        this.logger.warn(`Auto-start error for ${svc.name}: ${err.message}`);
      }
    }
  }

  // ==================== 进程守护 ====================

  /** 启动进程守护定时器 */
  private startProcessGuardian(): void {
    if (this.processGuardTimer) return;
    this.logger.log(`Process guardian started, interval=${this.PROCESS_GUARD_INTERVAL_MS}ms`);
    this.processGuardTimer = setInterval(() => {
      this.checkAndGuardProcesses();
    }, this.PROCESS_GUARD_INTERVAL_MS);
  }

  /** 停止进程守护定时器 */
  private stopProcessGuardian(): void {
    if (this.processGuardTimer) {
      clearInterval(this.processGuardTimer);
      this.processGuardTimer = null;
      this.logger.log('Process guardian stopped');
    }
  }

  /**
   * 进程守护检测：检查 processGuard=true 的服务，若进程不在则自动拉起
   */
  private async checkAndGuardProcesses(): Promise<void> {
    const guardedServices = await this.serviceRepo.find({
      where: { processGuard: true, enabled: true },
    });

    for (const svc of guardedServices) {
      try {
        // 检查 runtime 记录：是否还有已启动的进程
        const rt = this.runtimes.get(svc.name);
        if (rt?.pid) {
          // 运行时记录存在，优先用 PID 检测（P1优化：避免 tasklist exec 阻塞）
          const alive = this.isPidAlive(rt.pid);
          if (alive) continue; // 进程正常，跳过
          // 进程已死，清理旧记录
          this.runtimes.delete(svc.name);
        }

        // 二次确认：有 processName 但无 PID 时，才用 tasklist（P1优化：仅 fallback）
        if (!rt?.pid && svc.processName) {
          const running = await this.isProcessRunning(svc.processName);
          if (running) {
            // 可恢复：runtime 丢失但进程存在，记录 debug
            this.logger.debug(`Process guard: ${svc.name} running without runtime record`);
            continue;
          }
        }

        // 自动拉起
        this.logger.warn(`Process guard: restarting ${svc.name} (${svc.displayName})`);
        const result = await this.start(svc.name);
        if (result.success) {
          this.logger.log(`Process guard: ${svc.name} restarted (PID=${result.pid})`);
        } else {
          this.logger.error(`Process guard: ${svc.name} restart failed: ${result.message}`);
        }
      } catch (err: any) {
        // 如果是 ConflictException（进程已在运行），说明守护检测正常
        if (err instanceof ConflictException) {
          this.logger.debug(`Process guard: ${svc.name} already running (conflict)`);
        } else {
          this.logger.error(`Process guard: ${svc.name} error: ${err.message}`);
        }
      }
    }
  }

  // ==================== CRUD 操作 ====================

  /** 获取所有服务配置 */
  async findAll(): Promise<BaseServiceEntity[]> {
    return this.serviceRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /** 根据 name 获取服务配置 */
  async findByName(name: string): Promise<BaseServiceEntity> {
    const svc = await this.serviceRepo.findOne({ where: { name } });
    if (!svc) throw new NotFoundException(`基础服务不存在: ${name}`);
    return svc;
  }

  /** 创建新服务 */
  async create(dto: CreateBaseServiceDto): Promise<BaseServiceEntity> {
    const existing = await this.serviceRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`服务名称已存在: ${dto.name}`);
    }

    const entity = this.serviceRepo.create({
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      binaryPath: dto.binaryPath,
      startArgs: dto.startArgs,
      configPath: dto.configPath,
      logDir: dto.logDir,
      dataDir: dto.dataDir,
      processName: dto.processName,
      port: dto.port ?? 0,
      startScript: dto.startScript,
      stopScript: dto.stopScript,
      enabled: dto.enabled ?? true,
      autoStart: dto.autoStart ?? false,
      processGuard: dto.processGuard ?? false,
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await this.serviceRepo.save(entity);
    this.logger.log(`Created base service: ${dto.name}`);
    return saved;
  }

  /** 更新服务配置 */
  async update(name: string, dto: UpdateBaseServiceDto): Promise<BaseServiceEntity> {
    const svc = await this.findByName(name);
    Object.assign(svc, dto);
    const saved = await this.serviceRepo.save(svc);
    this.logger.log(`Updated base service: ${name}`);
    return saved;
  }

  /** 删除服务 */
  async remove(name: string): Promise<void> {
    const svc = await this.findByName(name);
    // 如果服务正在运行，先停止
    const runtime = this.runtimes.get(name);
    if (runtime?.pid) {
      try {
        await this.stop(name);
      } catch {
        // 忽略停止错误
      }
    }
    await this.serviceRepo.remove(svc);
    this.logger.log(`Deleted base service: ${name}`);
  }

  // ==================== 状态查询 ====================

  /** 获取所有服务状态 */
  async getAllStatus(): Promise<ServiceStatus[]> {
    const services = await this.findAll();
    const results: ServiceStatus[] = [];
    for (const svc of services) {
      if (!svc.enabled) {
        results.push({
          id: svc.id,
          name: svc.name,
          displayName: svc.displayName,
          status: 'unknown',
          portReachable: false,
          processRunning: false,
          binaryExists: !!svc.binaryPath && fs.existsSync(svc.binaryPath),
          configExists: !!svc.configPath && fs.existsSync(svc.configPath),
          dataDirExists: !!svc.dataDir && fs.existsSync(svc.dataDir),
          logDirExists: !!svc.logDir && fs.existsSync(svc.logDir),
          autoStart: svc.autoStart,
          processGuard: svc.processGuard,
        });
        continue;
      }
      results.push(await this.getStatus(svc.name));
    }
    return results;
  }

  /** 获取单个服务状态 */
  async getStatus(name: string): Promise<ServiceStatus> {
    const svc = await this.findByName(name);
    const runtime = this.runtimes.get(name) || {};

    const binaryExists = !!svc.binaryPath && fs.existsSync(svc.binaryPath);
    const configExists = !!svc.configPath && fs.existsSync(svc.configPath);
    const dataDirExists = !!svc.dataDir && fs.existsSync(svc.dataDir);
    const logDirExists = !!svc.logDir && fs.existsSync(svc.logDir);

    // 通过进程名检测是否运行
    let processRunning = false;
    if (svc.processName) {
      processRunning = await this.isProcessRunning(svc.processName);
    }

    // 通过端口检测
    let portReachable = false;
    if (svc.port && svc.port > 0) {
      portReachable = await this.checkPort(svc.port);
    }

    // PID 存活检测
    let pid = runtime.pid;
    let pidAlive = pid ? this.isPidAlive(pid) : false;
    if (!pidAlive && (processRunning || portReachable)) {
      pid = undefined;
      pidAlive = false;
    }

    let status: ServiceStatus['status'] = 'stopped';
    if (pidAlive || processRunning || portReachable) {
      status = 'running';
    }

    const startedAt = pidAlive ? runtime.startedAt : undefined;
    const uptimeSeconds = startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
      : undefined;

    return {
      id: svc.id,
      name: svc.name,
      displayName: svc.displayName,
      status,
      pid,
      port: svc.port || undefined,
      portReachable,
      processRunning,
      startedAt,
      uptimeSeconds,
      binaryExists,
      configExists,
      dataDirExists,
      logDirExists,
      autoStart: svc.autoStart,
      processGuard: svc.processGuard,
    };
  }

  // ==================== 启停操作 ====================

  /** 启动服务 */
  async start(name: string): Promise<ServiceActionResult> {
    const svc = await this.findByName(name);
    const startTime = Date.now();

    // 检查是否已在运行
    if (svc.processName && (await this.isProcessRunning(svc.processName))) {
      throw new ConflictException(`${svc.displayName} 进程已在运行 (${svc.processName})`);
    }
    if (svc.port && svc.port > 0) {
      const portInUse = await this.checkPort(svc.port);
      if (portInUse) {
        throw new ConflictException(
          `端口 ${svc.port} 已被占用，可能 ${svc.displayName} 已由外部启动`,
        );
      }
    }

    // 确保目录存在
    if (svc.dataDir) this.ensureDir(svc.dataDir);
    if (svc.logDir) this.ensureDir(svc.logDir);

    try {
      let pid: number | undefined;

      if (svc.startScript) {
        // 使用启动脚本
        pid = await this.executeScript(
          svc.startScript,
          svc.logDir ? path.join(svc.logDir, `${name}-stdout.log`) : undefined,
        );
      } else if (svc.binaryPath) {
        // 使用 binaryPath + startArgs 启动
        if (!fs.existsSync(svc.binaryPath)) {
          throw new BadRequestException(`可执行文件不存在: ${svc.binaryPath}`);
        }
        const args = svc.startArgs ? svc.startArgs.split(/\s+/).filter(Boolean) : [];
        const logFile = svc.logDir ? path.join(svc.logDir, `${name}-stdout.log`) : undefined;
        const logStream = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : undefined;

        const child = spawn(svc.binaryPath, args, {
          cwd: path.dirname(svc.binaryPath),
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: false,
        });

        if (logStream) {
          child.stdout?.pipe(logStream);
          child.stderr?.pipe(logStream);
        }

        child.on('error', (err) => {
          this.logger.error(`${svc.displayName} process error: ${err.message}`);
        });

        child.on('exit', (code, signal) => {
          this.logger.warn(`${svc.displayName} exited: code=${code}, signal=${signal}`);
          const rt = this.runtimes.get(name);
          if (rt && rt.pid === child.pid) {
            this.runtimes.delete(name);
          }
        });

        child.unref();
        pid = child.pid;

        this.runtimes.set(name, {
          pid,
          startedAt: new Date(),
          childProcess: child,
        });
      } else {
        throw new BadRequestException(`服务 ${svc.displayName} 未配置启动脚本或可执行文件路径`);
      }

      this.logger.log(`${svc.displayName} started: PID=${pid}`);

      // 等待端口就绪（如果配置了端口）
      if (svc.port && svc.port > 0) {
        const ready = await this.waitForPort(svc.port, START_TIMEOUT_MS);
        if (!ready) {
          return {
            success: false,
            name,
            action: 'start',
            pid,
            message: `进程已启动(PID=${pid})，但端口 ${svc.port} 在 ${START_TIMEOUT_MS / 1000}s 内未就绪，请查看日志`,
            durationMs: Date.now() - startTime,
          };
        }
      } else {
        // 没有配置端口，等待 500ms 让进程启动
        await new Promise((r) => setTimeout(r, 500));
      }

      return {
        success: true,
        name,
        action: 'start',
        pid,
        message: `${svc.displayName} 启动成功，PID=${pid}`,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ConflictException) throw err;
      this.logger.error(`Failed to start ${svc.displayName}: ${err.message}`);
      throw new InternalServerErrorException(`启动 ${svc.displayName} 失败: ${err.message}`);
    }
  }

  /** 停止服务 */
  async stop(name: string): Promise<ServiceActionResult> {
    const svc = await this.findByName(name);
    const startTime = Date.now();

    // 优先使用自定义停止脚本
    if (svc.stopScript) {
      await this.executeScript(svc.stopScript);
      this.runtimes.delete(name);
      this.logger.log(`${svc.displayName} stopped via custom script`);
      return {
        success: true,
        name,
        action: 'stop',
        message: `${svc.displayName} 已通过停止脚本停止`,
        durationMs: Date.now() - startTime,
      };
    }

    // 使用进程名 kill（默认行为：taskkill /F /IM <processName>）
    if (svc.processName) {
      const killed = await this.killProcessByName(svc.processName);
      if (killed) {
        this.runtimes.delete(name);
        this.logger.log(`${svc.displayName} stopped: process=${svc.processName}`);
        return {
          success: true,
          name,
          action: 'stop',
          message: `${svc.displayName} 已停止 (kill ${svc.processName})`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // 尝试用 PID 停止
    const runtime = this.runtimes.get(name);
    if (runtime?.pid && this.isPidAlive(runtime.pid)) {
      try {
        process.kill(runtime.pid, 'SIGTERM');
        const exited = await this.waitForExit(runtime.pid, STOP_TIMEOUT_MS);
        if (!exited) {
          try {
            process.kill(runtime.pid, 'SIGKILL');
          } catch {
            /* ignore */
          }
          await this.waitForExit(runtime.pid, 2000);
        }
        this.runtimes.delete(name);
        this.logger.log(`${svc.displayName} stopped: PID=${runtime.pid}`);
        return {
          success: true,
          name,
          action: 'stop',
          pid: runtime.pid,
          message: `${svc.displayName} 已停止`,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        this.logger.error(`Failed to stop ${svc.displayName}: ${err.message}`);
        throw new InternalServerErrorException(`停止 ${svc.displayName} 失败: ${err.message}`);
      }
    }

    // 服务未在运行
    this.runtimes.delete(name);
    return {
      success: true,
      name,
      action: 'stop',
      message: `${svc.displayName} 未在运行`,
      durationMs: Date.now() - startTime,
    };
  }

  /** 重启服务 */
  async restart(name: string): Promise<ServiceActionResult> {
    const svc = await this.findByName(name);
    const startTime = Date.now();

    // 尝试停止（不报错如果未运行）
    try {
      await this.stop(name);
      // 等待端口释放
      if (svc.port && svc.port > 0) {
        await this.waitForPortRelease(svc.port, STOP_TIMEOUT_MS);
      }
    } catch {
      // 忽略停止错误
    }

    // 启动
    const startResult = await this.start(name);
    return {
      ...startResult,
      action: 'restart',
      message: `${svc.displayName} 重启成功`,
      durationMs: Date.now() - startTime,
    };
  }

  // ==================== 配置文件管理 ====================

  /** 读取配置文件内容 */
  async getConfig(name: string): Promise<{ content: string; path: string; size: number }> {
    const svc = await this.findByName(name);
    if (!svc.configPath) {
      throw new BadRequestException(`服务 ${svc.displayName} 未配置配置文件路径`);
    }
    if (!fs.existsSync(svc.configPath)) {
      return { content: '', path: svc.configPath, size: 0 };
    }
    const stat = fs.statSync(svc.configPath);
    if (stat.size > CONFIG_MAX_SIZE * 10) {
      throw new BadRequestException(`配置文件过大 (${Math.round(stat.size / 1024)}KB)，超过限制`);
    }
    const content = fs.readFileSync(svc.configPath, 'utf-8');
    return { content, path: svc.configPath, size: stat.size };
  }

  /** 保存配置文件内容（原子写入 + 备份） */
  async saveConfig(
    name: string,
    content: string,
  ): Promise<{ success: boolean; path: string; backupPath?: string }> {
    const svc = await this.findByName(name);
    if (!svc.configPath) {
      throw new BadRequestException(`服务 ${svc.displayName} 未配置配置文件路径`);
    }

    if (content.length > CONFIG_MAX_SIZE) {
      throw new BadRequestException(`配置内容过大，超过 ${CONFIG_MAX_SIZE / 1024}KB 限制`);
    }

    let backupPath: string | undefined;
    if (fs.existsSync(svc.configPath)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${svc.configPath}.bak.${ts}`;
      fs.copyFileSync(svc.configPath, backupPath);
      this.cleanupOldBackups(svc.configPath);
    }

    this.ensureDir(path.dirname(svc.configPath));
    const tmpPath = `${svc.configPath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, svc.configPath);

    this.logger.log(`${svc.displayName} config saved: ${svc.configPath}`);
    return { success: true, path: svc.configPath, backupPath };
  }

  // ==================== 日志管理 ====================

  /** 获取日志列表与内容 */
  async getLogs(name: string, limit = 200): Promise<LogEntry[]> {
    const svc = await this.findByName(name);
    if (!svc.logDir || !fs.existsSync(svc.logDir)) {
      return [];
    }

    const entries: LogEntry[] = [];
    const files = fs
      .readdirSync(svc.logDir)
      .filter((f) => f.endsWith('.log') || f.endsWith('.log.1'))
      .map((f) => ({
        name: f,
        fullPath: path.join(svc.logDir!, f),
        stat: fs.statSync(path.join(svc.logDir!, f)),
      }))
      .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())
      .slice(0, 5);

    for (const file of files) {
      const content = fs.readFileSync(file.fullPath, 'utf-8');
      const allLines = content.split('\n');
      const lines = allLines.slice(-limit);
      entries.push({
        filename: file.name,
        size: file.stat.size,
        modifiedAt: file.stat.mtime,
        lines,
        totalLines: allLines.length,
      });
    }

    return entries;
  }

  /** 清理日志 */
  async clearLogs(name: string): Promise<{ cleared: string[] }> {
    const svc = await this.findByName(name);
    if (!svc.logDir || !fs.existsSync(svc.logDir)) {
      return { cleared: [] };
    }

    const cleared: string[] = [];
    const files = fs.readdirSync(svc.logDir).filter((f) => f.endsWith('.log'));
    for (const f of files) {
      const fullPath = path.join(svc.logDir, f);
      try {
        fs.truncateSync(fullPath, 0);
        cleared.push(f);
      } catch (err: any) {
        this.logger.warn(`Failed to truncate ${fullPath}: ${err.message}`);
      }
    }

    this.logger.log(`${svc.displayName} logs cleared: ${cleared.join(', ')}`);
    return { cleared };
  }

  // ==================== 私有工具方法 ====================

  /** 确保目录存在 */
  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** 检查 PID 是否存活 */
  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /** 检查端口是否可连通 */
  private checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 1500;
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  /** 等待端口就绪 */
  private async waitForPort(port: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.checkPort(port)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  /** 等待端口释放 */
  private async waitForPortRelease(port: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!(await this.checkPort(port))) return true;
      await new Promise((r) => setTimeout(r, 300));
    }
    return false;
  }

  /** 等待进程退出 */
  private waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (!this.isPidAlive(pid)) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, 300);
    });
  }

  /** 通过进程名检测进程是否在运行（Windows: tasklist） */
  private isProcessRunning(processName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = `tasklist /FI "IMAGENAME eq ${processName}" /NH /FO CSV`;
      exec(cmd, { windowsHide: true }, (err, stdout) => {
        if (err) {
          resolve(false);
          return;
        }
        // tasklist CSV 输出中如果包含进程名则表示在运行
        resolve(stdout.toLowerCase().includes(processName.toLowerCase()));
      });
    });
  }

  /** 通过进程名杀死进程（Windows: taskkill /F /IM） */
  private killProcessByName(processName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = `taskkill /F /IM ${processName}`;
      exec(cmd, { windowsHide: true }, (err) => {
        resolve(!err);
      });
    });
  }

  /** 执行脚本（返回子进程 PID） */
  private executeScript(script: string, logFile?: string): Promise<number | undefined> {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/c', script] : ['-c', script];

      const logStream = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : undefined;
      const child = spawn(shell, shellArgs, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false,
      });

      if (logStream) {
        child.stdout?.pipe(logStream);
        child.stderr?.pipe(logStream);
      }

      child.on('error', (err) => {
        reject(err);
      });

      child.on('spawn', () => {
        child.unref();
        resolve(child.pid);
      });
    });
  }

  /** 清理旧备份文件 */
  private cleanupOldBackups(configPath: string): void {
    try {
      const dir = path.dirname(configPath);
      const base = path.basename(configPath);
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(`${base}.bak.`))
        .map((f) => ({
          name: f,
          fullPath: path.join(dir, f),
          stat: fs.statSync(path.join(dir, f)),
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      for (const file of files.slice(LOG_BACKUP_KEEP)) {
        fs.unlinkSync(file.fullPath);
      }
    } catch {
      // 忽略清理错误
    }
  }

  // ==================== InfluxDB 初始化 ====================

  /**
   * 获取 InfluxDB 环境配置（来自 process.env）
   */
  getInfluxConfig(): InfluxConfig {
    const token = process.env.INFLUXDB_TOKEN || '';
    return {
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      org: process.env.INFLUXDB_ORG || 'ss-org',
      bucket: process.env.INFLUXDB_BUCKET || 'ss_node_data',
      tokenConfigured: !!token,
      tokenMasked: token ? token.slice(0, 8) + '••••' : '',
    };
  }

  /**
   * 检测 InfluxDB 是否已完成首次初始化
   *
   * InfluxDB 2.x 在首次启动时处于 setup 模式，
   * GET /api/v2/setup 返回 { allowed: true } 表示可以初始化。
   */
  async checkInfluxSetupStatus(): Promise<InfluxSetupStatus> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';

    try {
      const response = await fetch(`${url}/api/v2/setup`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const body = await response.json();
        // allowed: true → 尚未初始化，需要 setup
        // allowed: false → 已经初始化完成
        return {
          reachable: true,
          initialized: !body.allowed,
          tokenConfigured: !!token,
        };
      }

      return { reachable: false, initialized: false, tokenConfigured: !!token };
    } catch {
      return { reachable: false, initialized: false, tokenConfigured: !!token };
    }
  }

  /**
   * 自动初始化 InfluxDB（等价于 influx setup 命令）
   *
   * POST /api/v2/setup 创建：
   *   - 初始用户（username/password）
   *   - 初始 Organization
   *   - 初始 Bucket
   *   - API Token（返回后应写入 .env）
   *
   * 参数优先级：环境变量 > 传入参数 > 默认值
   */
  async setupInfluxDB(options?: {
    username?: string;
    password?: string;
    org?: string;
    bucket?: string;
  }): Promise<InfluxSetupResult> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';

    // 先检查是否已初始化
    const status = await this.checkInfluxSetupStatus();
    if (!status.reachable) {
      return {
        success: false,
        message: `InfluxDB 不可达 (${url})，请先确保 InfluxDB 服务已启动`,
      };
    }
    if (status.initialized) {
      return {
        success: true,
        message: 'InfluxDB 已完成初始化，无需重复 setup',
        org: process.env.INFLUXDB_ORG || 'ss-org',
        bucket: process.env.INFLUXDB_BUCKET || 'ss_node_data',
      };
    }

    const username = options?.username || process.env.INFLUXDB_INIT_USERNAME || 'admin';
    const password = options?.password || process.env.INFLUXDB_INIT_PASSWORD || 'admin';
    const org = options?.org || process.env.INFLUXDB_ORG || 'ss-org';
    const bucket = options?.bucket || process.env.INFLUXDB_BUCKET || 'ss_node_data';

    try {
      const response = await fetch(`${url}/api/v2/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          org,
          bucket,
          retentionPeriodHrs: 0, // 无限保留
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = (body as any).message || `HTTP ${response.status}`;
        return {
          success: false,
          message: `InfluxDB setup 失败: ${message}`,
          details: { status: response.status, body },
        };
      }

      const body = await response.json();

      // InfluxDB 2.x setup 返回 { auth: { token }, bucket, org, user }
      const generatedToken = (body as any).auth?.token || '';
      const resultOrg = (body as any).org?.name || org;
      const resultBucket = (body as any).bucket?.name || bucket;

      if (generatedToken) {
        this.logger.log(
          `InfluxDB setup completed: org="${resultOrg}", bucket="${resultBucket}", token=${generatedToken.slice(0, 8)}...`,
        );

        // 尝试将 token 写入 .env 文件（如果可写）
        const envWritten = this.writeInfluxTokenToEnv(generatedToken);
        if (envWritten) {
          this.logger.log('InfluxDB token written to .env file');
        }

        return {
          success: true,
          message: `InfluxDB 初始化成功${envWritten ? '，Token 已写入 .env 文件' : '（请手动将 Token 配置到 INFLUXDB_TOKEN）'}`,
          token: generatedToken,
          org: resultOrg,
          bucket: resultBucket,
          details: {
            envWritten,
            username,
            retentionPeriodHrs: 0,
          },
        };
      }

      return {
        success: false,
        message: 'InfluxDB setup 返回了空 Token',
        details: body,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `InfluxDB setup 请求失败: ${errorMsg}`,
      };
    }
  }

  // ==================== InfluxDB 健康检查 ====================

  /**
   * 检查 InfluxDB 健康状态
   *
   * 调用 InfluxDB 2.x 的 /health 端点，返回服务健康状态和版本信息。
   */
  async checkInfluxHealth(): Promise<InfluxHealthStatus> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const startTime = Date.now();

    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        return {
          status: body.status === 'pass' || body.status === 'healthy' ? 'healthy' : 'degraded',
          version: body.version || body.message,
          commit: body.commit,
          responseTimeMs,
        };
      }

      return {
        status: 'degraded',
        responseTimeMs,
        error: `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * 检测 NanoMQ MQTT Broker 健康状态
   *
   * 通过 TCP 连接检测 NanoMQ MQTT 端口是否可达。
   * NanoMQ 默认端口可通过 NANOMQ_PORT 环境变量配置（默认 1883）。
   */
  async checkNanomqHealth(): Promise<NanomqHealthStatus> {
    const port = Number(process.env.NANOMQ_PORT) || 1883;
    const host = '127.0.0.1';
    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const responseTimeMs = Date.now() - startTime;
        socket.destroy();
        resolve({ reachable: true, responseTimeMs });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          reachable: false,
          responseTimeMs: Date.now() - startTime,
          error: `Connection timed out (${timeout}ms)`,
        });
      });

      socket.on('error', (err: Error) => {
        socket.destroy();
        resolve({
          reachable: false,
          responseTimeMs: Date.now() - startTime,
          error: err.message,
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * 获取 InfluxDB Bucket 列表
   *
   * 调用 InfluxDB 2.x 的 /api/v2/buckets 端点，需提供有效的 API Token。
   */
  async listInfluxBuckets(): Promise<InfluxBucket[]> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    const org = process.env.INFLUXDB_ORG || 'ss-org';

    if (!token) {
      this.logger.warn('Cannot list InfluxDB buckets: INFLUXDB_TOKEN is not configured');
      return [];
    }

    try {
      const response = await fetch(`${url}/api/v2/buckets?org=${encodeURIComponent(org)}`, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.error(`Failed to list InfluxDB buckets: HTTP ${response.status}`);
        return [];
      }

      const body = await response.json();
      const buckets = (body as any).buckets || [];
      const storageMap = await this.queryInfluxStorageSizes(buckets);
      const bucketNames = buckets.map((b: any) => b.name || '').filter(Boolean);
      const detailsMap = await this.queryBucketDetails(bucketNames);

      return buckets.map((b: any) => {
        const bucketName = b.name || '';
        const details = detailsMap.get(bucketName);
        return {
          id: b.id || '',
          name: bucketName,
          orgID: b.orgID || '',
          description: b.description || '',
          retentionPeriodHrs: b.retentionRules?.[0]?.everySeconds
            ? Math.floor(b.retentionRules[0].everySeconds / 3600)
            : 0,
          storageBytes: storageMap.get(bucketName) ?? undefined,
          createdAt: b.createdAt || '',
          updatedAt: b.updatedAt || '',
          measurementCount: details?.measurementCount,
          lastWriteAt: details?.lastWriteAt,
          dataPointCount: details?.dataPointCount,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to list InfluxDB buckets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * 查询 InfluxDB 各 Bucket 存储占用
   *
   * InfluxDB 2.x OSS 版本的 _monitoring 桶不包含 storage_shard_disk_size 指标（该指标为
   * Cloud 专属），因此改用文件系统扫描方式：读取 InfluxDB config.yaml 中的 engine-path，
   * 统计每个 bucket 在 engine/data/{bucketID}/ 与 engine/wal/{bucketID}/ 下的磁盘占用。
   *
   * @param buckets InfluxDB API 返回的 bucket 列表（需含 id 与 name）
   */
  private async queryInfluxStorageSizes(buckets: any[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!buckets || buckets.length === 0) return map;

    const engineDir = await this.getInfluxEngineDir();
    if (!engineDir) {
      this.logger.warn('Cannot resolve InfluxDB engine dir; storage sizes unavailable');
      return map;
    }

    const dataDir = path.join(engineDir, 'data');
    const walDir = path.join(engineDir, 'wal');

    for (const bucket of buckets) {
      const bucketName = bucket.name || '';
      const bucketId = bucket.id || '';
      if (!bucketName || !bucketId) continue;

      let size = 0;
      const bucketDataDir = path.join(dataDir, bucketId);
      if (fs.existsSync(bucketDataDir)) {
        size += await this.getDirSize(bucketDataDir);
      }
      const bucketWalDir = path.join(walDir, bucketId);
      if (fs.existsSync(bucketWalDir)) {
        size += await this.getDirSize(bucketWalDir);
      }

      if (size > 0) {
        map.set(bucketName, size);
      }
    }

    return map;
  }

  /**
   * 解析 InfluxDB engine 数据目录的绝对路径
   *
   * 从 base_services 表读取 influxdb 服务的 configPath 与 binaryPath，解析 config.yaml
   * （JSON 格式）中的 engine-path（相对路径，相对于 influxd.exe 所在目录），得到绝对路径。
   *
   * @returns engine 目录绝对路径，解析失败返回 null
   */
  private async getInfluxEngineDir(): Promise<string | null> {
    try {
      const influxService = await this.serviceRepo.findOne({ where: { name: 'influxdb' } });
      if (!influxService?.configPath || !influxService?.binaryPath) return null;

      if (!fs.existsSync(influxService.configPath)) return null;
      const configContent = await fs.promises.readFile(influxService.configPath, 'utf-8');

      let enginePath: string | undefined;
      try {
        const config = JSON.parse(configContent);
        enginePath = config['engine-path'] || config.enginePath;
      } catch {
        // config.yaml 非标准 JSON 时，尝试按行提取 engine-path
        const match = configContent.match(/["']?engine-path["']?\s*[:=]\s*["']([^"']+)["']/);
        enginePath = match?.[1];
      }

      if (!enginePath) return null;
      const influxHome = path.dirname(influxService.binaryPath);
      return path.resolve(influxHome, enginePath);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve InfluxDB engine dir: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * 递归计算目录总大小（字节）
   */
  private async getDirSize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += await this.getDirSize(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          total += stat.size;
        }
      }
    } catch {
      // 静默失败，部分目录可能无访问权限
    }
    return total;
  }

  /**
   * 查询各 Bucket 的监控详情（measurement 数量、最后写入时间、数据点数）
   *
   * 使用 Flux 查询每个 bucket 的 measurement 列表和最后写入时间。
   * 采用并行查询 + 超时保护，避免逐 bucket 查询太慢。
   *
   * @param bucketNames 要查询的 bucket 名称列表
   * @returns Map<bucketName, { measurementCount, lastWriteAt, dataPointCount }>
   */
  private async queryBucketDetails(
    bucketNames: string[],
  ): Promise<Map<string, { measurementCount?: number; lastWriteAt?: string; dataPointCount?: number }>> {
    const map = new Map<string, { measurementCount?: number; lastWriteAt?: string; dataPointCount?: number }>();
    if (bucketNames.length === 0) return map;

    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    const org = process.env.INFLUXDB_ORG || 'ss-org';
    if (!token) return map;

    // 并行查询每个 bucket
    const results = await Promise.all(
      bucketNames.map(async (bucketName) => {
        try {
          const [measurementCount, lastWriteAt] = await Promise.all([
            this.queryMeasurementCount(url, token, org, bucketName),
            this.queryLastWriteTime(url, token, org, bucketName),
          ]);
          return { bucketName, measurementCount, lastWriteAt };
        } catch {
          return { bucketName, measurementCount: undefined, lastWriteAt: undefined };
        }
      }),
    );

    for (const result of results) {
      map.set(result.bucketName, {
        measurementCount: result.measurementCount,
        lastWriteAt: result.lastWriteAt,
      });
    }
    return map;
  }

  /**
   * 查询指定 bucket 的 measurement 数量
   */
  private async queryMeasurementCount(
    url: string,
    token: string,
    org: string,
    bucketName: string,
  ): Promise<number | undefined> {
    // 使用 schema.measurement() 列出所有 measurement，然后计数
    const query = `import "influxdata/influxdb/schema"
schema.measurements(bucket: "${bucketName}")
  |> count(column: "_value")`;

    try {
      const response = await fetch(`${url}/api/v2/query?org=${encodeURIComponent(org)}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/vnd.flux',
          Accept: 'application/csv',
        },
        body: query,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return undefined;
      const csv = await response.text();
      const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) return 0;

      // CSV header 格式：,result,table,_start,_stop,_value
      const header = lines[0].split(',');
      const valueIdx = header.findIndex((h) => h === '_value');
      if (valueIdx < 0) return 0;

      // count() 返回单行汇总结果；若存在多个 table 则累加
      let total = 0;
      let hasValue = false;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const value = parseInt(row[valueIdx], 10);
        if (!Number.isNaN(value)) {
          total += value;
          hasValue = true;
        }
      }
      return hasValue ? total : 0;
    } catch (error) {
      this.logger.warn(
        `queryMeasurementCount failed for ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
  }

  /**
   * 查询指定 bucket 的最后写入时间
   */
  private async queryLastWriteTime(
    url: string,
    token: string,
    org: string,
    bucketName: string,
  ): Promise<string | undefined> {
    const query = `from(bucket: "${bucketName}")
  |> range(start: -30d)
  |> last()
  |> keep(columns: ["_time"])`;

    try {
      const response = await fetch(`${url}/api/v2/query?org=${encodeURIComponent(org)}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/vnd.flux',
          Accept: 'application/csv',
        },
        body: query,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return undefined;
      const csv = await response.text();
      const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) return undefined;

      // 找到 _time 列索引
      const header = lines[0].split(',');
      const timeIndex = header.findIndex((h) => h === '_time');
      if (timeIndex < 0) return undefined;

      // last() 对每个 series 返回一行，需遍历所有行取最大时间
      // （ISO 8601 字符串可按字典序直接比较）
      let latestTime: string | undefined;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const t = row[timeIndex];
        if (t && (!latestTime || t > latestTime)) {
          latestTime = t;
        }
      }
      return latestTime;
    } catch (error) {
      this.logger.warn(
        `queryLastWriteTime failed for ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
  }

  /**
   * 导出 InfluxDB Bucket 数据为 CSV
   *
   * @param bucketName bucket 名称
   * @param start 开始时间（Flux 格式，如 -1d），默认 -1d
   * @param stop 结束时间（Flux 格式，如 now()），默认 now()
   * @returns CSV 字符串（含 BOM 头）
   */
  async exportBucketData(
    bucketName: string,
    start?: string,
    stop?: string,
  ): Promise<string> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    const org = process.env.INFLUXDB_ORG || 'ss-org';

    if (!token) {
      throw new Error('INFLUXDB_TOKEN is not configured');
    }

    const startTime = start || '-1d';
    const stopTime = stop || 'now()';

    const query = `from(bucket: "${bucketName}")
  |> range(start: ${startTime}, stop: ${stopTime})
  |> yield(name: "export")`;

    const response = await fetch(`${url}/api/v2/query?org=${encodeURIComponent(org)}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/vnd.flux',
        Accept: 'application/csv',
      },
      body: query,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`InfluxDB query failed: HTTP ${response.status} - ${errorText}`);
    }

    const csv = await response.text();
    // 添加 UTF-8 BOM 头，确保 Excel 正确识别编码
    return '\uFEFF' + csv;
  }

  /**
   * 将生成的 InfluxDB Token 写入 .env 文件
   * 查找顺序：.env.dev → .env.base → .env
   * 写入规则：替换已有 INFLUXDB_TOKEN=... 行，或追加到文件末尾
   */
  private writeInfluxTokenToEnv(token: string): boolean {
    const projectRoot = this.getProjectRoot();
    const envFiles = [
      path.join(projectRoot, '.env.dev'),
      path.join(projectRoot, '.env.base'),
      path.join(projectRoot, '.env'),
    ];

    for (const envFile of envFiles) {
      if (!fs.existsSync(envFile)) continue;

      try {
        let content = fs.readFileSync(envFile, 'utf-8');

        if (content.includes('INFLUXDB_TOKEN=')) {
          // 替换已有的 token
          content = content.replace(/^INFLUXDB_TOKEN=.*$/m, `INFLUXDB_TOKEN=${token}`);
        } else {
          // 追加到文件末尾
          content = content.trimEnd() + `\nINFLUXDB_TOKEN=${token}\n`;
        }

        fs.writeFileSync(envFile, content, 'utf-8');
        this.logger.log(`Token written to: ${envFile}`);
        return true;
      } catch (err: any) {
        this.logger.warn(`Failed to write token to ${envFile}: ${err.message}`);
      }
    }

    return false;
  }
}
