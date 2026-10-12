// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SystemInfoService } from '../info/system-info.service';
import { ScadaWebSocketGateway } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => ({
  ScadaWebSocketGateway: class ScadaWebSocketGateway {},
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => false),
}));

describe('SystemInfoService', () => {
  let service: SystemInfoService;
  let mockDataSource: any;
  let mockWsGateway: any;

  beforeEach(async () => {
    mockDataSource = {
      options: { type: 'sqlite' },
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return Promise.resolve([
            { name: 'sys_users' },
            { name: 'dev_data_tags' },
            { name: 'dev_devices' },
          ]);
        }
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([{ cnt: 100 }]);
        }
        return Promise.resolve([]);
      }),
    };

    mockWsGateway = {
      getConnectionCount: jest.fn(() => 5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemInfoService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ScadaWebSocketGateway, useValue: mockWsGateway },
      ],
    }).compile();

    service = module.get<SystemInfoService>(SystemInfoService);
    jest.clearAllMocks();
  });

  describe('getInfo', () => {
    it('TC-INFO-001: should return system info with all fields', async () => {
      const result = await service.getInfo();

      expect(result.appName).toBe('ss-data-server');
      expect(result.version).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.memory.rss).toBeDefined();
      expect(result.memory.heapUsed).toBeDefined();
      expect(result.memory.heapTotal).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.database.type).toBe('sqlite');
      expect(result.connections).toBeDefined();
      expect(result.connections.wsConnections).toBe(5);
    });

    it('TC-INFO-002: should return database info', async () => {
      const result = await service.getInfo();

      expect(result.database.type).toBe('sqlite');
      expect(result.database.tables).toBe(3);
      expect(result.database.recordCount).toBe(300);
    });

    it('TC-INFO-003: should return version and build info', async () => {
      const result = await service.getInfo();

      expect(result.version).toBe('0.0.0');
      expect(result.buildTime).toBe('');
    });

    it('TC-INFO-004: should return connection stats', async () => {
      const result = await service.getInfo();

      expect(result.connections.wsConnections).toBe(5);
      expect(result.connections.devicesOnline).toBe(0);
    });
  });
});
