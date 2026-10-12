// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ResourceMonitorService } from '../monitor/resource-monitor.service';
import { EventBusService, PathResolverService } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => ({
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    emitHealthDegraded: jest.fn(),
  })),
  PathResolverService: jest.fn().mockImplementation(() => ({
    resolve: jest.fn((p: string) => p),
    getProjectRoot: jest.fn().mockReturnValue('/fake/project-root'),
  })),
  EventBusModule: class {},
}));

jest.mock('os', () => ({
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024),
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024),
  loadavg: jest.fn(() => [0.5, 0.3, 0.1]),
  cpus: jest.fn(() => [
    { model: 'CPU', speed: 2000, times: { user: 100, nice: 0, sys: 50, idle: 800, irq: 0 } },
  ]),
  networkInterfaces: jest.fn(() => ({
    eth0: [
      {
        address: '192.168.1.1',
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: 'aa:bb:cc:dd:ee:ff',
        internal: false,
      },
    ],
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

describe('ResourceMonitorService', () => {
  let service: ResourceMonitorService;
  let mockEventBus: any;

  beforeEach(async () => {
    mockEventBus = {
      emit: jest.fn(),
      emitHealthDegraded: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceMonitorService,
        { provide: EventBusService, useValue: mockEventBus },
        {
          provide: PathResolverService,
          useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') },
        },
      ],
    }).compile();

    service = module.get<ResourceMonitorService>(ResourceMonitorService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stopMonitoring();
  });

  describe('collectSnapshot', () => {
    it('TC-MON-001: should collect resource snapshot', async () => {
      const snapshot = await service.collectSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.cpu).toBeDefined();
      expect(snapshot.cpu.usagePercent).toBeDefined();
      expect(snapshot.memory).toBeDefined();
      expect(snapshot.memory.heapUsed).toBeDefined();
      expect(snapshot.disk).toBeDefined();
      expect(snapshot.network).toBeDefined();
    });

    it('TC-MON-002: should store history data', async () => {
      await service.collectSnapshot();
      const latest = service.getLatest();

      expect(latest).toBeDefined();
      expect(latest!.cpu).toBeDefined();
    });
  });

  describe('getLatest', () => {
    it('TC-MON-010: should return null when no data', () => {
      const result = service.getLatest();

      expect(result).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('TC-MON-020: should return history within time range', async () => {
      await service.collectSnapshot();
      const history = service.getHistory(24);

      expect(history.length).toBeGreaterThan(0);
    });

    it('TC-MON-021: should return empty history for zero hours', () => {
      const history = service.getHistory(0);

      expect(history.length).toBe(0);
    });
  });

  describe('startMonitoring/stopMonitoring', () => {
    it('TC-MON-030: should start and stop monitoring', () => {
      service.stopMonitoring();
      service.startMonitoring();
      service.stopMonitoring();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
