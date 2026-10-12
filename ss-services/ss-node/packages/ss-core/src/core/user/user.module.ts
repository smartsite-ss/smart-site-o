// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, OnModuleInit, OnApplicationBootstrap, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Position } from './entities/position.entity';
import { ProjectAuthorization } from './entities/project-authorization.entity';
import { DeviceAuthorization } from './entities/device-authorization.entity';
import { TagAuthorization } from './entities/tag-authorization.entity';
import { PermissionAuditLog } from './entities/permission-audit-log.entity';
import { UserService } from './user.service';
import { RoleService } from './role.service';
import { PositionService } from './position.service';
import { AuthorizationService } from './authorization.service';
import { PermissionAuditService } from './permission-audit.service';
import { UserController } from './user.controller';
import { RoleController } from './role.controller';
import { PositionController } from './position.controller';

/**
 * @Global() — 用户/授权模块声明为全局模块（3.6 实现）
 *
 * 使 AuthorizationService 可被任意模块的 Guard/Interceptor 注入，
 * 特别是 ss-device 的 DataAccessGuard 需要注入 'AuthorizationService' 字符串 Token
 * 来执行标签级权限检查（checkTagPermission）。
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Position,
      ProjectAuthorization,
      DeviceAuthorization,
      TagAuthorization,
      PermissionAuditLog,
    ]),
  ],
  controllers: [UserController, RoleController, PositionController],
  providers: [
    UserService,
    RoleService,
    PositionService,
    AuthorizationService,
    PermissionAuditService,
    // 字符串 Token alias —— 供 DataAccessGuard @Inject('AuthorizationService') 使用
    { provide: 'AuthorizationService', useExisting: AuthorizationService },
  ],
  exports: [
    UserService,
    RoleService,
    PositionService,
    AuthorizationService,
    PermissionAuditService,
    'AuthorizationService',
  ],
})
export class UserModule implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    private readonly roleService: RoleService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async onModuleInit() {
    // 首次启动时自动初始化系统角色
    await this.roleService.initSystemRoles();
  }

  async onApplicationBootstrap() {
    // 所有模块 onModuleInit 完成后执行迁移，确保 ss-system 的 syncDefaultMenus 已执行、sys_menus 表已 sync
    await this.roleService.migrateSystemRoleMenuIds();
    // 补充系统角色缺失的默认权限（如新增的趋势查看权限）
    await this.roleService.migrateSystemRolePermissions();
    // v8.0：设备分组授权 → 设备授权迁移（废弃 sys_device_group_authorizations）
    await this.authorizationService.migrateDeviceGroupAuthsToDeviceAuths();
  }
}
