// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional } from 'class-validator';

/**
 * S-C03: refreshToken 改为可选（Cookie 模式下通过 HttpOnly Cookie 传输，body 可为空）
 */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
