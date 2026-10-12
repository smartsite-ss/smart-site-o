// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Delete, Query } from '@nestjs/common';
import { OfflineCacheService } from './offline-cache.service';

@Controller('pipeline/offline-cache')
export class OfflineCacheController {
  constructor(private readonly offlineCache: OfflineCacheService) {}

  @Get('stats')
  getStats() {
    const stats = this.offlineCache.getBufferStats();
    return { code: 0, data: stats, message: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('flush')
  async flush(@Query('maxBatch') maxBatch?: number) {
    const items = await this.offlineCache.flush(maxBatch);
    return {
      code: 0,
      data: { flushed: items.length },
      message: `Flushed ${items.length} items`,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete()
  clear() {
    this.offlineCache.clear();
    return { code: 0, data: null, message: 'Buffer cleared', timestamp: new Date().toISOString() };
  }
}
