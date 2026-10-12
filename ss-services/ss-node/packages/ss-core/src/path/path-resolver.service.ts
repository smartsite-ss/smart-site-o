// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

/**
 * 路径解析服务（全局单例）
 *
 * 统一封装项目根目录的获取与相对路径解析，消除 packages 下各服务对 __dirname 上溯的依赖。
 *
 * 项目根来源于 process.env.SS_NODE_ROOT，由 app.module.ts 中的 initProjectRoot()
 * 在应用启动时（ConfigModule.forRoot 之前）设置：
 *
 *   - dev 模式：SS_NODE_ROOT = ss-services/ss-node/
 *   - prod 模式：SS_NODE_ROOT = ss-run/ss/services/ss-node/
 *
 * Fallback：若 SS_NODE_ROOT 未设置（如独立运行的脚本），回退到 process.cwd()。
 *
 * 使用方式：
 *
 *   constructor(private readonly pathResolver: PathResolverService) {}
 *
 *   const dbPath = this.pathResolver.resolveEnv('DATABASE_PATH', './data/ss-node.db');
 *   const projectsDir = this.pathResolver.resolveEnv('PROJECTS_DIR', './data/projects');
 *   const templatesDir = this.pathResolver.resolveEnv('TEMPLATES_DIR', './data/templates');
 */
@Injectable()
export class PathResolverService {
  private readonly logger = new Logger(PathResolverService.name);
  private readonly projectRoot: string;

  constructor() {
    this.projectRoot = this.resolveProjectRoot();
    this.logger.log(`SS_NODE_ROOT resolved to: ${this.projectRoot}`);
  }

  /** 获取项目根目录绝对路径 */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * 将相对路径解析为绝对路径（相对于项目根）
   * - 空路径返回项目根
   * - 绝对路径原样返回
   * - 相对路径相对于项目根解析
   */
  resolve(relativePath: string): string {
    if (!relativePath) return this.projectRoot;
    if (path.isAbsolute(relativePath)) return path.normalize(relativePath);
    return path.resolve(this.projectRoot, relativePath);
  }

  /**
   * 便捷方法：解析环境变量指定的路径
   * @param envVar 环境变量名（如 'PROJECTS_DIR'）
   * @param defaultValue 默认值（环境变量未设置时使用）
   */
  resolveEnv(envVar: string, defaultValue: string): string {
    const configured = process.env[envVar] || defaultValue;
    return this.resolve(configured);
  }

  private resolveProjectRoot(): string {
    if (process.env.SS_NODE_ROOT) {
      return path.normalize(process.env.SS_NODE_ROOT);
    }
    this.logger.warn(
      'SS_NODE_ROOT not set, falling back to process.cwd(). ' +
        'This may cause path resolution errors in dev mode.',
    );
    return path.normalize(process.cwd());
  }
}
