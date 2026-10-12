// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SetMetadata } from '@nestjs/common';
import { CollectorPluginMeta } from './plugin.types';

export const COLLECTOR_PLUGIN_META = 'COLLECTOR_PLUGIN_META';

/**
 * 采集插件装饰器
 *
 * 在协议适配器类上使用，自动注册到 PluginRegistry。
 *
 * @example
 * @CollectorPlugin({
 *   protocol: 'modbus_tcp',
 *   displayName: 'Modbus TCP',
 *   version: '1.0.0',
 *   description: 'Modbus TCP/IP 协议采集插件',
 *   category: PluginCategory.INDUSTRIAL_BUS,
 *   transport: 'tcp',
 *   connectionSchema: { ... },
 *   defaultConnection: { host: '127.0.0.1', port: 502 },
 *   supportedDataTypes: ['uint16', 'int16', 'float32', 'bool'],
 *   enabledByDefault: true,
 * })
 * @Injectable()
 * export class ModbusService implements IProtocolAdapter { ... }
 */
export function CollectorPlugin(meta: CollectorPluginMeta): ClassDecorator {
  return SetMetadata(COLLECTOR_PLUGIN_META, meta);
}
