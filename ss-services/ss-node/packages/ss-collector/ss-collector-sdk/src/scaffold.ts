// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import * as path from 'path';

export interface ScaffoldOptions {
  /** 插件名称（如 "bacnet"），生成 ss-collector-{name} 目录 */
  name: string;
  /** 显示名称（如 "BACnet/IP"） */
  displayName: string;
  /** 协议分类 */
  category: string;
  /** 传输层类型 */
  transport: string;
  /** 作者 */
  author: string;
  /** 目标输出目录（默认为 packages/ss-collector/） */
  outputDir?: string;
}

export interface ScaffoldResult {
  /** 生成的目录绝对路径 */
  outputPath: string;
  /** 生成的包名 */
  packageName: string;
  /** 生成的文件列表 */
  files: string[];
}

/**
 * 采集插件脚手架生成器
 *
 * 根据输入参数生成完整的插件项目目录结构，包括：
 * - package.json（含 collectorPlugin 元数据）
 * - tsconfig.json
 * - src/index.ts / src/{name}.module.ts / src/{name}.service.ts / src/{name}.types.ts
 * - src/__tests__/{name}.service.spec.ts
 * - examples/basic-usage.ts
 * - CHANGELOG.md / README.md
 */
export function scaffoldPlugin(options: ScaffoldOptions): ScaffoldResult {
  const { name, displayName, category, transport, author, outputDir } = options;

  const packageName = `ss-collector-${name}`;
  // 默认输出目录：项目根 + packages/ss-collector
  // - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-collector/ss-collector-sdk/dist/）
  // - 生产模式：process.cwd() = ss-run/ss/services/ss-node
  const projectRoot =
    process.env.NODE_ENV === 'production'
      ? process.cwd()
      : path.resolve(__dirname, '..', '..', '..', '..');
  const baseDir = outputDir || path.resolve(projectRoot, 'packages', 'ss-collector');
  const outputPath = path.resolve(baseDir, packageName);

  if (fs.existsSync(outputPath)) {
    throw new Error(`Directory already exists: ${outputPath}`);
  }

  const files: string[] = [];

  // 确保输出目录存在
  fs.mkdirSync(outputPath, { recursive: true });

  // ---- package.json ----
  const pkgJson = generatePackageJson(name, displayName, category, transport, author);
  writeFile(outputPath, 'package.json', JSON.stringify(pkgJson, null, 2) + '\n', files);

  // ---- tsconfig.json ----
  const tsconfig = generateTsconfig();
  writeFile(outputPath, 'tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n', files);

  // ---- src/ ----
  const srcDir = path.join(outputPath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  writeFile(srcDir, 'index.ts', generateIndexContent(name), files);
  writeFile(srcDir, `${name}.module.ts`, generateModuleContent(name), files);
  writeFile(
    srcDir,
    `${name}.service.ts`,
    generateServiceContent(name, displayName, category, transport, author),
    files,
  );
  writeFile(srcDir, `${name}.types.ts`, generateTypesContent(name), files);

  // ---- src/__tests__/ ----
  const testDir = path.join(srcDir, '__tests__');
  fs.mkdirSync(testDir, { recursive: true });
  writeFile(testDir, `${name}.service.spec.ts`, generateTestContent(name), files);

  // ---- examples/ ----
  const examplesDir = path.join(outputPath, 'examples');
  fs.mkdirSync(examplesDir, { recursive: true });
  writeFile(examplesDir, 'basic-usage.ts', generateExampleContent(name), files);

  // ---- CHANGELOG.md ----
  writeFile(outputPath, 'CHANGELOG.md', generateChangelog(name), files);

  // ---- README.md ----
  writeFile(outputPath, 'README.md', generateReadme(name, displayName), files);

  return {
    outputPath,
    packageName: `@ss-node/${packageName}`,
    files,
  };
}

// ---- 模板生成函数 ----

function generatePackageJson(
  name: string,
  displayName: string,
  category: string,
  transport: string,
  author: string,
): Record<string, any> {
  return {
    name: `@ss-node/ss-collector-${name}`,
    version: '0.1.0',
    private: true,
    description: `Smart SCADA ${displayName} Collector`,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      clean: 'rm -rf dist',
      test: 'jest',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      '@nestjs/common': '^10.3.0',
      '@ss-node/ss-core': 'workspace:*',
      '@ss-node/ss-device': 'workspace:*',
      '@ss-node/ss-sdk': 'workspace:*',
      'reflect-metadata': '^0.1.14',
    },
    devDependencies: {
      '@types/jest': '^29.5.0',
      '@types/node': '^20.0.0',
      jest: '^29.7.0',
      'ts-jest': '^29.4.0',
      typescript: '^5.0.0',
    },
    /** 采集插件元数据（PluginDiscoveryService 读取） */
    collectorPlugin: {
      protocol: name,
      displayName: displayName,
      version: '0.1.0',
      description: `${displayName} 协议采集插件`,
      author: author,
      category: category,
      transport: transport,
      connectionSchema: {
        type: 'object',
        required: ['host', 'port'],
        properties: {
          host: { type: 'string', title: '设备IP地址', default: '127.0.0.1' },
          port: { type: 'number', title: '端口号', default: 0 },
          timeout: { type: 'number', title: '请求超时(ms)', default: 3000 },
        },
      },
      defaultConnection: { host: '127.0.0.1', port: 0, timeout: 3000 },
      supportedDataTypes: ['uint16', 'int16', 'float32', 'bool', 'string'],
      enabledByDefault: true,
      tags: [name, category],
    },
  };
}

