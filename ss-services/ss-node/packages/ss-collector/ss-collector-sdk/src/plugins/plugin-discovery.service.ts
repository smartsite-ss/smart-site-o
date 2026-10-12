// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PluginRegistry } from './plugin-registry';
import { CollectorPluginMeta, DiscoveredPlugin } from './plugin.types';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PluginDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(PluginDiscoveryService.name);

  constructor(
    private readonly registry: PluginRegistry,
    private readonly pathResolver: PathResolverService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.discoverPlugins();
  }

  /**
   * 扫描已安装的采集插件
   */
  async discoverPlugins(): Promise<DiscoveredPlugin[]> {
    const discovered: DiscoveredPlugin[] = [];
    const scanPaths = this.getScanPaths();

    for (const scanPath of scanPaths) {
      if (!fs.existsSync(scanPath)) {
        this.logger.debug(`Plugin scan path not found: ${scanPath}`);
        continue;
      }

      let packages: fs.Dirent[];
      try {
        packages = fs
          .readdirSync(scanPath, { withFileTypes: true })
          .filter((d) => d.isDirectory() && d.name.startsWith('ss-collector-'));
      } catch {
        continue;
      }

      for (const pkg of packages) {
        try {
          const plugin = await this.loadPluginMeta(path.join(scanPath, pkg.name));
          if (plugin) {
            discovered.push(plugin);
          }
        } catch (error) {
          this.logger.error(
            `Failed to load plugin meta for ${pkg.name}: ${(error as Error).message}`,
          );
        }
      }
    }

    this.logger.log(`Discovered ${discovered.length} collector plugins`);
    return discovered;
  }

  /**
   * 获取扫描路径列表
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 5 级 = ss-services/ss-node
   *   （本文件位于 packages/ss-collector/ss-collector-sdk/dist/plugins/）
   *   dev 模式下扫描 packages/ss-collector/（源码插件），node_modules/@ss-data 不存在
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   prod 模式下扫描 node_modules/@ss-data（已安装的插件），packages/ss-collector 不存在
   *
   * 修复历史：之前用 process.cwd() 解析，dev 模式下 cwd = apps/ss-node-server，
   * 导致 packages/ss-collector 被解析为 apps/ss-node-server/packages/ss-collector（不存在），
   * dev 模式下找不到插件。
   */
  private getScanPaths(): string[] {
    const paths: string[] = [];
    const projectRoot = this.pathResolver.getProjectRoot();

    const nodeModules = path.resolve(projectRoot, 'node_modules', '@ss-data');
    if (fs.existsSync(nodeModules)) {
      paths.push(nodeModules);
    }

    const packagesDir = path.resolve(projectRoot, 'packages', 'ss-collector');
    if (fs.existsSync(packagesDir)) {
      paths.push(packagesDir);
    }

    return paths;
  }

  /**
   * 加载单个插件的元数据
   */
  private async loadPluginMeta(pkgPath: string): Promise<DiscoveredPlugin | null> {
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return null;

    let pkgJson: any;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    } catch {
      return null;
    }

    const meta: CollectorPluginMeta = pkgJson.collectorPlugin;
    if (!meta?.protocol) {
      return null;
    }

    this.validateMeta(meta);

    const discovered: DiscoveredPlugin = {
      meta,
      packageName: pkgJson.name,
      packageVersion: pkgJson.version,
      status: 'discovered',
    };

    // 尝试动态加载模块
    try {
      const module = await import(pkgJson.name);
      if (module && module.default?.adapterToken) {
        discovered.module = module;
        discovered.adapter = module.default;
      }
    } catch {
      this.logger.debug(
        `Plugin ${meta.protocol} discovered but module not loaded (may need registration)`,
      );
    }

    return discovered;
  }

  /**
   * 验证插件元数据
   */
  private validateMeta(meta: CollectorPluginMeta): void {
    const required: (keyof CollectorPluginMeta)[] = [
      'protocol',
      'displayName',
      'version',
      'connectionSchema',
      'category',
      'transport',
      'supportedDataTypes',
      'enabledByDefault',
    ];
    for (const field of required) {
      if (meta[field] === undefined || meta[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}
