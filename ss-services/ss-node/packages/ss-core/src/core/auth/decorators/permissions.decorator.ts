// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限码装饰器
 * 用法: @Permissions('project:create', 'project:delete')
 */
export const Permissions = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
