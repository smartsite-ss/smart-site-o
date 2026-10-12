// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { WechatApiService } from './wechat-api.service';
import { User } from '../../user/entities/user.entity';
import { ProjectAuthorization } from '../../user/entities/project-authorization.entity';
import { PathResolverService } from '../../../path/path-resolver.service';
import { AuditLoggerService } from '../../../logger/audit-logger.service';
import type { AuditContext } from '../audit-context.types';
import {
  WechatMpLoginResponse,
  WechatMpBindResponse,
  WechatMpLoginUserInfo,
  WechatMpAuthorizedProject,
  WechatMpTokenPair,
} from './wechat-auth.types';

/** 项目权限级别权重（同项目多条授权取最高） */
const PERMISSION_RANK: Record<WechatMpAuthorizedProject['permissionLevel'], number> = {
  read: 1,
  write: 2,
  admin: 3,
};

/**
 * 微信小程序授权登录服务
 *
 * 流程（区别于开放平台网站扫码登录）：
 *   1. login：wx.login code → code2session 换 openid → 查绑定关系
 *      - 已绑定：校验激活 → 签发双 Token + 用户信息 + 授权项目快照
 *      - 未绑定：返回 bindingRequired=true，前端引导账密绑定
 *   2. bind：重新 code2session（code 一次性）→ 校验系统账号账密 → 写入绑定关系 → 签发
 *   3. unbind：清空绑定关系（已登录用户操作，走 JWT 鉴权）
 *
 * session_key 仅后端临时持有（本次请求内），不落库、不下发。
 */
@Injectable()
export class WechatMpAuthService {
  private readonly logger = new Logger(WechatMpAuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly wechatApiService: WechatApiService,
    private readonly auditLogger: AuditLoggerService,
    private readonly pathResolver: PathResolverService,
    @InjectRepository(ProjectAuthorization)
    private readonly projectAuthorizationRepository: Repository<ProjectAuthorization>,
  ) {}

