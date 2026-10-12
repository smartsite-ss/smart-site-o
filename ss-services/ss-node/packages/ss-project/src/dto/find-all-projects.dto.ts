// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@ss-node/ss-sdk';

/**
 * 项目列表查询 DTO
 *
 * 继承分页参数（page/pageSize/keyword/sortBy/sortOrder），
 * 新增 `includeDisabled` 字段以通过全局 ValidationPipe 的 forbidNonWhitelisted 校验。
 *
 * - 项目管理页传 `includeDisabled=true` 查看全部项目（含停用），便于切换启用状态
 * - 设备管理 / 首页统计 / 编辑器等运营场景不传（默认 false），仅看启用项目
 */
export class FindAllProjectsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '是否包含停用项目（项目管理页传 true 查看全部；设备管理/首页/编辑器默认 false 仅看启用）',
    example: true,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeDisabled?: boolean;
}
