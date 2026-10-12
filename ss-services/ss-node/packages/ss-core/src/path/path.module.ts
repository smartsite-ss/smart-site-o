// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Global, Module } from '@nestjs/common';
import { PathResolverService } from './path-resolver.service';

/**
 * 路径解析全局模块
 *
 * 提供 PathResolverService 作为全局单例，所有 packages 下的服务通过 DI 注入此服务
 * 来解析环境变量中配置的相对路径（PROJECTS_DIR、TEMPLATES_DIR、DICTS_DIR 等），
 * 彻底消除 __dirname 上溯依赖。
 *
 * 依赖 SS_NODE_ROOT 环境变量（由 app.module.ts 在启动时设置）作为项目根目录。
 */
@Global()
@Module({
  providers: [PathResolverService],
  exports: [PathResolverService],
})
export class PathModule {}
