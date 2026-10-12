// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { config } from '@vue/test-utils';

// 全局 mock vue-i18n 的 $t，避免 SmartTablePagination 等组件在单测中报错
config.global.mocks = {
  $t: (key: string, params?: Record<string, any>) => {
    if (!params) return key;
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  },
};
