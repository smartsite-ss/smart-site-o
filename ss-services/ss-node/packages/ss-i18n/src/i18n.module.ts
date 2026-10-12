// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DynamicModule, Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';

export interface I18nModuleOptions {
  fallbackLanguage?: string;
  loaderPath?: string;
}

@Global()
@Module({})
export class I18nModule {
  static forRoot(options: I18nModuleOptions = {}): DynamicModule {
    if (options.fallbackLanguage) {
      process.env.I18N_FALLBACK_LANGUAGE = options.fallbackLanguage;
    }
    if (options.loaderPath) {
      process.env.I18N_LOADER_PATH = options.loaderPath;
    }

    return {
      module: I18nModule,
      providers: [I18nService],
      exports: [I18nService],
      global: true,
    };
  }
}
