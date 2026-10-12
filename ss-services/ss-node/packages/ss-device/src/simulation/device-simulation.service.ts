// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceDataService } from '../data/device-data.service';

export type SimulationMode = 'random' | 'sine' | 'step' | 'ramp' | 'script';

export interface SimulationConfig {
  enabled: boolean;
  mode: SimulationMode;
  minValue?: number;
  maxValue?: number;
  interval?: number; // ms
  script?: string; // Custom script
  tagIds?: string[]; // 关联的 Tag ID 列表
}

@Injectable()
export class DeviceSimulationService implements OnModuleDestroy {
  private readonly logger = new Logger(DeviceSimulationService.name);
  private activeSimulations = new Map<string, NodeJS.Timeout>();

  constructor(
    @Optional()
    @Inject(forwardRef(() => DeviceDataService))
    private deviceDataService?: DeviceDataService,
    private configService?: ConfigService,
  ) {}

  startSimulation(deviceId: string, config: SimulationConfig): void {
    if (this.activeSimulations.has(deviceId)) {
      this.stopSimulation(deviceId);
    }

    const defaultInterval =
      this.configService?.get<number>('DEVICE_SIMULATION_DEFAULT_INTERVAL_MS') || 1000;

    const timer = setInterval(() => {
      const value = this.generateValue(config);
      this.logger.debug(`Simulation [${deviceId}][${config.mode}]: ${value}`);

      // 注入仿真数据到最新值缓存
      if (this.deviceDataService && config.tagIds?.length) {
        for (const tagId of config.tagIds) {
          this.deviceDataService.updateLatestValue(tagId, deviceId, value, 'good').catch((err) => {
            this.logger.error(`Failed to update simulated value for tag ${tagId}: ${err.message}`);
          });
        }
      }
    }, config.interval || defaultInterval);

    this.activeSimulations.set(deviceId, timer);
    this.logger.log(`Simulation started for device ${deviceId}: mode=${config.mode}`);
  }

  stopSimulation(deviceId: string): void {
    const timer = this.activeSimulations.get(deviceId);
    if (timer) {
      clearInterval(timer);
      this.activeSimulations.delete(deviceId);
      this.logger.log(`Simulation stopped for device ${deviceId}`);
    }
  }

  isSimulating(deviceId: string): boolean {
    return this.activeSimulations.has(deviceId);
  }

  onModuleDestroy(): void {
    for (const timer of this.activeSimulations.values()) {
      clearInterval(timer);
    }
    this.activeSimulations.clear();
    this.logger.log('All simulations stopped on module destroy');
  }

  private generateValue(config: SimulationConfig): number {
    const min = config.minValue ?? 0;
    const max = config.maxValue ?? 100;
    switch (config.mode) {
      case 'random':
        return min + Math.random() * (max - min);
      case 'sine':
        return min + ((max - min) * (Math.sin(Date.now() / 1000) + 1)) / 2;
      case 'step':
        return Math.random() > 0.5 ? min : max;
      case 'ramp':
        return min + ((Date.now() % 10000) / 10000) * (max - min);
      default:
        return min + Math.random() * (max - min);
    }
  }
}
