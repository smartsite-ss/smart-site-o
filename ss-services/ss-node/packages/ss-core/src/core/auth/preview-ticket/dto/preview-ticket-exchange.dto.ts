// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 预览票据兑换请求（H5 运行态壳持 URL 中的一次性票据换取 Cookie 会话） */
export class PreviewTicketExchangeDto {
  @ApiProperty({ description: '一次性预览票据（60 秒有效，兑换即失效）' })
  @IsString()
  previewTicket: string;
}
