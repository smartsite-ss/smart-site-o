// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SetupService, SetupStep1Data, SetupStep2Data, SetupStep3Data } from './setup.service';

@ApiTags('系统初始化')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @ApiOperation({ summary: '检测初始化状态' })
  async getStatus() {
    return this.setupService.getSetupStatus();
  }

  @Post('step1')
  @ApiOperation({ summary: 'Step 1: 创建管理员账户' })
  async createAdminAccount(@Body() data: SetupStep1Data) {
    return this.setupService.createAdminAccount(data);
  }

  @Post('step2')
  @ApiOperation({ summary: 'Step 2: 基本配置' })
  async setupBasicConfig(@Body() data: SetupStep2Data) {
    return this.setupService.setupBasicConfig(data);
  }

  @Post('step3')
  @ApiOperation({ summary: 'Step 3: 数据配置' })
  async setupDataConfig(@Body() data: SetupStep3Data) {
    return this.setupService.setupDataConfig(data);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Step 4: 完成初始化' })
  async completeSetup() {
    return this.setupService.completeSetup();
  }
}
