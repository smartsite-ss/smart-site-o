// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 小程序微信登录请求（wx.login 获取的 code，5 分钟时效） */
export class WechatMpLoginDto {
  @ApiProperty({ description: '微信登录临时凭证（wx.login code）' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  loginCode: string;
}

/** 小程序账密登录请求（不依赖微信 code，直接用系统账号密码登录） */
export class WechatMpPasswordLoginDto {
  @ApiProperty({ description: '系统账号用户名' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ description: '系统账号密码' })
  @IsString()
  @MinLength(1)
  password: string;
}

/** 小程序账号绑定请求（提交时新取 loginCode，避免停留过久导致过期） */
export class WechatMpBindAccountDto {
  @ApiProperty({ description: '微信登录临时凭证（wx.login code）' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  loginCode: string;

  @ApiProperty({ description: '系统账号用户名' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ description: '系统账号密码' })
  @IsString()
  @MinLength(1)
  password: string;
}
