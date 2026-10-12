// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { spawn } from 'child_process';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

/** 重启状态枚举 */
export type RestartStatus = 'idle' | 'pending' | 'restarting' | 'exited' | 'ready' | 'failed';

/** 重启状态信息 */
export interface RestartState {
  status: RestartStatus;
  triggeredBy?: string;
  triggeredAt?: number;
  oldPid?: number;
  newPid?: number;
  errorMessage?: string;
  markerPath: string;
}

/** 运行时环境类型 */
export type RuntimeEnvironment = 'pm2' | 'docker' | 'standalone';

/**
 * 系统重启服务
 *
 * 通过 spawn detached 子进程实现优雅重启：
 * 1. 写入 marker 文件记录重启状态
 * 2. spawn 独立子进程（restarter.js），等待当前进程退出后拉起新服务
 * 3. 当前进程优雅退出
 * 4. 新服务启动时检测 marker 文件，更新状态为 ready
 */
@Injectable()
export class SystemRestartService implements OnModuleInit {
  private readonly logger = new Logger(SystemRestartService.name);
  private isRestarting = false;
  private lastRestartAt = 0;
  private readonly markerPath: string;
  private static readonly RESTART_COOLDOWN_MS = 30000;

  constructor(private readonly pathResolver: PathResolverService) {
    const dataDir = process.env.DATA_DIR || './data';
    this.markerPath = path.resolve(this.resolvePath(dataDir), '.restart-marker.json');
  }

  /**
   * 将相对路径解析为绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/restart/）
   *   .env.dev 中 DATA_DIR 相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中 DATA_DIR=../../data 相对于该目录解析
   *
   * 与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致。
   */
  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  /** 启动时检查 marker 文件，判断是否由重启触发 */
  async onModuleInit(): Promise<void> {
    if (fs.existsSync(this.markerPath)) {
      try {
        const state = this.readMarker();
        if (state && state.status === 'restarting') {
          // 由重启触发的新进程
          state.status = 'ready';
          state.newPid = process.pid;
          this.writeMarker(state);
          this.logger.log(
            `Restart completed: triggeredBy=${state.triggeredBy}, ` +
              `oldPid=${state.oldPid}, newPid=${state.newPid}`,
          );
        } else if (state === null) {
          // readMarker 返回 null 说明文件损坏或无法解析，直接删除
          this.logger.warn('Restart marker file is corrupted, deleting...');
          fs.unlinkSync(this.markerPath);
        }
      } catch (err) {
        this.logger.warn(`Failed to update restart marker: ${(err as Error).message}`);
        // 损坏的 marker 文件直接删除
        try {
          fs.unlinkSync(this.markerPath);
        } catch {
          /* ignore */
        }
      }
    }
  }

  /** 触发系统重启 */
  async triggerRestart(username: string): Promise<RestartState> {
    // 并发防护
    if (this.isRestarting) {
      throw new BadRequestException('重启已在进行中');
    }

    // 冷却期检查
    if (Date.now() - this.lastRestartAt < SystemRestartService.RESTART_COOLDOWN_MS) {
      throw new BadRequestException(
        `重启冷却期内，请等待 ${Math.ceil(
          (SystemRestartService.RESTART_COOLDOWN_MS - (Date.now() - this.lastRestartAt)) / 1000,
        )} 秒后重试`,
      );
    }

    // 运行时环境检测
    const env = this.detectRuntimeEnvironment();
    if (env === 'pm2') {
      throw new BadRequestException('检测到 PM2 环境，请使用命令 "pm2 restart ss-data" 重启服务');
    }
    if (env === 'docker') {
      throw new BadRequestException(
        '检测到 Docker 环境，请使用命令 "docker restart <container>" 重启服务',
      );
    }

    this.isRestarting = true;
    this.lastRestartAt = Date.now();

    const state: RestartState = {
      status: 'restarting',
      triggeredBy: username,
      triggeredAt: Date.now(),
      oldPid: process.pid,
      markerPath: this.markerPath,
    };

    // 1. 写 marker 文件
    this.writeMarker(state);

    // 2. spawn detached 子进程
    try {
      const restarterPath = this.getRestarterScriptPath();
      if (!fs.existsSync(restarterPath)) {
        throw new Error(`Restarter script not found: ${restarterPath}`);
      }

      const child = spawn('node', [restarterPath, String(process.pid)], {
        detached: true,
        stdio: 'ignore',
        env: process.env,
      });
      child.unref();

      this.logger.log(`Restart triggered by ${username}, restarter spawned (PID: ${child.pid})`);
    } catch (err) {
      this.isRestarting = false;
      state.status = 'failed';
      state.errorMessage = `Failed to spawn restarter: ${(err as Error).message}`;
      this.writeMarker(state);
      throw new BadRequestException(state.errorMessage);
    }

    // 3. 延迟 1 秒后退出当前进程（给 HTTP 响应留时间）
    setTimeout(() => {
      this.logger.log('Gracefully exiting current process for restart...');
      process.exit(0);
    }, 1000);

    return state;
  }

  /** 获取重启状态 */
  getRestartStatus(): RestartState {
    if (this.isRestarting) {
      return {
        status: 'restarting',
        markerPath: this.markerPath,
      };
    }

    if (fs.existsSync(this.markerPath)) {
      try {
        const state = this.readMarker();
        if (state) return state;
      } catch {
        /* fall through */
      }
    }

    return { status: 'idle', markerPath: this.markerPath };
  }

  /** 清除 marker 文件（前端确认重启完成后调用） */
  clearMarker(): void {
    try {
      if (fs.existsSync(this.markerPath)) {
        fs.unlinkSync(this.markerPath);
        this.logger.log('Restart marker cleared');
      }
    } catch (err) {
      this.logger.warn(`Failed to clear marker: ${(err as Error).message}`);
    }
  }

  /** 检测当前运行时环境 */
  detectRuntimeEnvironment(): RuntimeEnvironment {
    // PM2 检测：PM2_HOME 环境变量或 pm_id 标识
    if (process.env.PM2_HOME || process.env.pm_id !== undefined) {
      return 'pm2';
    }
    // Docker 检测：/.dockerenv 文件存在
    if (fs.existsSync('/.dockerenv')) {
      return 'docker';
    }
    return 'standalone';
  }

  /** 是否正在重启中 */
  isCurrentlyRestarting(): boolean {
    return this.isRestarting;
  }

  // ==================== 私有方法 ====================

  private getRestarterScriptPath(): string {
    // 编译后：packages/ss-system/dist/restart/restarter.js
    // __dirname 在编译后是 dist/restart/ 或 dist/config/
    const candidates = [
      path.resolve(__dirname, 'restarter.js'), // 同目录
      path.resolve(__dirname, '..', 'restart', 'restarter.js'), // 兄弟目录
      path.resolve(__dirname, '..', '..', 'restart', 'restarter.js'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    // 返回默认值，由调用方处理不存在的情况
    return candidates[0];
  }

  private readMarker(): RestartState | null {
    try {
      const content = fs.readFileSync(this.markerPath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...parsed,
        markerPath: this.markerPath,
      };
    } catch {
      return null;
    }
  }

  private writeMarker(state: Partial<RestartState>): void {
    const fullState: RestartState = {
      status: state.status || 'idle',
      triggeredBy: state.triggeredBy,
      triggeredAt: state.triggeredAt,
      oldPid: state.oldPid,
      newPid: state.newPid,
      errorMessage: state.errorMessage,
      markerPath: this.markerPath,
    };
    fs.writeFileSync(this.markerPath, JSON.stringify(fullState, null, 2), 'utf-8');
  }
}
