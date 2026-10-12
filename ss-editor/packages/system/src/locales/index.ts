// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { registerLocaleMessages } from '@scada-editor/core';
import zhCN from './zh-CN.json';
import enUS from './en-US.json';

export function setupSystemLocales() {
  registerLocaleMessages('zh-CN', zhCN);
  registerLocaleMessages('en-US', enUS);
}