// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../auth/permission-codes';

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  /** 角色可见菜单 ID 列表（全量替换） */
  menuIds?: string[];
  sortOrder?: number;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  /** 角色可见菜单 ID 列表（全量替换） */
  menuIds?: string[];
  sortOrder?: number;
}

/** 系统内置角色默认权限码（来自 permission-codes.ts，与设计文档 §3.3 保持一致） */
const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: DEFAULT_ROLE_PERMISSIONS.admin as string[],
  user: DEFAULT_ROLE_PERMISSIONS.user as string[],
  viewer: DEFAULT_ROLE_PERMISSIONS.viewer as string[],
};

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { code } });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.findByCode(dto.code);
    if (existing) throw new ForbiddenException('角色编码已存在');
    const role = this.roleRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description || '',
      permissions: dto.permissions || [],
      menuIds: dto.menuIds || [],
      isSystem: false,
      sortOrder: dto.sortOrder || 0,
    });
    return this.roleRepository.save(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    // 菜单 ID 列表采用全量替换策略：前端提交当前所有勾选项，直接覆盖
    if (dto.menuIds !== undefined) role.menuIds = dto.menuIds;
    if (dto.sortOrder !== undefined) role.sortOrder = dto.sortOrder;
    return this.roleRepository.save(role);
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('系统内置角色不可删除');
    await this.roleRepository.remove(role);
  }

  /**
   * 一次性迁移：为已存在的 user/viewer 系统角色填充默认 menuIds
   *
   * 仅当 menuIds 为空时填充，避免覆盖管理员已手动配置的数据；幂等。
   * 在 onApplicationBootstrap 调用，确保 ss-system 的 syncDefaultMenus 已执行、sys_menus 表已填充。
   * - admin 不处理（filterByMenuIds 会通过 isAdmin bypass 显示全部）
   * - test 等用户自建角色不处理（由管理员在角色编辑页手动配置）
   */
  async migrateSystemRoleMenuIds(): Promise<void> {
    const allMenuIds = await this.queryAllMenuIds();
    if (allMenuIds.length === 0) {
      this.logger.warn('sys_menus 表为空，跳过角色 menuIds 迁移（下次启动再补）');
      return;
    }

    const targets = await this.roleRepository.find({
      where: [
        { code: 'user', isSystem: true },
        { code: 'viewer', isSystem: true },
      ],
    });

    for (const role of targets) {
      if (!role.menuIds || role.menuIds.length === 0) {
        role.menuIds = [...allMenuIds];
        await this.roleRepository.save(role);
        this.logger.log(`已为角色 ${role.code} 填充默认 menuIds（${allMenuIds.length} 项）`);
      }
    }
  }

  /**
   * 每次启动时同步系统角色的默认权限（补充缺失的，不删除已有的）
   *
   * 适用场景：DEFAULT_ROLE_PERMISSIONS 新增权限码后，已部署的系统角色自动补全。
   * 只追加不删除，避免覆盖管理员在角色编辑页手动新增的权限。
   */
  async migrateSystemRolePermissions(): Promise<void> {
    const targets = await this.roleRepository.find({
      where: { isSystem: true },
    });

    let synced = 0;
    for (const role of targets) {
      const defaults = (SYSTEM_ROLE_PERMISSIONS as any)[role.code] as string[] | undefined;
      if (!defaults || defaults.length === 0) continue;

      const existing = new Set(role.permissions || []);
      const missing = defaults.filter((code) => !existing.has(code));
      if (missing.length > 0) {
        role.permissions = [...existing, ...missing];
        await this.roleRepository.save(role);
        synced++;
        this.logger.log(
          `已为角色 ${role.code} 补充 ${missing.length} 个默认权限：${missing.join(', ')}`,
        );
      }
    }
    if (synced > 0) {
      this.logger.log(`系统角色权限迁移完成，共更新 ${synced} 个角色`);
    }
  }

  /**
   * 查询 sys_menus 表全部菜单 ID
   * 使用裸 SQL 避免 import ss-system 的 Menu 实体导致 ss-core → ss-system 循环依赖
   */
  private async queryAllMenuIds(): Promise<string[]> {
    try {
      const rows: { id: string }[] = await this.roleRepository.manager.query(
        'SELECT id FROM sys_menus',
      );
      return rows.map((r) => r.id);
    } catch (err) {
      this.logger.warn(`查询 sys_menus 失败：${(err as Error).message}`);
      return [];
    }
  }

  /** 获取角色的权限码列表 */
  async getPermissions(roleId: string): Promise<string[]> {
    const role = await this.findById(roleId);
    return role.permissions || [];
  }

  /**
   * 首次启动时初始化系统内置角色
   * 如果 roles 表为空，则插入 admin/user/viewer 三个系统角色
   */
  async initSystemRoles(): Promise<void> {
    const count = await this.roleRepository.count();
    if (count > 0) return;

    // 查询当前全部菜单 ID（首次启动时 sys_menus 可能尚未 sync，为空则填 []，由 migrateSystemRoleMenuIds 兜底）
    const allMenuIds = await this.queryAllMenuIds();

    const systemRoles = [
      {
        name: '超级管理员',
        code: 'admin',
        description: '系统内置超级管理员角色，拥有所有权限',
        permissions: SYSTEM_ROLE_PERMISSIONS.admin,
        // admin 通过 filterByMenuIds 的 isAdmin bypass 显示全部，无需配置 menuIds
        menuIds: [],
        isSystem: true,
        sortOrder: 0,
      },
      {
        name: '普通用户',
        code: 'user',
        description: '系统内置普通用户角色，拥有基本操作权限',
        permissions: SYSTEM_ROLE_PERMISSIONS.user,
        // 默认可见全部菜单（与 v7.0 item.roles=['admin','user'] 行为对齐，避免切换后菜单变空）
        menuIds: [...allMenuIds],
        isSystem: true,
        sortOrder: 1,
      },
      {
        name: '观察员',
        code: 'viewer',
        description: '系统内置观察员角色，仅拥有只读权限',
        permissions: SYSTEM_ROLE_PERMISSIONS.viewer,
        menuIds: [...allMenuIds],
        isSystem: true,
        sortOrder: 2,
      },
    ];
    await this.roleRepository.save(systemRoles);
  }
}