function generateTsconfig(): Record<string, any> {
  return {
    extends: '../../../tsconfig.base.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      baseUrl: '.',
    },
    include: ['src/**/*'],
  };
}

function generateIndexContent(name: string): string {
  const PascalName = toPascalCase(name);
  return `export { ${PascalName}CollectorModule } from './${name}.module';
export { ${PascalName}Service, ${PascalName}Config } from './${name}.service';
export * from './${name}.types';
`;
}

function generateModuleContent(name: string): string {
  const PascalName = toPascalCase(name);
  return `import { Module } from '@nestjs/common';
import { ${PascalName}Service } from './${name}.service';

@Module({
  providers: [${PascalName}Service],
  exports: [${PascalName}Service],
})
export class ${PascalName}CollectorModule {}
`;
}

function generateServiceContent(
  name: string,
  displayName: string,
  category: string,
  transport: string,
  _author: string,
): string {
  const PascalName = toPascalCase(name);
  return `import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IProtocolAdapter, IDeviceContext, ITagContext } from '@ss-node/ss-collector-sdk';
import { CollectorPlugin, PluginCategory } from '@ss-node/ss-collector-sdk';
import { ${PascalName}Config } from './${name}.types';

@Injectable()
@CollectorPlugin({
  protocol: '${name}',
  displayName: '${displayName}',
  version: '0.1.0',
  description: '${displayName} 协议采集插件',
  category: PluginCategory.${toCategoryEnum(category)},
  transport: '${transport}',
  connectionSchema: {
    type: 'object',
    required: ['host', 'port'],
    properties: {
      host: { type: 'string', title: '设备IP地址', default: '127.0.0.1' },
      port: { type: 'number', title: '端口号', default: 0 },
      timeout: { type: 'number', title: '请求超时(ms)', default: 3000 },
    },
  },
  defaultConnection: { host: '127.0.0.1', port: 0, timeout: 3000 },
  supportedDataTypes: ['uint16', 'int16', 'float32', 'bool', 'string'],
  enabledByDefault: true,
  tags: ['${name}', '${category}'],
})
export class ${PascalName}Service implements IProtocolAdapter, OnModuleDestroy {
  private readonly logger = new Logger(${PascalName}Service.name);
  private clients = new Map<string, any>();
  private connectionStatus = new Map<string, boolean>();

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all ${displayName} connections...');
    for (const [deviceId, client] of this.clients) {
      try {
        // TODO: 实现协议特定的断开连接逻辑
        await this.disconnect(client);
      } catch (error) {
        this.logger.error(\`Error closing connection for device \${deviceId}: \${(error as Error).message}\`);
      }
    }
    this.clients.clear();
    this.connectionStatus.clear();
  }

  async connect(device: IDeviceContext): Promise<any> {
    const deviceId = device.id || \`${name}-\${Date.now()}\`;
    const config: ${PascalName}Config = {
      host: device.connection.host || '127.0.0.1',
      port: device.connection.port || 0,
      timeout: device.connection.timeout || 3000,
    };

    try {
      if (this.clients.has(deviceId)) {
        this.logger.log(\`Device \${deviceId} already connected\`);
        return { type: '${name}', deviceId, config };
      }

      this.logger.log(\`Connecting to ${displayName} \${config.host}:\${config.port}\`);

      // TODO: 实现协议特定的连接逻辑
      const client = await this.createClient(config);

      this.clients.set(deviceId, client);
      this.connectionStatus.set(deviceId, true);

      this.logger.log(\`Successfully connected to device \${deviceId}\`);
      return { type: '${name}', deviceId, config };
    } catch (error) {
      this.connectionStatus.set(deviceId, false);
      this.logger.error(\`Failed to connect to device \${deviceId}: \${(error as Error).message}\`);
      throw error;
    }
  }

  async disconnect(client: any): Promise<void> {
    if (!client) return;

    try {
      // TODO: 实现协议特定的断开连接逻辑
      this.logger.debug('Disconnecting from ${displayName} device');

      for (const [deviceId, c] of this.clients) {
        if (c === client) {
          this.clients.delete(deviceId);
          this.connectionStatus.set(deviceId, false);
          this.logger.log(\`Disconnected from device \${deviceId}\`);
          break;
        }
      }
    } catch (error) {
      this.logger.error(\`Error during disconnect: \${(error as Error).message}\`);
    }
  }

  async readTag(client: any, tag: ITagContext): Promise<{ tagId: string; value: any; timestamp: Date; quality: string }> {
    const tagId = tag.id || 'unknown-tag';

    try {
      // TODO: 实现协议特定的标签读取逻辑
      const value = await this.doReadTag(client, tag);

      return {
        tagId,
        value,
        timestamp: new Date(),
        quality: 'good',
      };
    } catch (error) {
      this.logger.warn(\`Failed to read tag \${tagId}: \${(error as Error).message}\`);
      return {
        tagId,
        value: null,
        timestamp: new Date(),
        quality: 'bad',
      };
    }
  }

  async writeTag(client: any, tag: ITagContext, value: any): Promise<void> {
    const tagId = tag.id || 'unknown-tag';

    try {
      // TODO: 实现协议特定的标签写入逻辑
      await this.doWriteTag(client, tag, value);
      this.logger.debug(\`Wrote tag \${tagId}\`);
    } catch (error) {
      this.logger.error(\`Failed to write tag \${tagId}: \${(error as Error).message}\`);
      throw error;
    }
  }

  async readBatch(client: any, tags: Array<{ id: string; address: string; dataType?: string }>): Promise<Array<{ tagId: string; value: any; timestamp: Date; quality: string }>> {
    if (!tags || tags.length === 0) return [];

    const results: Array<{ tagId: string; value: any; timestamp: Date; quality: string }> = [];

    for (const tag of tags) {
      try {
        const result = await this.readTag(client, tag as any);
        results.push(result);
      } catch (error) {
        results.push({
          tagId: tag.id,
          value: null,
          timestamp: new Date(),
          quality: 'bad',
        });
      }
    }

    return results;
  }

  getConnectionStatus(): Map<string, boolean> {
    return new Map(this.connectionStatus);
  }

  isConnected(deviceId: string): boolean {
    return this.connectionStatus.get(deviceId) || false;
  }

  // ---- 私有方法 ----

  private async createClient(config: ${PascalName}Config): Promise<any> {
    // TODO: 实现协议特定的客户端创建逻辑
    this.logger.debug(\`Creating client for \${config.host}:\${config.port}\`);
    return { host: config.host, port: config.port, timeout: config.timeout };
  }

  private async doReadTag(client: any, tagConfig: Record<string, any>): Promise<any> {
    // TODO: 实现协议特定的标签读取逻辑
    return null;
  }

  private async doWriteTag(client: any, tagConfig: Record<string, any>, value: any): Promise<void> {
    // TODO: 实现协议特定的标签写入逻辑
  }
}
`;
}

