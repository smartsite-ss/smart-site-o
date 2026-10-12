// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 预览票据签发请求（方案 C：后端按 SCADA_SHELL_BASE_URL 拼装完整壳 URL）。
 * 全部字段可选：仅用于拼装 previewUrl，不影响票据本身的有效性。
 */
export class PreviewTicketIssueDto {
  @ApiPropertyOptional({ description: '项目标识符（projectId，用于拼装预览 URL）' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '画面名称（pageName）' })
  @IsOptional()
  @IsString()
  pageName?: string;

  @ApiPropertyOptional({ description: '分组名称（group）' })
  @IsOptional()
  @IsString()
  group?: string;
}
