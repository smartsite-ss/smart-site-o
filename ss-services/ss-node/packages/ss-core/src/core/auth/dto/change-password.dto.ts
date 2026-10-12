// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', example: 'oldPassword123' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: '新密码 (最少8位，需包含字母和数字)',
    example: 'NewPass456',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: '新密码必须包含字母和数字',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码', example: 'NewPass456' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
