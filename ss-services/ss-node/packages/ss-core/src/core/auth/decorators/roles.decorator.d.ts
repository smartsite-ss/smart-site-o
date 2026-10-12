// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { UserRole } from '../../user/entities/user.entity';
export declare const ROLES_KEY = 'roles';
export declare const Roles: (
  ...roles: UserRole[]
) => import('@nestjs/common').CustomDecorator<string>;
