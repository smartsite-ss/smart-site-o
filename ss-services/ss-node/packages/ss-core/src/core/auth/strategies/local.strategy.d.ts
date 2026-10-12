// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { I18nService } from '@ss-node/ss-i18n';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
  private authService;
  private i18nService;
  constructor(authService: AuthService, i18nService: I18nService);
  validate(username: string, password: string): Promise<any>;
}
export {};
