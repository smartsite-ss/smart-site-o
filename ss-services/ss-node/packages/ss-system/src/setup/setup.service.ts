// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '@ss-node/ss-core';
import * as bcrypt from 'bcryptjs';

export interface SetupStep1Data {
  username: string;
  password: string;
  email: string;
  displayName?: string;
}

export interface SetupStep2Data {
  appName: string;
  timezone: string;
  language: string;
}

export interface SetupStep3Data {
  dbPath?: string;
  storagePath?: string;
}

export interface SetupStatus {
  initialized: boolean;
  completedAt?: Date;
  adminUser?: string;
  steps: {
    adminAccount: boolean;
    basicConfig: boolean;
    dataConfig: boolean;
  };
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);
  private setupCompleted = false;
  private setupData: Record<string, any> = {};

  constructor(
    @Inject(getRepositoryToken(User))
    private readonly userRepo: Repository<User>,
  ) {}

  /** 检测是否已初始化 */
  async getSetupStatus(): Promise<SetupStatus> {
    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    const initialized = this.setupCompleted || adminCount > 0;

    return {
      initialized,
      completedAt: this.setupCompleted ? new Date() : undefined,
      adminUser: initialized ? 'admin' : undefined,
      steps: {
        adminAccount: adminCount > 0,
        basicConfig: this.setupData.basicConfig !== undefined,
        dataConfig: this.setupData.dataConfig !== undefined,
      },
    };
  }

  /** Step 1: 创建管理员账户 */
  async createAdminAccount(data: SetupStep1Data): Promise<{ success: boolean; userId: string }> {
    if (!data.username || !data.password || !data.email) {
      throw new BadRequestException('用户名、密码和邮箱是必填项');
    }

    const existing = await this.userRepo.findOne({ where: { username: data.username } });
    if (existing) {
      throw new BadRequestException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      username: data.username,
      password: hashedPassword,
      email: data.email,
      displayName: data.displayName || data.username,
      role: UserRole.ADMIN,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);
    this.setupData.adminAccount = true;
    this.logger.log(`Admin account created: ${data.username}`);

    return { success: true, userId: saved.id };
  }

  /** Step 2: 基本配置 */
  async setupBasicConfig(data: SetupStep2Data): Promise<{ success: boolean }> {
    if (!data.appName || !data.timezone) {
      throw new BadRequestException('应用名称和时区是必填项');
    }

    this.setupData.basicConfig = data;
    this.logger.log(`Basic config set: ${JSON.stringify(data)}`);

    return { success: true };
  }

  /** Step 3: 数据配置 */
  async setupDataConfig(data: SetupStep3Data): Promise<{ success: boolean }> {
    this.setupData.dataConfig = data;
    this.logger.log(`Data config set: ${JSON.stringify(data)}`);

    return { success: true };
  }

  /** Step 4: 完成初始化 */
  async completeSetup(): Promise<{ success: boolean; summary: SetupStatus }> {
    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    if (adminCount === 0) {
      throw new BadRequestException('请先创建管理员账户');
    }

    this.setupCompleted = true;
    this.logger.log('System setup completed');

    return {
      success: true,
      summary: await this.getSetupStatus(),
    };
  }
}
