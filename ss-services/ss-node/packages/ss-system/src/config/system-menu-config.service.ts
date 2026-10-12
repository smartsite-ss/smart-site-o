// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu, MenuButton } from '../entities/system.entity';

/**
 * 系统菜单配置服务（v7.1 — DB 唯一数据源方案）
 *
 * 菜单数据仅存储于 sys_menus 表，代码内置 DEFAULT_SYSTEM_MENU 仅作为
 * 首次初始化与版本同步的种子数据，不再作为运行时 fallback。
 * 启动时 syncDefaultMenus() 会补增缺失项并同步已有项字段，
 * 确保代码默认值变更能自动反映到 DB。
 */

/** 系统菜单项接口（与前端对齐） */
export interface SystemMenuItem {
  id: string;
  labelKey: string;
  path: string;
  icon: string;
  children?: SystemMenuItem[];
  roles?: string[] | null;
  showInTopbar?: boolean;
  showInSidebar?: boolean;
  isDetail?: boolean;
  order?: number;
  /** 子系统标识，NULL/undefined 表示全局菜单 */
  subsystem?: string | null;
}

/** 菜单按钮接口 */
export interface SystemMenuButton {
  id: string;
  menuId: string;
  labelKey: string;
  permissionCode: string;
  sortOrder: number;
}

