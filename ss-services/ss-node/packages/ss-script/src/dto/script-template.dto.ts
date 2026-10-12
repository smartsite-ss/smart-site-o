// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptTriggerType } from '../entities/script.entity';
import { TemplateCategory } from '../entities/script-template.entity';

export class CreateScriptTemplateDto {
  @ApiProperty({ description: '模板名称' })
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  description?: string;

  @ApiProperty({ enum: TemplateCategory, description: '模板分类' })
  category: TemplateCategory;

  @ApiProperty({ enum: ScriptTriggerType, description: '触发类型' })
  triggerType: ScriptTriggerType;

  @ApiPropertyOptional({ description: '触发器配置 (JSON string)' })
  triggerConfig?: string;

  @ApiProperty({ description: '脚本代码' })
  code: string;

  @ApiPropertyOptional({ type: [String], description: '标签列表' })
  tags?: string[];

  @ApiPropertyOptional({ description: '作者' })
  author?: string;

  @ApiPropertyOptional({ default: '1.0.0', description: '版本号' })
  version?: string;
}

export class UpdateScriptTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  name?: string;

  @ApiPropertyOptional({ description: '模板描述' })
  description?: string;

  @ApiPropertyOptional({ enum: TemplateCategory, description: '模板分类' })
  category?: TemplateCategory;

  @ApiPropertyOptional({ enum: ScriptTriggerType, description: '触发类型' })
  triggerType?: ScriptTriggerType;

  @ApiPropertyOptional({ description: '触发器配置 (JSON string)' })
  triggerConfig?: string;

  @ApiPropertyOptional({ description: '脚本代码' })
  code?: string;

  @ApiPropertyOptional({ type: [String], description: '标签列表' })
  tags?: string[];

  @ApiPropertyOptional({ description: '作者' })
  author?: string;

  @ApiPropertyOptional({ description: '版本号' })
  version?: string;
}

export class InstantiateTemplateDto {
  @ApiProperty({ description: '新脚本名称' })
  name: string;
}