function generateTypesContent(name: string): string {
  const PascalName = toPascalCase(name);
  return `/** ${PascalName} 连接配置 */
export interface ${PascalName}Config {
  host: string;
  port: number;
  timeout: number;
}

/** ${PascalName} 读取结果 */
export interface ${PascalName}ReadResult {
  tagId: string;
  value: any;
  rawValue: any;
  timestamp: Date;
  quality: 'good' | 'uncertain' | 'bad';
  error?: string;
}
`;
}

function generateTestContent(name: string): string {
  const PascalName = toPascalCase(name);
  return `import { ${PascalName}Service } from '../${name}.service';

describe('${PascalName}Service', () => {
  let service: ${PascalName}Service;

  beforeEach(() => {
    service = new ${PascalName}Service();
  });

  describe('connect', () => {
    it('should connect to ${name} device successfully', async () => {
      const config = {
        id: 'device-001',
        host: '127.0.0.1',
        port: 0,
        timeout: 3000,
      };

      const result = await service.connect(config);

      expect(result).toBeDefined();
      expect(result.type).toBe('${name}');
      expect(result.deviceId).toBe('device-001');
      expect(service.isConnected('device-001')).toBe(true);
    });

    it('should use default values when config is minimal', async () => {
      const result = await service.connect({});

      expect(result).toBeDefined();
      expect(result.type).toBe('${name}');
      expect(result.deviceId).toMatch(/^${name}-\\d+$/);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clean up', async () => {
      const config = { id: 'device-001', host: '127.0.0.1', port: 0 };
      const client = await service.connect(config);

      await service.disconnect(client);

      expect(service.isConnected('device-001')).toBe(false);
    });

    it('should do nothing if client is null', async () => {
      await expect(service.disconnect(null)).resolves.toBeUndefined();
    });
  });

  describe('readTag', () => {
    it('should read a tag successfully', async () => {
      const config = { id: 'device-001', host: '127.0.0.1', port: 0 };
      const client = await service.connect(config);

      const result = await service.readTag(client, {
        id: 'tag-001',
        address: '1',
      });

      expect(result.tagId).toBe('tag-001');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('writeTag', () => {
    it('should write a tag successfully', async () => {
      const config = { id: 'device-001', host: '127.0.0.1', port: 0 };
      const client = await service.connect(config);

      await expect(
        service.writeTag(client, { id: 'tag-001', address: '1' }, 123),
      ).resolves.toBeUndefined();
    });
  });

  describe('readBatch', () => {
    it('should return empty array for empty tags', async () => {
      const config = { id: 'device-001', host: '127.0.0.1', port: 0 };
      const client = await service.connect(config);

      const results = await service.readBatch(client, []);
      expect(results).toEqual([]);
    });
  });

  describe('connection status', () => {
    it('should return false for unknown device', () => {
      expect(service.isConnected('unknown')).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all connections', async () => {
      const config1 = { id: 'dev1', host: '127.0.0.1', port: 0 };
      const config2 = { id: 'dev2', host: '127.0.0.1', port: 1 };
      await service.connect(config1);
      await service.connect(config2);

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
`;
}

