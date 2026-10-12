// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';
import { Role } from './role.entity';
import { Position } from './position.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

@Entity('sys_users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  /** 角色快照（向后兼容），值为 role.code */
  @Column({ type: 'varchar', length: 20, default: UserRole.USER })
  role: UserRole;

  /** 角色外键（v6.0 新增） */
  @Column({ name: 'role_id', nullable: true })
  roleId: string;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  roleEntity: Role;

  /** 岗位外键（v6.0 新增） */
  @Column({ name: 'position_id', nullable: true })
  positionId: string;

  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  /** 手机号（v6.0 新增） */
  @Column({ default: '' })
  phone: string;

  /** 头像 URL（v6.0 新增） */
  @Column({ default: '' })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  /** 微信开放平台 OpenID（网站扫码登录），unique + nullable 保证未绑定用户为 null 且不重复 */
  @Column({ name: 'wechat_open_id', unique: true, nullable: true })
  wechatOpenId: string;

  /** 微信小程序 OpenID（小程序授权登录，与开放平台网站应用 openid 不同体系），唯一绑定 */
  @Column({ name: 'wechat_mp_open_id', unique: true, nullable: true })
  wechatMpOpenId: string;

  /** 微信 UnionID（若公众号/小程序与开放平台绑定才会有，可空） */
  @Column({ name: 'wechat_union_id', nullable: true })
  wechatUnionId: string;

  /** 认证提供方：local（账密）| wechat（仅扫码）| mixed（同时存在密码和第三方登录） */
  @Column({ name: 'auth_provider', type: 'varchar', length: 20, default: 'local' })
  authProvider: 'local' | 'wechat' | 'mixed';

  /** 微信用户昵称（扫码授权时同步） */
  @Column({ name: 'wechat_nickname', nullable: true })
  wechatNickname: string;

  /** 微信头像 URL（扫码授权时同步） */
  @Column({ name: 'wechat_avatar_url', nullable: true })
  wechatAvatarUrl: string;
}
