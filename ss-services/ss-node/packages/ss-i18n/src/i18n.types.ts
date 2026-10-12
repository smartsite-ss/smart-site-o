// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { I18nContext } from 'nestjs-i18n';

export interface TranslationKey {
  domain: string;
  action: string;
  key: string;
}

export interface I18nOptions extends I18nContext {
  args?: Record<string, any>;
  defaultValue?: string;
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  rtl?: boolean;
}
