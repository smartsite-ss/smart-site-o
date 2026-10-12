// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 创建基础服务 DTO */
export class CreateBaseServiceDto {
  @ApiProperty({ description: '软件唯一标识名称（英文，用于 API 路径）', example: 'redis' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: '名称必须以字母开头，只能包含字母、数字、下划线和连字符',
  })
  name: string;

  @ApiProperty({ description: '显示名称', example: 'Redis 缓存服务' })
  @IsString()
  @MaxLength(128)
  displayName: string;

  @ApiPropertyOptional({ description: '描述信息' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '可执行文件路径', example: 'C:/redis/redis-server.exe' })
  @IsString()
  @IsOptional()
  binaryPath?: string;

  @ApiPropertyOptional({ description: '启动参数（空格分隔）', example: '--port 6379' })
  @IsString()
  @IsOptional()
  startArgs?: string;

  @ApiPropertyOptional({ description: '配置文件路径', example: 'C:/redis/redis.conf' })
  @IsString()
  @IsOptional()
  configPath?: string;

  @ApiPropertyOptional({ description: '日志目录路径', example: 'C:/redis/logs' })
  @IsString()
  @IsOptional()
  logDir?: string;

  @ApiPropertyOptional({ description: '数据目录路径', example: 'C:/redis/data' })
  @IsString()
  @IsOptional()
  dataDir?: string;

  @ApiPropertyOptional({ description: '进程名称（用于状态监控）', example: 'redis-server.exe' })
  @IsString()
  @IsOptional()
  processName?: string;

  @ApiPropertyOptional({ description: '占用端口（0=不检测）', example: 6379 })
  @IsInt()
  @Min(0)
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: '启动脚本（为空时使用 binaryPath 启动）' })
  @IsString()
  @IsOptional()
  startScript?: string;

  @ApiPropertyOptional({ description: '停止脚本（为空时默认 taskkill /F /IM <processName>）' })
  @IsString()
  @IsOptional()
  stopScript?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '是否自动启动', default: false })
  @IsBoolean()
  @IsOptional()
  autoStart?: boolean;

  @ApiPropertyOptional({
    description: '是否启用进程守护（定时检测进程存活，异常退出自动拉起）',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  processGuard?: boolean;

  @ApiPropertyOptional({ description: '排序权重', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

/** 更新基础服务 DTO */
export class UpdateBaseServiceDto {
  @ApiPropertyOptional({ description: '显示名称' })
  @IsString()
  @MaxLength(128)
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: '描述信息' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '可执行文件路径' })
  @IsString()
  @IsOptional()
  binaryPath?: string;

  @ApiPropertyOptional({ description: '启动参数' })
  @IsString()
  @IsOptional()
  startArgs?: string;

  @ApiPropertyOptional({ description: '配置文件路径' })
  @IsString()
  @IsOptional()
  configPath?: string;

  @ApiPropertyOptional({ description: '日志目录路径' })
  @IsString()
  @IsOptional()
  logDir?: string;

  @ApiPropertyOptional({ description: '数据目录路径' })
  @IsString()
  @IsOptional()
  dataDir?: string;

  @ApiPropertyOptional({ description: '进程名称' })
  @IsString()
  @IsOptional()
  processName?: string;

  @ApiPropertyOptional({ description: '占用端口' })
  @IsInt()
  @Min(0)
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: '启动脚本' })
  @IsString()
  @IsOptional()
  startScript?: string;

  @ApiPropertyOptional({ description: '停止脚本' })
  @IsString()
  @IsOptional()
  stopScript?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '是否自动启动' })
  @IsBoolean()
  @IsOptional()
  autoStart?: boolean;

  @ApiPropertyOptional({ description: '是否启用进程守护' })
  @IsBoolean()
  @IsOptional()
  processGuard?: boolean;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
