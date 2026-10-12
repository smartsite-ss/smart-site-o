// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';

@ApiTags('健康检查')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '简单健康检查（LB 探活）' })
  health() {
    return this.healthService.getSimple();
  }

  @Get('detailed')
  @ApiOperation({ summary: '详细健康检查' })
  detailedHealth() {
    return this.healthService.getDetailed();
  }

  @Get('disk-info')
  @ApiOperation({ summary: '获取磁盘分区详情（应用目录/数据目录/备份目录）' })
  diskInfo() {
    return this.healthService.getDiskPartitions();
  }

  @Get('live')
  @ApiOperation({ summary: 'K8s Liveness 探针' })
  liveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'K8s Readiness 探针' })
  readiness() {
    return this.healthService.getReadiness();
  }
}