/** 代码内置默认菜单（DB 不可用时使用） */
const DEFAULT_SYSTEM_MENU: SystemMenuItem[] = [
  { id: 'overview', labelKey: 'system.nav.overview', path: '', icon: 'overview', order: 0 },
  {
    id: 'projects',
    labelKey: 'system.nav.projects',
    path: '/projects',
    icon: 'projects',
    roles: ['admin'],
    order: 10,
    children: [
      {
        id: 'project-list',
        labelKey: 'system.nav.projectList',
        path: '/projects',
        icon: 'projects',
        roles: ['admin'],
      },
      {
        id: 'page-management',
        labelKey: 'system.nav.pageManagement',
        path: '/page-management',
        icon: 'page-management',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'devices',
    labelKey: 'system.nav.devices',
    path: '/devices',
    icon: 'devices',
    roles: ['admin', 'user'],
    order: 20,
    children: [
      {
        id: 'device-list',
        labelKey: 'system.nav.devices',
        path: '/devices',
        icon: 'devices',
        roles: ['admin', 'user'],
      },
      {
        id: 'device-monitor',
        labelKey: 'system.nav.deviceMonitor',
        path: '/device-monitor',
        icon: 'device-monitor',
        roles: ['admin', 'user'],
      },
      {
        id: 'real-time-trend',
        labelKey: 'system.nav.realTimeTrend',
        path: '/real-time-trend',
        icon: 'real-time-trend',
        roles: ['admin', 'user'],
      },
    ],
  },
  {
    id: 'plugins',
    labelKey: 'system.nav.plugins',
    path: '/plugins',
    icon: 'plugins',
    roles: ['admin', 'user'],
    order: 30,
  },
  {
    id: 'alarms',
    labelKey: 'system.nav.alarms',
    path: '/alarms',
    icon: 'alarms',
    order: 40,
    children: [
      {
        id: 'realtime-alarms',
        labelKey: 'system.nav.realtimeAlarms',
        path: '/realtime-alarms',
        icon: 'realtime-alarms',
      },
      {
        id: 'history-alarms',
        labelKey: 'system.nav.historyAlarms',
        path: '/alarms',
        icon: 'alarms',
      },
    ],
  },
  {
    id: 'scripts',
    labelKey: 'system.nav.scripts',
    path: '/scripts',
    icon: 'scripts',
    roles: ['admin', 'user'],
    order: 50,
  },
  {
    id: 'report-management',
    labelKey: 'system.nav.reportManagement',
    path: '/reports',
    icon: 'report-management',
    roles: ['admin', 'user'],
    order: 60,
    children: [
      { id: 'reports', labelKey: 'system.nav.reports', path: '/reports', icon: 'reports' },
      {
        id: 'control-logs',
        labelKey: 'system.nav.controlLogs',
        path: '/control-logs',
        icon: 'system-logs',
        roles: ['admin', 'user'],
      },
      {
        id: 'historical-trend',
        labelKey: 'system.nav.historicalTrend',
        path: '/historical-trend',
        icon: 'trend',
        roles: ['admin', 'user', 'viewer'],
      },
    ],
  },
  {
    id: 'templates',
    labelKey: 'system.nav.deviceTemplates',
    path: '/templates',
    icon: 'templates',
    roles: ['admin', 'user'],
    order: 70,
  },
  {
    id: 'canvas-templates',
    labelKey: 'system.nav.canvasTemplates',
    path: '/canvas-templates',
    icon: 'templates',
    roles: ['admin'],
    order: 71,
  },
  {
    id: 'settings',
    labelKey: 'system.nav.settings',
    path: '/settings',
    icon: 'settings',
    roles: ['admin'],
    order: 100,
    children: [
      {
        id: 'settings-general',
        labelKey: 'system.settings.title',
        path: '/settings',
        icon: 'settings-sub',
        roles: ['admin'],
      },
      {
        id: 'users',
        labelKey: 'system.nav.users',
        path: '/users',
        icon: 'users',
        roles: ['admin'],
      },
      {
        id: 'roles',
        labelKey: 'system.nav.roles',
        path: '/roles',
        icon: 'roles',
        roles: ['admin'],
      },
      {
        id: 'positions',
        labelKey: 'system.nav.positions',
        path: '/positions',
        icon: 'positions',
        roles: ['admin'],
      },
      { id: 'dict', labelKey: 'system.nav.dict', path: '/dict', icon: 'dict', roles: ['admin'] },
      { id: 'knowledge', labelKey: 'system.nav.knowledge', path: '/knowledge', icon: 'knowledge' },
      { id: 'gallery', labelKey: 'system.nav.gallery', path: '/gallery', icon: 'gallery', roles: ['admin'] },
    ],
  },
  {
    id: 'ops',
    labelKey: 'system.nav.systemOps',
    path: '/info',
    icon: 'ops',
    roles: ['admin'],
    order: 110,
    children: [
      { id: 'info', labelKey: 'system.settings.systemInfo', path: '/info', icon: 'info' },
      { id: 'health', labelKey: 'system.nav.health', path: '/health', icon: 'health' },
      {
        id: 'database-ops',
        labelKey: 'system.nav.databaseOps',
        path: '/database-ops',
        icon: 'database',
        roles: ['admin'],
      },
      {
        id: 'base-services',
        labelKey: 'system.nav.baseServices',
        path: '/base-services',
        icon: 'base-services',
        roles: ['admin'],
      },
      {
        id: 'ws-monitor',
        labelKey: 'system.nav.wsMonitor',
        path: '/ws-monitor',
        icon: 'ws-monitor',
        roles: ['admin'],
      },
      {
        id: 'ai-config',
        labelKey: 'system.nav.aiConfig',
        path: '/ai-config',
        icon: 'settings',
        roles: ['admin'],
      },
      {
        id: 'terminal',
        labelKey: 'system.nav.terminal',
        path: '/terminal',
        icon: 'terminal',
        roles: ['admin'],
      },
      {
        id: 'menus',
        labelKey: 'system.nav.menus',
        path: '/menus',
        icon: 'menu-config',
        roles: ['admin'],
      },
      {
        id: 'notification-channels',
        labelKey: 'system.nav.notificationChannels',
        path: '/notification-channels',
        icon: 'notification',
        roles: ['admin'],
      },
      {
        id: 'timer-config',
        labelKey: 'system.nav.timerConfig',
        path: '/timer-config',
        icon: 'timer',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'system-logs',
    labelKey: 'system.nav.systemLogs',
    path: '/operation-logs',
    icon: 'system-logs',
    roles: ['admin'],
    order: 999,
    children: [
      {
        id: 'operation-logs',
        labelKey: 'system.nav.operationLogs',
        path: '/operation-logs',
        icon: 'system-logs',
        roles: ['admin'],
      },
      {
        id: 'security-audit-logs',
        labelKey: 'system.nav.securityAuditLogs',
        path: '/security-audit-logs',
        icon: 'security-audit',
        roles: ['admin'],
      },
      {
        id: 'permission-audit-logs',
        labelKey: 'system.nav.permissionAuditLogs',
        path: '/permission-audit-logs',
        icon: 'permission-audit',
        roles: ['admin'],
      },
      {
        id: 'error-logs',
        labelKey: 'system.nav.errorLogs',
        path: '/error-logs',
        icon: 'error-log',
        roles: ['admin'],
      },
      {
        id: 'event-logs',
        labelKey: 'system.nav.eventLogs',
        path: '/event-logs',
        icon: 'system-logs',
        roles: ['admin'],
      },
      {
        id: 'app-logs',
        labelKey: 'system.nav.appLogs',
        path: '/app-logs',
        icon: 'app-log',
        roles: ['admin'],
      },
    ],
  },
];

/** 默认按钮权限（按菜单关联） */
const DEFAULT_MENU_BUTTONS: SystemMenuButton[] = [
  // 设备管理
  {
    id: 'btn-device-create',
    menuId: 'devices',
    labelKey: 'system.btn.create',
    permissionCode: 'device:create',
    sortOrder: 0,
  },
  {
    id: 'btn-device-edit',
    menuId: 'devices',
    labelKey: 'system.btn.edit',
    permissionCode: 'device:edit',
    sortOrder: 10,
  },
  {
    id: 'btn-device-delete',
    menuId: 'devices',
    labelKey: 'system.btn.delete',
    permissionCode: 'device:delete',
    sortOrder: 20,
  },
  {
    id: 'btn-device-import',
    menuId: 'devices',
    labelKey: 'system.btn.import',
    permissionCode: 'device:import',
    sortOrder: 30,
  },
  {
    id: 'btn-device-export',
    menuId: 'devices',
    labelKey: 'system.btn.export',
    permissionCode: 'device:export',
    sortOrder: 40,
  },
  // 采集管理
  {
    id: 'btn-plugin-create',
    menuId: 'plugins',
    labelKey: 'system.btn.create',
    permissionCode: 'plugin:create',
    sortOrder: 0,
  },
  {
    id: 'btn-plugin-edit',
    menuId: 'plugins',
    labelKey: 'system.btn.edit',
    permissionCode: 'plugin:edit',
    sortOrder: 10,
  },
  {
    id: 'btn-plugin-delete',
    menuId: 'plugins',
    labelKey: 'system.btn.delete',
    permissionCode: 'plugin:delete',
    sortOrder: 20,
  },
  // 报警中心
  {
    id: 'btn-alarm-ack',
    menuId: 'alarms',
    labelKey: 'system.btn.ack',
    permissionCode: 'alarm:ack',
    sortOrder: 0,
  },
  {
    id: 'btn-alarm-config',
    menuId: 'alarms',
    labelKey: 'system.btn.configure',
    permissionCode: 'alarm:configure',
    sortOrder: 10,
  },
  // 脚本管理
  {
    id: 'btn-script-create',
    menuId: 'scripts',
    labelKey: 'system.btn.create',
    permissionCode: 'script:create',
    sortOrder: 0,
  },
  {
    id: 'btn-script-edit',
    menuId: 'scripts',
    labelKey: 'system.btn.edit',
    permissionCode: 'script:edit',
    sortOrder: 10,
  },
  {
    id: 'btn-script-delete',
    menuId: 'scripts',
    labelKey: 'system.btn.delete',
    permissionCode: 'script:delete',
    sortOrder: 20,
  },
  {
    id: 'btn-script-exec',
    menuId: 'scripts',
    labelKey: 'system.btn.execute',
    permissionCode: 'script:execute',
    sortOrder: 30,
  },
  // 项目管理
  {
    id: 'btn-project-create',
    menuId: 'projects',
    labelKey: 'system.btn.create',
    permissionCode: 'project:create',
    sortOrder: 0,
  },
  {
    id: 'btn-project-edit',
    menuId: 'projects',
    labelKey: 'system.btn.edit',
    permissionCode: 'project:edit',
    sortOrder: 10,
  },
  {
    id: 'btn-project-delete',
    menuId: 'projects',
    labelKey: 'system.btn.delete',
    permissionCode: 'project:delete',
    sortOrder: 20,
  },
  // 模板管理
  {
    id: 'btn-tmpl-create',
    menuId: 'templates',
    labelKey: 'system.btn.create',
    permissionCode: 'template:create',
    sortOrder: 0,
  },
  {
    id: 'btn-tmpl-edit',
    menuId: 'templates',
    labelKey: 'system.btn.edit',
    permissionCode: 'template:edit',
    sortOrder: 10,
  },
  {
    id: 'btn-tmpl-delete',
    menuId: 'templates',
    labelKey: 'system.btn.delete',
    permissionCode: 'template:delete',
    sortOrder: 20,
  },
  {
    id: 'btn-tmpl-import',
    menuId: 'templates',
    labelKey: 'system.btn.import',
    permissionCode: 'template:import',
    sortOrder: 30,
  },
  {
    id: 'btn-tmpl-export',
    menuId: 'templates',
    labelKey: 'system.btn.export',
    permissionCode: 'template:export',
    sortOrder: 40,
  },
];

@Injectable()
export class SystemMenuConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemMenuConfigService.name);

  constructor(
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
    @InjectRepository(MenuButton)
    private readonly buttonRepo: Repository<MenuButton>,
  ) {}

  async onModuleInit() {
    await this.syncDefaultMenus();
    await this.syncDefaultButtons();
  }

  /**
   * 获取系统菜单（树形结构）— DB 唯一数据源
   * @param subsystem 可选子系统过滤，优先级：参数 > env.SUBSYSTEM > 不过滤
   * @returns DB 中的菜单树；DB 为空时返回空数组（由 syncDefaultMenus 保证启动时已写入）
   */
  async getMenu(subsystem?: string): Promise<SystemMenuItem[]> {
    const currentSubsystem = subsystem || process.env.SUBSYSTEM || undefined;
    try {
      const qb = this.menuRepo
        .createQueryBuilder('menu')
        .where('menu.isDetail = :isDetail', { isDetail: 0 });
      if (currentSubsystem) {
        qb.andWhere('(menu.subsystem IS NULL OR menu.subsystem = :subsystem)', {
          subsystem: currentSubsystem,
        });
      }
      const rows = await qb.orderBy('menu.sortOrder', 'ASC').getMany();
      return this.buildTree(rows);
    } catch (e: any) {
      this.logger.warn(`Failed to load menu from DB: ${e.message}`);
      return [];
    }
  }

  /**
   * 更新系统菜单（接收树形结构，扁平化后 upsert 到 menus 表）
   * 同时删除 menus 表中不在新数据里的记录
   */
  async updateMenu(items: SystemMenuItem[]): Promise<void> {
    const flatRows = this.flattenTree(items);
    const ids = new Set(flatRows.map((r) => r.id));

    // 不使用 manager.transaction()：sqlite3 驱动在 TypeORM 事务包装下存在
    // TransactionNotStartedError 已知问题（事务未启动即提交/回滚）。
    // delete + upsert 模式本身是幂等的，SQLite 写操作天然串行，无需显式事务。

    // 删除不在新数据中的旧记录
    await this.menuRepo
      .createQueryBuilder()
      .delete()
      .from(Menu)
      .where('id NOT IN (:...ids)', { ids: ids.size > 0 ? [...ids] : ['__none__'] })
      .execute();

    // Upsert 每条记录
    for (const row of flatRows) {
      await this.menuRepo
        .createQueryBuilder()
        .insert()
        .into(Menu)
        .values(row)
        .orUpdate([
          'parent_id',
          'label_key',
          'path',
          'icon',
          'roles',
          'sort_order',
          'is_detail',
          'subsystem',
          'updated_at',
        ])
        .execute();
    }

    this.logger.log(`Menu updated: ${flatRows.length} items`);
  }

  /** 将扁平 rows 组装成树形结构 */
  private buildTree(rows: Menu[]): SystemMenuItem[] {
    const map = new Map<string, SystemMenuItem>();
    const roots: SystemMenuItem[] = [];

    // 第一遍：创建所有节点
    for (const row of rows) {
      const item: SystemMenuItem = {
        id: row.id,
        labelKey: row.labelKey,
        path: row.path,
        icon: row.icon,
        roles: row.roles,
        order: row.sortOrder,
        subsystem: row.subsystem,
      };
      map.set(row.id, item);
    }

    // 第二遍：建立父子关系
    for (const row of rows) {
      const item = map.get(row.id)!;
      if (row.parentId && map.has(row.parentId)) {
        const parent = map.get(row.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(item);
      } else {
        roots.push(item);
      }
    }

    // 按 order / sortOrder 排序以保障显示顺序
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const item of map.values()) {
      if (item.children && item.children.length > 1) {
        item.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    }

    return roots;
  }

  /** 将树形菜单扁平化为 DB rows */
  private flattenTree(items: SystemMenuItem[], parentId: string | null = null): Partial<Menu>[] {
    const result: Partial<Menu>[] = [];
    for (const item of items) {
      result.push({
        id: item.id,
        parentId,
        labelKey: item.labelKey,
        path: item.path,
        icon: item.icon,
        roles: item.roles || null,
        sortOrder: item.order ?? 0,
        isDetail: item.isDetail ? 1 : 0,
        subsystem: item.subsystem || null,
        updatedAt: new Date(),
      });
      if (item.children && item.children.length > 0) {
        result.push(...this.flattenTree(item.children, item.id));
      }
    }
    return result;
  }

  // ──────── 按钮权限 ────────

  /**
   * 获取所有菜单按钮 — DB 唯一数据源
   * @returns DB 中的按钮列表；DB 为空时返回空数组
   */
  async getMenuButtons(): Promise<SystemMenuButton[]> {
    try {
      const rows = await this.buttonRepo.find({ order: { sortOrder: 'ASC' } });
      return rows.map((r) => ({
        id: r.id,
        menuId: r.menuId,
        labelKey: r.labelKey,
        permissionCode: r.permissionCode,
        sortOrder: r.sortOrder,
      }));
    } catch (e: any) {
      this.logger.warn(`Failed to load menu buttons from DB: ${e.message}`);
      return [];
    }
  }

  /** 获取指定菜单的按钮 */
  async getMenuButtonsByMenu(menuId: string): Promise<SystemMenuButton[]> {
    const all = await this.getMenuButtons();
    return all.filter((b) => b.menuId === menuId);
  }

  /** 更新菜单按钮 */
  async updateMenuButtons(buttons: SystemMenuButton[]): Promise<void> {
    const ids = new Set(buttons.map((b) => b.id));

    // 不使用 manager.transaction()：sqlite3 驱动在 TypeORM 事务包装下存在
    // TransactionNotStartedError 已知问题（事务未启动即提交/回滚）。
    // delete + upsert 模式本身是幂等的，SQLite 写操作天然串行，无需显式事务。

    await this.buttonRepo
      .createQueryBuilder()
      .delete()
      .from(MenuButton)
      .where('id NOT IN (:...ids)', { ids: ids.size > 0 ? [...ids] : ['__none__'] })
      .execute();

    for (const btn of buttons) {
      await this.buttonRepo
        .createQueryBuilder()
        .insert()
        .into(MenuButton)
        .values({
          id: btn.id,
          menuId: btn.menuId,
          labelKey: btn.labelKey,
          permissionCode: btn.permissionCode,
          sortOrder: btn.sortOrder,
        })
        .orUpdate(['menu_id', 'label_key', 'permission_code', 'sort_order', 'updated_at'])
        .execute();
    }

    this.logger.log(`Menu buttons updated: ${buttons.length} items`);
  }

  /**
   * 同步默认菜单到 DB（启动时调用）
   * - 空表：全量写入 DEFAULT_SYSTEM_MENU
   * - 非空表：补增缺失项 + 更新已有项字段（parent_id、label_key、path、icon、roles、is_detail、subsystem）
   *   确保 DB 数据始终与代码默认值保持一致，避免旧数据脱节。
   *   注意：sort_order 属于用户运行时自定义数据（菜单管理页可调整），不参与同步，
   *   仅新插入项使用代码默认 order 作为初始值，避免重启后覆盖用户调整的顺序。
   */
  async syncDefaultMenus(): Promise<void> {
    try {
      const count = await this.menuRepo.count();
      if (count === 0) {
        // 空表：全量写入
        await this.updateMenu(DEFAULT_SYSTEM_MENU);
        this.logger.log('Default menus initialized (empty DB)');
      } else {
        // 非空表：清理重命名/废弃的旧菜单项
        await this.cleanupStaleMenuIds();
        // 补增 + 同步字段
        const synced = await this.upsertDefaultMenus(DEFAULT_SYSTEM_MENU);
        if (synced > 0) {
          this.logger.log(`Menus synced: ${synced} items inserted/updated`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to sync default menus: ${e.message}`);
    }
  }

  /**
   * 清理已知的重命名/废弃的旧菜单项 ID（启动同步时调用）
   * 避免旧 ID 残留导致 i18n key 不匹配（如 audit-logs → operation-logs）
   */
  private async cleanupStaleMenuIds(): Promise<void> {
    const staleIds = [
      'audit-logs', // 已重命名为 operation-logs
      'system-config', // 已废弃：与 系统管理→系统设置 重复，改为 settings-general
    ];
    for (const id of staleIds) {
      const existing = await this.menuRepo.findOne({ where: { id } });
      if (existing) {
        // 级联删除子节点
        await this.menuRepo.delete({ parentId: id } as any);
        // 删除关联按钮
        await this.buttonRepo.delete({ menuId: id } as any);
        await this.menuRepo.delete(id);
        this.logger.log(`Cleaned up stale menu item: ${id}`);
      }
    }
  }

  /**
   * 递归同步菜单项：不存在则插入，存在则更新字段
   * @returns 插入或更新的记录数
   */
  private async upsertDefaultMenus(
    items: SystemMenuItem[],
    parentId: string | null = null,
  ): Promise<number> {
    let synced = 0;
    for (const item of items) {
      const existing = await this.menuRepo.findOne({ where: { id: item.id } });
      const roles = item.roles || null;
      if (!existing) {
        // 插入新项
        await this.menuRepo
          .createQueryBuilder()
          .insert()
          .into(Menu)
          .values({
            id: item.id,
            parentId: parentId,
            labelKey: item.labelKey,
            path: item.path,
            icon: item.icon,
            roles,
            sortOrder: item.order ?? 0,
            isDetail: item.isDetail ? 1 : 0,
            subsystem: item.subsystem || null,
          })
          .orIgnore()
          .execute();
        synced++;
        this.logger.log(`Inserted missing menu item: ${item.id}`);
      } else {
        // 更新已有项字段（检测是否有变更）
        // 注意：sortOrder 是用户运行时自定义数据（菜单管理页可拖拽调整），
        // 启动同步不应覆盖用户调整的顺序，故不参与 needsUpdate 判断与 update set。
        // 仅新插入项使用 item.order 作为初始顺序（见上方 insert 分支）。
        const needsUpdate =
          existing.parentId !== parentId ||
          existing.labelKey !== item.labelKey ||
          existing.path !== item.path ||
          existing.icon !== item.icon ||
          JSON.stringify(existing.roles) !== JSON.stringify(roles) ||
          existing.isDetail !== (item.isDetail ? 1 : 0) ||
          existing.subsystem !== (item.subsystem || null);
        if (needsUpdate) {
          await this.menuRepo
            .createQueryBuilder()
            .update(Menu)
            .set({
              parentId,
              labelKey: item.labelKey,
              path: item.path,
              icon: item.icon,
              roles,
              isDetail: item.isDetail ? 1 : 0,
              subsystem: item.subsystem || null,
              updatedAt: new Date(),
            })
            .where('id = :id', { id: item.id })
            .execute();
          synced++;
          this.logger.log(`Updated menu item: ${item.id}`);
        }
      }
      if (item.children && item.children.length > 0) {
        synced += await this.upsertDefaultMenus(item.children, item.id);
      }
    }
    return synced;
  }

  /**
   * 同步默认按钮到 DB（启动时调用）
   * - 空表：全量写入
   * - 非空表：补增缺失项 + 更新已有项字段
   */
  async syncDefaultButtons(): Promise<void> {
    try {
      const count = await this.buttonRepo.count();
      if (count === 0) {
        await this.updateMenuButtons(DEFAULT_MENU_BUTTONS);
        this.logger.log('Default menu buttons initialized (empty DB)');
      } else {
        // 补增 + 同步
        let synced = 0;
        for (const btn of DEFAULT_MENU_BUTTONS) {
          const existing = await this.buttonRepo.findOne({ where: { id: btn.id } });
          if (!existing) {
            await this.buttonRepo
              .createQueryBuilder()
              .insert()
              .into(MenuButton)
              .values({
                id: btn.id,
                menuId: btn.menuId,
                labelKey: btn.labelKey,
                permissionCode: btn.permissionCode,
                sortOrder: btn.sortOrder,
              })
              .orIgnore()
              .execute();
            synced++;
          } else {
            const needsUpdate =
              existing.menuId !== btn.menuId ||
              existing.labelKey !== btn.labelKey ||
              existing.permissionCode !== btn.permissionCode ||
              existing.sortOrder !== btn.sortOrder;
            if (needsUpdate) {
              await this.buttonRepo
                .createQueryBuilder()
                .update(MenuButton)
                .set({
                  menuId: btn.menuId,
                  labelKey: btn.labelKey,
                  permissionCode: btn.permissionCode,
                  sortOrder: btn.sortOrder,
                  updatedAt: new Date(),
                })
                .where('id = :id', { id: btn.id })
                .execute();
              synced++;
            }
          }
        }
        if (synced > 0) {
          this.logger.log(`Menu buttons synced: ${synced} items inserted/updated`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to sync default buttons: ${e.message}`);
    }
  }

  // ──────── 单项 CRUD ────────

  /** 创建单个菜单项 */
  async createMenuItem(item: SystemMenuItem, parentId?: string | null): Promise<Menu> {
    const entity = this.menuRepo.create({
      id: item.id,
      parentId: parentId || null,
      labelKey: item.labelKey,
      path: item.path,
      icon: item.icon,
      roles: item.roles || null,
      sortOrder: item.order ?? 0,
      isDetail: item.isDetail ? 1 : 0,
      subsystem: item.subsystem || null,
    });
    return this.menuRepo.save(entity);
  }

  /** 更新单个菜单项 */
  async updateMenuItem(id: string, item: SystemMenuItem, parentId?: string | null): Promise<Menu> {
    const existing = await this.menuRepo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`菜单项不存在: ${id}`);
    }
    // 更新字段
    if (parentId !== undefined) existing.parentId = parentId;
    existing.labelKey = item.labelKey;
    existing.path = item.path;
    existing.icon = item.icon;
    existing.roles = item.roles || null;
    existing.sortOrder = item.order ?? 0;
    existing.isDetail = item.isDetail ? 1 : 0;
    existing.subsystem = item.subsystem || null;
    existing.updatedAt = new Date();
    return this.menuRepo.save(existing);
  }

  /** 删除单个菜单项（含子节点级联删除） */
  async deleteMenuItem(id: string): Promise<void> {
    // 级联删除所有子节点
    const children = await this.menuRepo.find({ where: { parentId: id } });
    for (const child of children) {
      await this.deleteMenuItem(child.id);
    }
    // 删除关联按钮
    await this.buttonRepo.delete({ menuId: id } as any);
    await this.menuRepo.delete(id);
    this.logger.log(`Menu item deleted: ${id}`);
  }

  /** 创建单个菜单按钮 */
  async createMenuButton(btn: SystemMenuButton): Promise<MenuButton> {
    const entity = this.buttonRepo.create({
      id: btn.id,
      menuId: btn.menuId,
      labelKey: btn.labelKey,
      permissionCode: btn.permissionCode,
      sortOrder: btn.sortOrder,
    });
    return this.buttonRepo.save(entity);
  }

  /** 删除单个菜单按钮 */
  async deleteMenuButton(id: string): Promise<void> {
    await this.buttonRepo.delete(id);
    this.logger.log(`Menu button deleted: ${id}`);
  }

  // ──────── 权限码注册表（v8.0） ────────

  /**
   * 获取权限码注册表
   *
   * 数据来源：
   * 1. 权限码列表 → sys_menu_buttons.permission_code（运行时真实数据）
   * 2. 分类与标签 → PERMISSION_CATEGORIES（从 @ss-node/ss-core 导入，仅作 UI 元数据）
   * 3. 不匹配分类的权限码归入「未分类」
   *
   * 替代前端硬编码 ROLE_PERMISSIONS 和 PERMISSION_CATEGORIES。
   */
  async getPermissionsRegistry(): Promise<{
    categories: { module: string; label: string; codes: { code: string; label: string }[] }[];
  }> {
    // 动态导入避免 ss-system → ss-core 的模块级循环依赖（@Injectable 级别是安全的）
    const { PERMISSION_CATEGORIES } = await import('@ss-node/ss-core');

    // 从 sys_menu_buttons 聚合去重权限码
    let allCodes: { code: string; label: string }[] = [];
    try {
      const rows: { permission_code: string }[] = await this.menuRepo.manager.query(
        `SELECT DISTINCT permission_code FROM sys_menu_buttons WHERE permission_code IS NOT NULL AND permission_code != ''`,
      );
      allCodes = rows.map((r) => ({ code: r.permission_code, label: r.permission_code }));
    } catch {
      this.logger.warn('Failed to query sys_menu_buttons for permission codes');
    }

    // 为每个权限码匹配分类
    const codeToCategory = new Map<string, string>();
    for (const cat of PERMISSION_CATEGORIES) {
      for (const code of cat.codes) {
        codeToCategory.set(code, cat.module);
      }
    }

    // 按分类分组
    const categoryMap = new Map<string, { module: string; label: string; codes: { code: string; label: string }[] }>();
    const unmatched: { code: string; label: string }[] = [];

    for (const item of allCodes) {
      const module = codeToCategory.get(item.code);
      if (module) {
        const cat = categoryMap.get(module);
        if (cat) {
          cat.codes.push(item);
        } else {
          const catDef = PERMISSION_CATEGORIES.find((c) => c.module === module)!;
          categoryMap.set(module, {
            module,
            label: catDef.label,
            codes: [item],
          });
        }
      } else {
        unmatched.push(item);
      }
    }

    const categories = [...categoryMap.values()];
    // 补充 PERMISSION_CATEGORIES 中定义了但 sys_menu_buttons 中没有的分类（空 codes）
    for (const catDef of PERMISSION_CATEGORIES) {
      if (!categoryMap.has(catDef.module)) {
        categories.push({
          module: catDef.module,
          label: catDef.label,
          codes: [],
        });
      }
    }
    if (unmatched.length > 0) {
      categories.push({ module: 'other', label: '未分类', codes: unmatched });
    }

    return { categories };
  }
}
