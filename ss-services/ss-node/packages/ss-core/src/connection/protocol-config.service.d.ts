// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventEmitter2 } from '@nestjs/event-emitter';
export interface ProtocolConfig {
  deviceId: string;
  protocol: string;
  host: string;
  port: number;
  enabled: boolean;
  params: Record<string, any>;
  updatedAt: number;
}
export declare class ProtocolConfigService {
  private readonly eventEmitter;
  private readonly logger;
  private configs;
  private changeListeners;
  constructor(eventEmitter: EventEmitter2);
  registerConfig(config: ProtocolConfig): void;
  getConfig(deviceId: string): ProtocolConfig | undefined;
  getAllConfigs(): ProtocolConfig[];
  getConfigsByProtocol(protocol: string): ProtocolConfig[];
  updateConfig(deviceId: string, partial: Partial<ProtocolConfig>): Promise<ProtocolConfig>;
  removeConfig(deviceId: string): void;
  enableDevice(deviceId: string): Promise<ProtocolConfig>;
  disableDevice(deviceId: string): Promise<ProtocolConfig>;
  onChange(deviceId: string, listener: (config: ProtocolConfig) => void): () => void;
}
