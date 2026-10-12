// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { I18nService } from '@ss-node/ss-i18n';
import { ErrorFactory } from '../error-factory';

export interface CreateUserDto {
  username: string;
  password: string;
  email: string;
  displayName?: string;
  roleId?: string;
  positionId?: string;
  phone?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
  roleId?: string;
  positionId?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
}

@Injectable()
export class UserService {
  private readonly err: ErrorFactory;

  constructor(
    @Inject(getRepositoryToken(User))
    private userRepository: Repository<User>,
    @Inject(getRepositoryToken(Role))
    private roleRepository: Repository<Role>,
    @Inject(I18nService)
    private i18nService: I18nService,
  ) {
    this.err = new ErrorFactory(this.i18nService);
  }

  async findById(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['roleEntity', 'position'],
    });
  }

  async findByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<User> {
    return this.userRepository.findOne({
      where: [{ username }, { email }],
    });
  }

  async createUser(registerDto: RegisterDto): Promise<User> {
    const existing = await this.findByUsernameOrEmail(registerDto.username, registerDto.email);
    if (existing) {
      this.err.conflict('auth.register.failed_user_exists');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 查找 user 角色作为新注册用户的默认角色
    let roleId: string | null = null;
    const userRole = await this.roleRepository.findOne({ where: { code: 'user' } });
    if (userRole) {
      roleId = userRole.id;
    }

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      role: UserRole.USER,
      roleId,
    });
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('当前密码不正确');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async updateProfile(
    userId: string,
    updates: { displayName?: string; email?: string },
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (updates.email && updates.email !== user.email) {
      const emailExists = await this.userRepository.findOne({ where: { email: updates.email } });
      if (emailExists) {
        throw new ConflictException('邮箱已被占用');
      }
    }

    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.email !== undefined) user.email = updates.email;

    return this.userRepository.save(user);
  }

  // ──────── 管理员用户管理（v6.0 新增） ────────

  /** 查询所有用户（管理员） */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['roleEntity', 'position'],
      order: { createdAt: 'DESC' },
    });
  }

  /** 管理员创建用户（含角色/岗位分配） */
  async adminCreateUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByUsernameOrEmail(dto.username, dto.email);
    if (existing) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      username: dto.username,
      password: hashedPassword,
      email: dto.email,
      displayName: dto.displayName || dto.username,
      phone: dto.phone || '',
      roleId: dto.roleId || null,
      positionId: dto.positionId || null,
    });

    // 同步 role 快照字段
    if (dto.roleId) {
      const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
      if (role) {
        user.role = role.code as any;
      }
    }

    return this.userRepository.save(user);
  }

  /** 管理员更新用户 */
  async adminUpdateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.email !== undefined && dto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException('邮箱已被占用');
      user.email = dto.email;
    }
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    // 同步 role 快照字段
    if (dto.roleId !== undefined) {
      user.roleId = dto.roleId || null;
      if (dto.roleId) {
        const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
        if (role) user.role = role.code as any;
      }
    }
    if (dto.positionId !== undefined) {
      user.positionId = dto.positionId || null;
    }

    return this.userRepository.save(user);
  }

  /** 分配角色 */
  async assignRole(userId: string, roleId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('角色不存在');

    user.roleId = roleId;
    user.role = role.code as any;
    return this.userRepository.save(user);
  }

  /** 分配岗位 */
  async assignPosition(userId: string, positionId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');

    user.positionId = positionId || null;
    return this.userRepository.save(user);
  }

  // ──────── 微信扫码登录用户管理 ────────

  /** 按 wechatOpenId 查询用户（扫码登录查找已有账号） */
  async findByWechatOpenId(wechatOpenId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { wechatOpenId } });
  }

  /** 按 wechatUnionId 查询用户（跨应用识别同一用户） */
  async findByWechatUnionId(wechatUnionId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { wechatUnionId } });
  }

  /**
   * 创建微信扫码登录用户
   *
   * - username: wechat_{openid前8位}，冲突时追加随机后缀
   * - password: 随机 32 字符（bcrypt 哈希），用户不可知，仅满足 NOT NULL 约束
   * - email: {openid}@wechat.local 占位（满足 unique 约束，管理员后续可让用户补全真实邮箱）
   * - role: viewer（只读）
   * - authProvider: wechat
   */
  async createWechatUser(params: {
    wechatOpenId: string;
    wechatUnionId?: string;
    nickname?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const { wechatOpenId, wechatUnionId, nickname, avatarUrl } = params;
    const usernameSeed = `wechat_${wechatOpenId.slice(0, 8)}`;
    let username = usernameSeed;
    // 用户名冲突时追加随机后缀
    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${usernameSeed}_${crypto.randomBytes(2).toString('hex')}`;
    }
    // email 冲突兜底
    let email = `${wechatOpenId}@wechat.local`;
    while (await this.userRepository.findOne({ where: { email } })) {
      email = `${wechatOpenId}_${crypto.randomBytes(2).toString('hex')}@wechat.local`;
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // 查找 viewer 角色，设置 roleId + role 快照
    let roleId: string | null = null;
    let roleCode: UserRole = UserRole.VIEWER;
    const viewerRole = await this.roleRepository.findOne({ where: { code: 'viewer' } });
    if (viewerRole) {
      roleId = viewerRole.id;
      roleCode = viewerRole.code as UserRole;
    }

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
      displayName: nickname || username,
      avatar: avatarUrl || '',
      role: roleCode,
      roleId,
      authProvider: 'wechat',
      wechatOpenId,
      wechatUnionId: wechatUnionId || null,
      wechatNickname: nickname || null,
      wechatAvatarUrl: avatarUrl || null,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  /** 更新微信用户资料（昵称/头像/unionId，扫码后刷新） */
  async updateWechatProfile(
    userId: string,
    profile: {
      nickname?: string;
      avatarUrl?: string;
      unionId?: string;
    },
  ): Promise<void> {
    const patch: Partial<User> = {};
    if (profile.nickname !== undefined) {
      patch.wechatNickname = profile.nickname;
    }
    if (profile.avatarUrl !== undefined) {
      patch.wechatAvatarUrl = profile.avatarUrl;
      patch.avatar = profile.avatarUrl;
    }
    if (profile.unionId !== undefined) {
      patch.wechatUnionId = profile.unionId;
    }
    if (Object.keys(patch).length === 0) return;
    await this.userRepository.update(userId, patch);
  }

  // ──────── 微信小程序登录用户管理 ────────

  /** 按小程序 openid 查询已绑定用户（小程序授权登录查找系统账号） */
  async findByWechatMpOpenId(wechatMpOpenId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { wechatMpOpenId } });
  }

  /** 绑定小程序 openid 到系统账号（首次微信登录绑定流程） */
  async bindWechatMpOpenId(userId: string, wechatMpOpenId: string): Promise<void> {
    await this.userRepository.update(userId, { wechatMpOpenId });
  }

  /** 解绑小程序 openid（清空绑定关系） */
  async unbindWechatMpOpenId(userId: string): Promise<void> {
    await this.userRepository.update(userId, { wechatMpOpenId: null });
  }
}
