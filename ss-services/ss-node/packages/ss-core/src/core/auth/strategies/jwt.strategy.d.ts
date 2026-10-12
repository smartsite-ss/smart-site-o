// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { I18nService } from '@ss-node/ss-i18n';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
  private userService;
  private i18nService;
  constructor(userService: UserService, i18nService: I18nService);
  validate(payload: any): Promise<import('../../..').User>;
}
export {};
