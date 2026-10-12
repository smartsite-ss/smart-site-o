// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CollectorDiagnosticsService } from './collector-diagnostics.service';

@Controller('api/v1/diagnostics')
export class CollectorDiagnosticsController {
  constructor(private readonly diagnosticsService: CollectorDiagnosticsService) {}

  /** 对指定设备运行诊断 */
  @Get('device/:deviceId')
  async diagnoseDevice(@Param('deviceId') deviceId: string) {
    const report = await this.diagnosticsService.runFullDiagnosis(deviceId);
    return { code: 0, data: report, message: 'ok' };
  }

  /** 对指定标签运行诊断 */
  @Get('tag/:tagId')
  async diagnoseTag(@Param('tagId') tagId: string) {
    const result = await this.diagnosticsService.checkTagReadability(tagId);
    return { code: 0, data: result, message: 'ok' };
  }

  /** 对指定协议插件运行诊断 */
  @Get('plugin/:protocol')
  async diagnosePlugin(@Param('protocol') protocol: string) {
    const result = await this.diagnosticsService.checkPluginHealth(protocol);
    return { code: 0, data: result, message: 'ok' };
  }

  /** 运行全量系统诊断 */
  @Post('full')
  async runFullDiagnosis(@Body('deviceId') deviceId?: string) {
    const report = await this.diagnosticsService.runFullDiagnosis(deviceId);
    return { code: 0, data: report, message: 'ok' };
  }
}
