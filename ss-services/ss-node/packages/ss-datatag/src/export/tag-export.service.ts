// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { DataTagService } from '../datatag.service';

@Injectable()
export class TagExportService {
  constructor(private readonly tagService: DataTagService) {}

  async exportByDevice(deviceId: string, projectId: string): Promise<object> {
    const tags = await this.tagService.findByDevice(deviceId);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projectId,
      deviceId,
      totalTags: tags.length,
      tags: tags.map((tag) => this.tagToExportFormat(tag)),
    };
  }

  async exportByProject(projectId: string, _deviceIds?: string[]): Promise<object> {
    const result: any = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projectId,
    };

    return result;
  }

  private tagToExportFormat(tag: any): object {
    return {
      name: tag.name,
      address: tag.address,
      dataType: tag.dataType,
      description: tag.description ?? '',
      unit: tag.unit ?? '',
      scale: tag.scale,
      offset: tag.offset,
      scanRate: tag.scanRate,
      enabled: tag.enabled,
      minValue: tag.minValue,
      maxValue: tag.maxValue,
      deadbandMode: tag.deadbandMode,
      deadbandValue: tag.deadbandValue,
      deadbandPercent: tag.deadbandPercent,
      deadbandTime: tag.deadbandTime,
      conversionType: tag.conversionType,
      conversionConfig: tag.conversionConfig,
      alarmHighHigh: tag.alarmHighHigh,
      alarmHigh: tag.alarmHigh,
      alarmLow: tag.alarmLow,
      alarmLowLow: tag.alarmLowLow,
      archiveEnabled: tag.archiveEnabled,
      archiveInterval: tag.archiveInterval,
      retentionDays: tag.retentionDays,
    };
  }
}
