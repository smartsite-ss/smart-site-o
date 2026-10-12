// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SetMetadata } from '@nestjs/common';

export const DATA_ACCESS_KEY = 'data_access';

/**
 * 数据访问装饰器
 *
 * 声明接口需要检查的资源类型，配合 DataAccessGuard 使用。
 *
 * 用法:
 *   @DataAccess('project')     — 检查用户对 projectId 参数的访问权限
 *   @DataAccess('device')      — 检查用户对 deviceId 参数的访问权限
 *   @DataAccess('deviceGroup') — 检查用户对 groupId 参数的访问权限
 */
export const DataAccess = (...resources: string[]) => SetMetadata(DATA_ACCESS_KEY, resources);
