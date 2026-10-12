// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityTarget, Repository } from 'typeorm';
import { ProjectDatabaseService, ProjectDbMode } from '@ss-node/ss-core';

/**
 * 项目级仓储工厂服务
 *
 * 根据 PROJECT_DB_MODE 自动选择数据源：
 * - unified: 返回全局 TypeORM Repository（通过 NestJS DI 注入）
 * - isolated: 从项目级 system.db DataSource 动态创建 Repository
 *
 * 使用方式（isolated 模式）：
 * ```
 * const repo = this.repoService.getRepository(Device, projectName);
 * const devices = await repo.find({ where: { projectId } });
 * ```
 *
 * 兼容 unified 模式（无需修改现有代码）：
 * ```
 * const repo = this.repoService.getRepositoryOrFallback(Device, projectName, this.deviceRepo);
 * ```
 */
@Injectable()
export class ProjectRepositoryService {
  private readonly logger = new Logger(ProjectRepositoryService.name);

  /** 全局 DataSource（unified 模式使用） */
  private globalDataSource: DataSource | null = null;

  constructor(private readonly projectDbService: ProjectDatabaseService) {}

  /**
   * 设置全局 DataSource 引用（由 AppModule 初始化时注入）
   */
  setGlobalDataSource(ds: DataSource): void {
    this.globalDataSource = ds;
  }

  /**
   * 获取当前数据库模式
   */
  getMode(): ProjectDbMode {
    return this.projectDbService.getMode();
  }

  /**
   * 获取指定项目的实体 Repository
   *
   * @param entity       实体类
   * @param projectName  项目名称
   * @returns TypeORM Repository
   */
  getRepository<Entity extends object>(
    entity: EntityTarget<Entity>,
    projectName: string,
  ): Repository<Entity> {
    if (this.projectDbService.getMode() === 'isolated') {
      const systemDs = this.projectDbService.getLoadedSystemDb(projectName);
      if (!systemDs) {
        throw new Error(
          `[ProjectRepositoryService] Project "${projectName}" system.db not loaded. ` +
            `Call ProjectDatabaseService.loadProjectDatabases() first.`,
        );
      }
      return systemDs.getRepository(entity);
    }

    // unified 模式：使用全局 DataSource
    if (!this.globalDataSource) {
      throw new Error(
        '[ProjectRepositoryService] Global DataSource not set. ' +
          'Call setGlobalDataSource() during app initialization.',
      );
    }
    return this.globalDataSource.getRepository(entity);
  }

  /**
   * 获取 Repository，支持 unified 模式回退
   *
   * 在 unified 模式下，直接返回传入的 fallbackRepo（避免额外查询全局 DataSource）
   * 在 isolated 模式下，从项目级 DataSource 创建
   *
   * @param entity       实体类
   * @param projectName  项目名称
   * @param fallbackRepo unified 模式下的 Repository 实例
   * @returns TypeORM Repository
   */
  getRepositoryOrFallback<Entity extends object>(
    entity: EntityTarget<Entity>,
    projectName: string,
    fallbackRepo: Repository<Entity>,
  ): Repository<Entity> {
    if (this.projectDbService.getMode() === 'isolated') {
      return this.getRepository(entity, projectName);
    }
    return fallbackRepo;
  }

  /**
   * 异步加载项目数据库（如果尚未加载）
   * 通常在项目首次访问时调用
   *
   * @param projectName 项目名称
   */
  async ensureProjectLoaded(projectName: string): Promise<void> {
    if (this.projectDbService.getMode() !== 'isolated') return;

    const conn = this.projectDbService.getConnection(projectName);
    if (!conn) {
      await this.projectDbService.loadProjectDatabases(projectName);
    }
  }

  /**
   * 获取 system.db 的原始 DataSource（用于直接查询）
   */
  getSystemDataSource(projectName: string): DataSource {
    if (this.projectDbService.getMode() === 'isolated') {
      const ds = this.projectDbService.getLoadedSystemDb(projectName);
      if (!ds) {
        throw new Error(
          `[ProjectRepositoryService] Project "${projectName}" system.db not loaded.`,
        );
      }
      return ds;
    }

    if (!this.globalDataSource) {
      throw new Error('[ProjectRepositoryService] Global DataSource not set.');
    }
    return this.globalDataSource;
  }
}
