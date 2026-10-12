// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

/**
 * 知识库模块 — 纯文件方案
 *
 * 不依赖 TypeORM/数据库，仅通过文件系统 + manifest.json 管理。
 * 需要依赖 gray-matter（Markdown frontmatter 解析）。
 */
@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