function generateExampleContent(name: string): string {
  const PascalName = toPascalCase(name);
  return `/**
 * ${PascalName} 采集插件基本使用示例
 */
import { ${PascalName}Service } from '../src/${name}.service';

async function main() {
  const service = new ${PascalName}Service();

  try {
    // 1. 连接设备
    const client = await service.connect({
      id: 'my-device',
      host: '127.0.0.1',
      port: 0,
      timeout: 3000,
    });
    console.log('Connected:', client);

    // 2. 读取标签
    const result = await service.readTag(client, {
      id: 'tag-001',
      address: '1',
    });
    console.log('Read result:', result);

    // 3. 写入标签
    await service.writeTag(client, { id: 'tag-001', address: '1' }, 123);
    console.log('Write successful');

    // 4. 断开连接
    await service.disconnect(client);
    console.log('Disconnected');
  } catch (error) {
    console.error('Error:', (error as Error).message);
  } finally {
    await service.onModuleDestroy();
  }
}

main();
`;
}

function generateChangelog(name: string): string {
  return `# Changelog

All notable changes to the ${name} collector plugin will be documented in this file.

## [0.1.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial scaffold of ${name} collector plugin
- Basic connect/disconnect/readTag/writeTag/readBatch API
`;
}

function generateReadme(name: string, displayName: string): string {
  return `# @ss-node/ss-collector-${name}

Smart SCADA ${displayName} Collector — ${displayName} 协议采集插件。

## Exports

- \`${toPascalCase(name)}CollectorModule\` — NestJS 模块
- \`${toPascalCase(name)}Service\` — 实现 \`IProtocolAdapter\` 接口

## Usage

\`\`\`typescript
import { ${toPascalCase(name)}CollectorModule } from '@ss-node/ss-collector-${name}';
\`\`\`

## Development

\`\`\`bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 运行测试
pnpm test
\`\`\`
`;
}

// ---- 辅助函数 ----

function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCategoryEnum(category: string): string {
  switch (category) {
    case 'industrial_bus':
      return 'INDUSTRIAL_BUS';
    case 'iot':
      return 'IOT';
    case 'power':
      return 'POWER';
    case 'building':
      return 'BUILDING';
    default:
      return 'CUSTOM';
  }
}

function writeFile(baseDir: string, filename: string, content: string, files: string[]): void {
  const filePath = path.join(baseDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  files.push(filePath);
}
