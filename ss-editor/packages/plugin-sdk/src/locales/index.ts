// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { default as zhCN } from './zh-CN';
export { default as enUS } from './en-US';

import zhCN from './zh-CN';
import enUS from './en-US';
import type { I18nResource } from '../utils/I18nProvider';
import type { SupportedLocale } from '../utils/I18nProvider';
import { I18nProvider } from '../utils/I18nProvider';

const systemLocales: Record<SupportedLocale, I18nResource> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function loadSystemLocale(locale: SupportedLocale): I18nResource {
  return systemLocales[locale];
}

export function syncSystemLocales(): void {
  I18nProvider.registerPluginLocale('__system__', async () => {
    return { default: systemLocales[I18nProvider.locale] };
  });
}