  /**
   * 小程序微信登录
   *
   * @returns 已绑定：tokenPair + userInformation + authorizedProjects
   *          未绑定：bindingRequired=true（tokenPair/userInformation 为 null）
   */
  async login(loginCode: string, auditContext?: AuditContext): Promise<WechatMpLoginResponse> {
    const session = await this.wechatApiService.getCode2Session(loginCode);
    const openidMasked = `${session.openid.slice(0, 6)}...`;

    const boundUser = await this.userService.findByWechatMpOpenId(session.openid);
    if (!boundUser) {
      this.logger.log(`[小程序登录] openid 未绑定系统账号，需引导账密绑定 | openid=${openidMasked}`);
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.login.binding_required',
        severity: 'info',
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { openidMasked },
      });
      return {
        tokenPair: null,
        userInformation: null,
        bindingRequired: true,
        authorizedProjects: [],
      };
    }

    if (!boundUser.isActive) {
      this.logger.warn(`[小程序登录] 账号已禁用，拒绝登录 | userId="${boundUser.id}" username="${boundUser.username}"`);
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.login.failed',
        severity: 'warning',
        userId: boundUser.id,
        username: boundUser.username,
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { reason: 'account_disabled' },
      });
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

    // 重新加载带角色关系的用户（roleNames 展示需要）
    const userWithRole = await this.userService.findById(boundUser.id);
    const tokenPair = await this.authService.generateTokensForUser({
      id: userWithRole.id,
      username: userWithRole.username,
      role: userWithRole.role,
    });
    const authorizedProjects = await this.listAuthorizedProjects(userWithRole);

    this.logger.log(
      `[小程序登录] 登录成功 | userId="${userWithRole.id}" username="${userWithRole.username}" | authorizedProjectCount=${authorizedProjects.length}`,
    );
    this.auditLogger.logSecurityEvent({
      type: 'auth.wechat_mp.login.success',
      severity: 'info',
      userId: userWithRole.id,
      username: userWithRole.username,
      ip: auditContext?.ip,
      userAgent: auditContext?.userAgent,
      details: { authorizedProjectCount: authorizedProjects.length },
    });

    return {
      tokenPair,
      userInformation: this.buildLoginUserInfo(userWithRole),
      bindingRequired: false,
      authorizedProjects,
    };
  }

  /**
   * 账密绑定（首次微信登录引导页提交）
   *
   * 注意：loginCode 必须由前端提交时新取（code 一次性 + 5 分钟时效）。
   * 冲突场景：该 openid 已绑定其他账号，或目标账号已绑定其他 openid → ACCOUNT_ALREADY_BOUND
   */
  async bind(
    loginCode: string,
    username: string,
    password: string,
    auditContext?: AuditContext,
  ): Promise<WechatMpBindResponse> {
    const session = await this.wechatApiService.getCode2Session(loginCode);
    const openidMasked = `${session.openid.slice(0, 6)}...`;

    const existingBoundUser = await this.userService.findByWechatMpOpenId(session.openid);
    if (existingBoundUser) {
      this.logger.warn(
        `[小程序绑定] 该微信已绑定其他账号，拒绝重复绑定 | openid=${openidMasked} boundUserId="${existingBoundUser.id}"`,
      );
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.bind.failed',
        severity: 'warning',
        username,
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { reason: 'openid_already_bound', openidMasked },
      });
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_BOUND',
        message: '该微信已绑定其他系统账号，请先在原账号解绑',
      });
    }

    const account = await this.userService.findByUsername(username);
    const passwordValid = account ? await bcrypt.compare(password, account.password) : false;
    if (!account || !passwordValid) {
      this.logger.warn(`[小程序绑定] 账号或密码错误 | username="${username}"`);
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.bind.failed',
        severity: 'warning',
        username,
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { reason: 'invalid_credentials', openidMasked },
      });
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (!account.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }
    if (account.wechatMpOpenId && account.wechatMpOpenId !== session.openid) {
      this.logger.warn(`[小程序绑定] 目标账号已绑定其他微信，拒绝换绑 | userId="${account.id}"`);
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.bind.failed',
        severity: 'warning',
        userId: account.id,
        username,
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { reason: 'account_already_bound_other_openid' },
      });
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_BOUND',
        message: '该系统账号已绑定其他微信，请先在原微信解绑',
      });
    }

    await this.userService.bindWechatMpOpenId(account.id, session.openid);

    const userWithRole = await this.userService.findById(account.id);
    const tokenPair = await this.authService.generateTokensForUser({
      id: userWithRole.id,
      username: userWithRole.username,
      role: userWithRole.role,
    });
    const authorizedProjects = await this.listAuthorizedProjects(userWithRole);

    this.logger.log(
      `[小程序绑定] 绑定成功并已登录 | userId="${userWithRole.id}" username="${userWithRole.username}" | openid=${openidMasked}`,
    );
    this.auditLogger.logSecurityEvent({
      type: 'auth.wechat_mp.bind.success',
      severity: 'info',
      userId: userWithRole.id,
      username: userWithRole.username,
      ip: auditContext?.ip,
      userAgent: auditContext?.userAgent,
      details: { openidMasked },
    });

    return {
      tokenPair,
      userInformation: this.buildLoginUserInfo(userWithRole),
      authorizedProjects,
    };
  }

  /**
   * 账密登录（不依赖微信 code，直接用系统账号密码登录）
   *
   * 与微信登录的区别：不涉及 code2session / openid 绑定，仅校验系统账号密码后签发双 Token。
   * 响应结构与 bind 一致（tokenPair + userInformation + authorizedProjects），前端 applySession 统一处理。
   */
  async loginWithPassword(
    username: string,
    password: string,
    auditContext?: AuditContext,
  ): Promise<WechatMpBindResponse> {
    const account = await this.userService.findByUsername(username);
    const passwordValid = account ? await bcrypt.compare(password, account.password) : false;
    if (!account || !passwordValid) {
      this.logger.warn(`[小程序账密登录] 账号或密码错误 | username="${username}"`);
      this.auditLogger.logSecurityEvent({
        type: 'auth.wechat_mp.password_login.failed',
        severity: 'warning',
        username,
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
        details: { reason: 'invalid_credentials' },
      });
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (!account.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

    const userWithRole = await this.userService.findById(account.id);
    const tokenPair = await this.authService.generateTokensForUser({
      id: userWithRole.id,
      username: userWithRole.username,
      role: userWithRole.role,
    });
    const authorizedProjects = await this.listAuthorizedProjects(userWithRole);

    this.logger.log(
      `[小程序账密登录] 登录成功 | userId="${userWithRole.id}" username="${userWithRole.username}" | authorizedProjectCount=${authorizedProjects.length}`,
    );
    this.auditLogger.logSecurityEvent({
      type: 'auth.wechat_mp.password_login.success',
      severity: 'info',
      userId: userWithRole.id,
      username: userWithRole.username,
      ip: auditContext?.ip,
      userAgent: auditContext?.userAgent,
      details: { authorizedProjectCount: authorizedProjects.length },
    });

    return {
      tokenPair,
      userInformation: this.buildLoginUserInfo(userWithRole),
      authorizedProjects,
    };
  }

  /** 解绑当前登录用户的小程序微信（走 JWT 鉴权，由 Controller 注入 userId） */
  async unbind(userId: string, auditContext?: AuditContext): Promise<{ message: string }> {
    await this.userService.unbindWechatMpOpenId(userId);
    this.logger.log(`[小程序解绑] 解绑成功 | userId="${userId}"`);
    this.auditLogger.logSecurityEvent({
      type: 'auth.wechat_mp.unbind',
      severity: 'info',
      userId,
      ip: auditContext?.ip,
      userAgent: auditContext?.userAgent,
    });
    return { message: '微信绑定已解除' };
  }

  /** 构建登录用户信息（与前端 LoginUserInfo 对齐） */
  private buildLoginUserInfo(user: User): WechatMpLoginUserInfo {
    return {
      userId: user.id,
      username: user.username,
      nickname: user.displayName || user.username,
      avatarUrl: user.avatar || null,
      roleNames: [user.roleEntity?.name || user.role],
    };
  }

  /**
   * 查询用户角色的授权项目快照
   *
   * 同一项目多条授权取最高权限级别（admin > write > read）；
   * projectName 从 {PROJECTS_DIR}/{projectId}/projectinfo.json 读取，缺失时回退 projectId。
   */
  private async listAuthorizedProjects(user: User): Promise<WechatMpAuthorizedProject[]> {
    if (!user.roleId) return [];

    const authorizations = await this.projectAuthorizationRepository.find({
      where: { roleId: user.roleId },
    });

    const mergedByProjectId = new Map<string, WechatMpAuthorizedProject>();
    for (const authorization of authorizations) {
      const permissionLevel = this.normalizePermissionLevel(authorization.permission);
      const existing = mergedByProjectId.get(authorization.projectId);
      if (!existing || PERMISSION_RANK[permissionLevel] > PERMISSION_RANK[existing.permissionLevel]) {
        mergedByProjectId.set(authorization.projectId, {
          projectId: authorization.projectId,
          projectName: this.readProjectName(authorization.projectId),
          permissionLevel,
        });
      }
    }
    return Array.from(mergedByProjectId.values());
  }

  /** 权限级别归一化（非法值降级为 read） */
  private normalizePermissionLevel(permission: string): WechatMpAuthorizedProject['permissionLevel'] {
    if (permission === 'admin' || permission === 'write' || permission === 'read') {
      return permission;
    }
    return 'read';
  }

  /** 从 projectinfo.json 读取项目显示名（兼容旧 name 字段），失败回退 projectId */
  private readProjectName(projectId: string): string {
    try {
      const projectsDirectory = this.pathResolver.resolveEnv('PROJECTS_DIR', './data/projects');
      const projectInfoPath = path.join(projectsDirectory, projectId, 'projectinfo.json');
      if (!fs.existsSync(projectInfoPath)) return projectId;
      const raw = JSON.parse(fs.readFileSync(projectInfoPath, 'utf-8')) as {
        projectName?: string;
        name?: string;
      };
      return raw.projectName || raw.name || projectId;
    } catch (error) {
      this.logger.warn(`[小程序登录] 读取 projectinfo.json 失败，回退 projectId | projectId="${projectId}" error="${(error as Error).message}"`);
      return projectId;
    }
  }
}

/** 供 Controller 使用的 Token 对类型（保持类型集中管理） */
export type { WechatMpTokenPair };
