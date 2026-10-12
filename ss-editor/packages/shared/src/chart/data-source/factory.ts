// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createStaticDataSource } from './static';
import { createApiDataSource } from './api';
import {
  createDatabaseDataSource,
  type DatabaseDataSource,
  type DatabaseDataSourceDeps,
} from './database';
import type { ChartDataSource, ChartDataSourceConfig } from './types';

/**
 * 图表数据源工厂：按配置类型创建 static / api / database 数据源。
 * database 需要注入取数/订阅依赖（dataQueryApi + wsStore），由插件层传入。
 */
export function createChartDataSource(
  config: ChartDataSourceConfig,
  deps?: DatabaseDataSourceDeps,
): ChartDataSource {
  switch (config.type) {
    case 'api':
      return createApiDataSource(
        config.apiConfig ?? {
          url: '',
          method: 'GET',
          mapping: { dimensions: ['name', 'value'], categoryField: 'name', valueField: 'value' },
        },
      );
    case 'database': {
      if (!deps) {
        throw new Error('[ChartDataSource] database 数据源需要注入 dataQueryApi 与 wsStore 依赖');
      }
      return createDatabaseDataSource(
        config.databaseConfig ?? { mode: 'latest', tags: [] },
        deps,
      );
    }
    case 'static':
    default:
      return createStaticDataSource(
        config.staticConfig ?? { dimensions: ['name', 'value'], source: [] },
      );
  }
}

export type { DatabaseDataSource };
