// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { TemplateLoaderService } from './template-loader.service';
import { TemplateIndexService } from './template-index.service';

@Injectable()
export class TemplateInitService implements OnModuleInit {
  private readonly logger = new Logger(TemplateInitService.name);

  constructor(
    @Optional()
    private readonly templateLoader?: TemplateLoaderService,
    @Optional()
    private readonly indexService?: TemplateIndexService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('模板初始化服务启动（JSON 文件模式）');
    await this.ensureTemplatesDirectory();
  }

  /**
   * 确保模板目录存在，并加载所有语言的模板（由 TemplateLoaderService 管理）
   */
  private async ensureTemplatesDirectory(): Promise<void> {
    const basePath = this.indexService?.getBasePath();
    if (basePath) {
      this.logger.log(`模板目录: ${basePath}`);
    }

    // 多语言模板库由 TemplateLoaderService.loadAllLocales() 统一管理，
    // 此处不再重建单一根目录 index.json
    if (this.templateLoader) {
      // loadAllLocales 已在 TemplateLoaderService 的 onModuleInit 中调用
      const stats = this.templateLoader.getCacheStats();
      this.logger.log(
        `模板库加载完成: ${stats.count} 个模板, ${stats.industries.length} 个行业, ${stats.deviceTypes.length} 种设备类型`,
      );
    }
  }
}
