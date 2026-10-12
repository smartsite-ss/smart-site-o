// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { SystemConfigController } from '../config/system-config.controller';
import {
  SystemConfigService,
  ConfigItemView,
  ConfigUpdateResult,
} from '../config/system-config.service';
import { SystemRestartService, RestartState } from '../restart/system-restart.service';

// Mock swagger decorators
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiBearerAuth: () => noop(),
  };
});

// Mock auth guards and roles guard to always pass
jest.mock('@ss-node/ss-core', () => ({
  JwtAuthGuard: class MockJwtAuthGuard implements CanActivate {
    canActivate() {
      return true;
    }
  },
  RolesGuard: class MockRolesGuard implements CanActivate {
    canActivate() {
      return true;
    }
  },
  Roles:
    (..._roles: any[]) =>
    (target: any, key?: string, descriptor?: any) =>
      descriptor ?? target,
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    emitConfigChanged: jest.fn(),
  })),
  EventBusModule: class {},
}));

// Sample ConfigItemView
const sampleConfigItems: ConfigItemView[] = [
  {
    key: 'PORT',
    category: 'application',
    categoryLabel: '应用配置',
    description: '后端服务监听端口',
    defaultValue: '4000',
    type: 'number',
    enumValues: undefined,
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    validation: { min: 1, max: 65535 },
    value: '4000',
    source: 'default',
  },
  {
    key: 'NODE_ENV',
    category: 'application',
    categoryLabel: '应用配置',
    description: '运行模式（development/production）',
    defaultValue: 'development',
    type: 'enum',
    enumValues: ['development', 'production'],
    sensitive: false,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    value: 'development',
    source: 'default',
  },
  {
    key: 'JWT_SECRET',
    category: 'security',
    categoryLabel: '安全配置',
    description: 'JWT签名密钥',
    type: 'password',
    sensitive: true,
    editable: true,
    hotReloadable: false,
    restartRequired: true,
    envFile: true,
    value: '***',
    source: 'env',
  },
];

const sampleMetadata = {
  application: [
    { key: 'PORT', category: 'application', description: '后端服务监听端口' },
    { key: 'NODE_ENV', category: 'application', description: '运行模式' },
  ],
  security: [{ key: 'JWT_SECRET', category: 'security', description: 'JWT签名密钥' }],
};

