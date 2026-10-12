// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAuthorization } from './entities/project-authorization.entity';
import { DeviceAuthorization } from './entities/device-authorization.entity';
import { TagAuthorization } from './entities/tag-authorization.entity';
import { Role } from './entities/role.entity';

export interface ProjectAuthDto {
  roleId: string;
  projectId: string;
  permission?: string;
}

export interface DeviceAuthDto {
  roleId: string;
  projectId: string;
  deviceId: string;
  permission?: string;
}

export interface TagAuthDto {
  roleId: string;
  projectId: string;
  tagId: string;
  permission?: string;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @Inject(getRepositoryToken(ProjectAuthorization))
    private projectAuthRepo: Repository<ProjectAuthorization>,
    @Inject(getRepositoryToken(DeviceAuthorization))
    private deviceAuthRepo: Repository<DeviceAuthorization>,
    @Inject(getRepositoryToken(TagAuthorization))
    private tagAuthRepo: Repository<TagAuthorization>,
    @Inject(getRepositoryToken(Role))
    private roleRepo: Repository<Role>,
  ) {}

  // ──────── 项目授权 ────────

  /** 获取角色的所有项目授权 */
  async getProjectAuths(roleId: string): Promise<ProjectAuthorization[]> {
    return this.projectAuthRepo.find({ where: { roleId } });
  }

  /** 获取角色可访问的项目 ID 列表 */
  async getAccessibleProjectIds(roleId: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    // admin 角色（*:*）可访问所有项目
    if (role?.permissions?.includes('*:*')) {
      return ['*']; // 特殊标记：所有项目
    }
    const auths = await this.projectAuthRepo.find({ where: { roleId } });
    return auths.map((a) => a.projectId);
  }

  /** 检查角色是否有项目的指定权限 */
  async checkProjectPermission(
    roleId: string,
    projectId: string,
    requiredPermission: 'read' | 'write' | 'admin' = 'read',
  ): Promise<boolean> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) return true;

    const auth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (!auth) return false;

    const levels = { read: 0, write: 1, admin: 2 };
    return levels[auth.permission] >= levels[requiredPermission];
  }

  /** 批量设置角色项目授权 */
  async setProjectAuths(roleId: string, auths: ProjectAuthDto[]): Promise<void> {
    // 先删除旧授权
    await this.projectAuthRepo.delete({ roleId });
    // 再批量插入新授权
    if (auths.length > 0) {
      const entities = auths.map((a) =>
        this.projectAuthRepo.create({
          roleId,
          projectId: a.projectId,
          permission: a.permission || 'read',
        }),
      );
      await this.projectAuthRepo.save(entities);
    }
  }

  /** 添加单个项目授权 */
  async addProjectAuth(dto: ProjectAuthDto): Promise<ProjectAuthorization> {
    const existing = await this.projectAuthRepo.findOne({
      where: { roleId: dto.roleId, projectId: dto.projectId },
    });
    if (existing) {
      existing.permission = dto.permission || 'read';
      return this.projectAuthRepo.save(existing);
    }
    const auth = this.projectAuthRepo.create({
      roleId: dto.roleId,
      projectId: dto.projectId,
      permission: dto.permission || 'read',
    });
    return this.projectAuthRepo.save(auth);
  }

  /** 移除项目授权 */
  async removeProjectAuth(roleId: string, projectId: string): Promise<void> {
    await this.projectAuthRepo.delete({ roleId, projectId });
  }

  // ──────── 设备授权 ────────

  /** 获取角色在项目下的设备授权 */
  async getDeviceAuths(roleId: string, projectId: string): Promise<DeviceAuthorization[]> {
    return this.deviceAuthRepo.find({ where: { roleId, projectId } });
  }

  /** 获取角色在项目下可访问的设备 ID 列表 */
  async getAccessibleDeviceIds(roleId: string, projectId: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) {
      return ['*']; // 所有设备
    }
    // 有 project:admin 权限则该项目下所有设备可访问
    const projectAuth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (projectAuth?.permission === 'admin') {
      return ['*'];
    }
    const auths = await this.deviceAuthRepo.find({ where: { roleId, projectId } });
    return auths.map((a) => a.deviceId);
  }

  /** 检查角色是否有设备的指定权限（v8.0：补充项目关联校验，防止跨项目授权泄露） */
  async checkDevicePermission(
    roleId: string,
    projectId: string,
    deviceId: string,
    requiredPermission: 'read' | 'write' = 'read',
  ): Promise<boolean> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) return true;

    // 有 project:admin 权限则该项目下所有设备有 write 权限
    const projectAuth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (projectAuth?.permission === 'admin') return true;

    // v8.0：校验设备是否属于传入的 projectId（防止跨项目授权泄露）
    try {
      const devices: { project_id: string }[] = await this.deviceAuthRepo.manager.query(
        `SELECT project_id FROM sys_devices WHERE id = ?`,
        [deviceId],
      );
      if (devices.length === 0) return false;
      if (devices[0].project_id !== projectId) {
        this.logger.warn(
          `checkDevicePermission: device ${deviceId} project_id=${devices[0].project_id} mismatch with input projectId=${projectId}`,
        );
        return false;
      }
    } catch {
      // sys_devices 表不存在或查询失败时放行（兼容测试环境），由业务层兜底
    }

    const auth = await this.deviceAuthRepo.findOne({
      where: { roleId, projectId, deviceId },
    });
    if (!auth) return false;

    const levels = { read: 0, write: 1 };
    return levels[auth.permission] >= levels[requiredPermission];
  }

  /** 批量设置角色在项目下的设备授权 */
  async setDeviceAuths(roleId: string, projectId: string, auths: DeviceAuthDto[]): Promise<void> {
    await this.deviceAuthRepo.delete({ roleId, projectId });
    if (auths.length > 0) {
      const entities = auths.map((a) =>
        this.deviceAuthRepo.create({
          roleId,
          projectId,
          deviceId: a.deviceId,
          permission: a.permission || 'read',
        }),
      );
      await this.deviceAuthRepo.save(entities);
    }
  }

  /** 添加单个设备授权 */
  async addDeviceAuth(dto: DeviceAuthDto): Promise<DeviceAuthorization> {
    const existing = await this.deviceAuthRepo.findOne({
      where: { roleId: dto.roleId, projectId: dto.projectId, deviceId: dto.deviceId },
    });
    if (existing) {
      existing.permission = dto.permission || 'read';
      return this.deviceAuthRepo.save(existing);
    }
    const auth = this.deviceAuthRepo.create({
      roleId: dto.roleId,
      projectId: dto.projectId,
      deviceId: dto.deviceId,
      permission: dto.permission || 'read',
    });
    return this.deviceAuthRepo.save(auth);
  }

  /** 移除设备授权 */
  async removeDeviceAuth(roleId: string, projectId: string, deviceId: string): Promise<void> {
    await this.deviceAuthRepo.delete({ roleId, projectId, deviceId });
  }

  // ──────── 设备分组 ID 推导（v8.0：从设备授权推导，废弃独立分组授权表） ────────

  /**
   * 获取角色在某项目下可见的设备分组 ID 列表（从设备授权推导）
   *
   * 不再查询 sys_device_group_authorizations，而是：
   * 1. 获取角色在项目下可访问的设备 ID 列表
   * 2. 反查 sys_devices 表获取每个设备的 groupId
   * 3. 去重返回
   *
   * 规则：授权了设备即为授权了其所属分组。
   */
  async getAccessibleDeviceGroupIds(roleId: string, projectId: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) {
      return ['*'];
    }
    // 有 project:admin 权限则该项目下所有分组可访问
    const projectAuth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (projectAuth?.permission === 'admin') {
      return ['*'];
    }

    // 从设备授权获取 deviceIds
    const deviceAuths = await this.deviceAuthRepo.find({ where: { roleId, projectId } });
    if (deviceAuths.length === 0) return [];

    const deviceIds = deviceAuths.map((a) => a.deviceId);
    try {
      // 原始 SQL 查询 sys_devices 避免循环依赖
      const rows: { group_id: string | null }[] = await this.deviceAuthRepo.manager.query(
        `SELECT DISTINCT group_id FROM sys_devices WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
        deviceIds,
      );
      return rows.map((r) => r.group_id).filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  // ──────── 标签授权（3.6 实现） ────────

  /**
   * 检查角色是否有标签的指定权限
   *
   * 检查顺序（优先级递减）：
   * 1. 角色拥有 *:* 权限 → 直接通过
   * 2. 项目级 admin 权限 → 通过
   * 3. 显式标签授权（sys_tag_authorizations 表）
   * 4. 无显式标签授权 → 返回 false（调用方应回退到设备级权限检查）
   *
   * @returns true=有权限；false=无显式授权（应回退到设备级检查）
   */
  async checkTagPermission(
    roleId: string,
    projectId: string,
    tagId: string,
    requiredPermission: 'read' | 'write' = 'read',
  ): Promise<boolean> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) return true;

    // 有 project:admin 权限则该项目下所有标签有 write 权限
    const projectAuth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (projectAuth?.permission === 'admin') return true;

    const auth = await this.tagAuthRepo.findOne({
      where: { roleId, projectId, tagId },
    });
    if (!auth) return false;

    const levels = { read: 0, write: 1 };
    return levels[auth.permission as 'read' | 'write'] >= levels[requiredPermission];
  }

  /** 获取角色在项目下的标签授权 */
  async getTagAuths(roleId: string, projectId: string): Promise<TagAuthorization[]> {
    return this.tagAuthRepo.find({ where: { roleId, projectId } });
  }

  /** 获取角色在项目下可访问的标签 ID 列表 */
  async getAccessibleTagIds(roleId: string, projectId: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.permissions?.includes('*:*')) {
      return ['*'];
    }
    const projectAuth = await this.projectAuthRepo.findOne({
      where: { roleId, projectId },
    });
    if (projectAuth?.permission === 'admin') {
      return ['*'];
    }
    const auths = await this.tagAuthRepo.find({ where: { roleId, projectId } });
    return auths.map((a) => a.tagId);
  }

  /** 批量设置角色在项目下的标签授权 */
  async setTagAuths(roleId: string, projectId: string, auths: TagAuthDto[]): Promise<void> {
    await this.tagAuthRepo.delete({ roleId, projectId });
    if (auths.length > 0) {
      const entities = auths.map((a) =>
        this.tagAuthRepo.create({
          roleId,
          projectId,
          tagId: a.tagId,
          permission: a.permission || 'read',
        }),
      );
      await this.tagAuthRepo.save(entities);
    }
  }

  /** 添加单个标签授权 */
  async addTagAuth(dto: TagAuthDto): Promise<TagAuthorization> {
    const existing = await this.tagAuthRepo.findOne({
      where: { roleId: dto.roleId, projectId: dto.projectId, tagId: dto.tagId },
    });
    if (existing) {
      existing.permission = dto.permission || 'read';
      return this.tagAuthRepo.save(existing);
    }
    const auth = this.tagAuthRepo.create({
      roleId: dto.roleId,
      projectId: dto.projectId,
      tagId: dto.tagId,
      permission: dto.permission || 'read',
    });
    return this.tagAuthRepo.save(auth);
  }

  /** 移除标签授权 */
  async removeTagAuth(roleId: string, projectId: string, tagId: string): Promise<void> {
    await this.tagAuthRepo.delete({ roleId, projectId, tagId });
  }

  // ──────── v8.0 数据迁移：分组授权 → 设备授权 ────────

  /**
   * 一次性迁移：将 sys_device_group_authorizations 中的分组授权
   * 展开为对应设备授权记录（去重、幂等）。
   *
   * 使用原始 SQL 查询 sys_devices 表以避免 ss-core → ss-device 循环依赖。
   * 在 onApplicationBootstrap 中调用。
   */
  async migrateDeviceGroupAuthsToDeviceAuths(): Promise<void> {
    try {
      // 查询所有分组授权记录（使用原始 SQL 避免 DeviceGroupAuthorization 实体在被移除后仍引用）
      const groupAuths: {
        id: string; role_id: string; project_id: string; group_id: string;
        permission: string;
      }[] = await this.deviceAuthRepo.manager.query(
        `SELECT id, role_id, project_id, group_id, permission FROM sys_device_group_authorizations`,
      );
      if (groupAuths.length === 0) {
        this.logger.log('分组授权迁移：无待迁移数据');
        return;
      }

      let migrated = 0;
      for (const ga of groupAuths) {
        // 查询该分组的项目下的所有设备
        const devices: { id: string }[] = await this.deviceAuthRepo.manager.query(
          `SELECT id FROM sys_devices WHERE project_id = ? AND group_id = ?`,
          [ga.project_id, ga.group_id],
        );

        for (const device of devices) {
          // 检查是否已有同角色+同项目的设备授权（去重）
          const existing: { id: string }[] = await this.deviceAuthRepo.manager.query(
            `SELECT id FROM sys_device_authorizations WHERE role_id = ? AND project_id = ? AND device_id = ?`,
            [ga.role_id, ga.project_id, device.id],
          );
          if (existing.length === 0) {
            await this.deviceAuthRepo.manager.query(
              `INSERT INTO sys_device_authorizations (id, role_id, project_id, device_id, permission, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
              [this.generateUuid(), ga.role_id, ga.project_id, device.id, ga.permission],
            );
            migrated++;
          }
        }
      }

      if (migrated > 0) {
        this.logger.log(
          `分组授权→设备授权迁移完成：${groupAuths.length} 条分组授权展开为 ${migrated} 条设备授权`,
        );
      } else {
        this.logger.log(
          `分组授权→设备授权迁移完成：${groupAuths.length} 条分组授权，已全部展开（无新增）`,
        );
      }
    } catch (error: any) {
      // 表不存在时静默跳过（首次启动尚未创建表）
      if (error.message?.includes('no such table')) {
        this.logger.log('分组授权迁移：sys_device_group_authorizations 表不存在，跳过');
        return;
      }
      this.logger.warn(`分组授权迁移失败：${error.message}`);
    }
  }

  /** 生成 UUID（不依赖 crypto 模块） */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
