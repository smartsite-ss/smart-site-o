// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SystemInfoService } from './system-info.service';

@ApiTags('系统信息')
@Controller('system/info')
export class SystemInfoController {
  constructor(private readonly systemInfoService: SystemInfoService) {}

  @Get()
  @ApiOperation({ summary: '获取系统信息' })
  async getInfo() {
    return this.systemInfoService.getInfo();
  }
}