const mockConfigService = {
  getAll: jest.fn().mockResolvedValue([]),
  get: jest.fn().mockResolvedValue('4000'),
  getMetadata: jest.fn().mockReturnValue(
    sampleConfigItems.map((c) => ({
      key: c.key,
      category: c.category,
      description: c.description,
      defaultValue: c.defaultValue,
      type: c.type,
      enumValues: c.enumValues,
      sensitive: c.sensitive,
      editable: c.editable,
      hotReloadable: c.hotReloadable,
      restartRequired: c.restartRequired,
      envFile: c.envFile,
      validation: c.validation,
    })),
  ),
  getMetadataByCategory: jest.fn().mockReturnValue(sampleMetadata),
  getAllWithMeta: jest.fn().mockResolvedValue(sampleConfigItems),
  getWithMeta: jest.fn().mockResolvedValue(sampleConfigItems[0]),
  setWithMeta: jest.fn().mockResolvedValue({
    key: 'PORT',
    value: '5000',
    restartRequired: true,
    hotReloadable: false,
    envFileUpdated: false,
    addedToPendingRestart: true,
  } as ConfigUpdateResult),
  getRestartRequired: jest.fn().mockResolvedValue(['PORT']),
  clearPendingRestart: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockRestartService = {
  triggerRestart: jest.fn().mockResolvedValue({
    status: 'restarting' as const,
    message: '重启已触发',
    triggeredBy: 'admin',
    triggeredAt: Date.now(),
    markerPath: '/tmp/.restart-marker.json',
  } as RestartState),
  getRestartStatus: jest.fn().mockResolvedValue({
    status: 'idle' as const,
    markerPath: '/tmp/.restart-marker.json',
  } as RestartState),
  clearMarker: jest.fn(),
};

describe('SystemConfigController - HTTP Integration (supertest)', () => {
  let app: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [
        { provide: SystemConfigService, useValue: mockConfigService },
        { provide: SystemRestartService, useValue: mockRestartService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 配置元数据 ====================

  describe('GET /api/v1/system/configs/metadata', () => {
    it('TC-CFG-CTL-001: should return metadata categories and items', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs/metadata')
        .expect(200)
        .expect((res) => {
          expect(res.body.categories).toBeDefined();
          expect(res.body.categories.application).toBeDefined();
          expect(res.body.items).toBeDefined();
          expect(res.body.items.length).toBe(3);
        });
    });
  });

  describe('GET /api/v1/system/configs/full', () => {
    it('TC-CFG-CTL-010: should return all config items with metadata and values', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs/full')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          const port = res.body.find((c: ConfigItemView) => c.key === 'PORT');
          expect(port).toBeDefined();
          expect(port.category).toBe('application');
          expect(port.categoryLabel).toBe('应用配置');
          expect(port.value).toBe('4000');
          expect(port.source).toBe('default');
        });
    });

    it('TC-CFG-CTL-011: should mask sensitive values', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs/full')
        .expect(200)
        .expect((res) => {
          const jwt = res.body.find((c: ConfigItemView) => c.key === 'JWT_SECRET');
          expect(jwt).toBeDefined();
          expect(jwt.sensitive).toBe(true);
          expect(jwt.value).toBe('***');
        });
    });
  });

  // ==================== 配置 CRUD ====================

  describe('GET /api/v1/system/configs', () => {
    it('TC-CFG-CTL-020: should return DB-only configs', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(mockConfigService.getAll).toHaveBeenCalled();
        });
    });
  });

  describe('GET /api/v1/system/configs/:key', () => {
    it('TC-CFG-CTL-030: should return single config by key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs/PORT')
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('PORT');
          expect(res.body.value).toBe('4000');
          expect(mockConfigService.get).toHaveBeenCalledWith('PORT');
        });
    });
  });

  describe('PATCH /api/v1/system/configs/:key', () => {
    it('TC-CFG-CTL-040: should update config and return result', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/system/configs/PORT')
        .send({ value: '5000', writeEnv: false, description: 'Updated port' })
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('PORT');
          expect(res.body.value).toBe('5000');
          expect(res.body.restartRequired).toBe(true);
          expect(mockConfigService.setWithMeta).toHaveBeenCalledWith('PORT', '5000', {
            writeEnv: false,
            description: 'Updated port',
          });
        });
    });
  });

  describe('DELETE /api/v1/system/configs/:key', () => {
    it('TC-CFG-CTL-050: should delete config', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/system/configs/PORT')
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
          expect(mockConfigService.delete).toHaveBeenCalledWith('PORT');
        });
    });
  });

  // ==================== 待重启清单 ====================

  describe('GET /api/v1/system/configs/restart-required/list', () => {
    it('TC-CFG-CTL-060: should return pending restart keys', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/configs/restart-required/list')
        .expect(200)
        .expect((res) => {
          expect(res.body.keys).toEqual(['PORT']);
          expect(res.body.count).toBe(1);
        });
    });
  });

  describe('POST /api/v1/system/configs/restart-required/clear', () => {
    it('TC-CFG-CTL-061: should clear pending restart list', () => {
      return request(app.getHttpServer())
        .post('/api/v1/system/configs/restart-required/clear')
        .expect(201)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
          expect(mockConfigService.clearPendingRestart).toHaveBeenCalled();
        });
    });
  });

  // ==================== 系统重启 ====================

  describe('POST /api/v1/system/restart', () => {
    it('TC-CFG-CTL-070: should trigger restart', () => {
      return request(app.getHttpServer())
        .post('/api/v1/system/restart')
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('restarting');
          expect(mockRestartService.triggerRestart).toHaveBeenCalled();
        });
    });
  });

  describe('GET /api/v1/system/restart/status', () => {
    it('TC-CFG-CTL-071: should return idle status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system/restart/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('idle');
          expect(mockRestartService.getRestartStatus).toHaveBeenCalled();
        });
    });
  });
});
