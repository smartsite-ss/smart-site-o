// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 设备管理 E2E 测试（基于 NestJS 测试模块 + Supertest）
 *
 * 覆盖：
 *   1. 分组管理 — 创建分组、多级分组、查询、更新、删除
 *   2. 设备管理 — 创建不同类型/模板/插件的设备
 *   3. 分组-设备关联 — 分组添加设备、设备树查询
 *   4. 多项目 — 跨项目设备隔离
 *   5. 删除管理 — 删除分组（子分组上移）、删除设备
 *
 * 策略：使用 NestJS TestingModule 加载 DeviceController，mock 所有底层服务，
 *       通过 Supertest 发送 HTTP 请求验证路由、参数解析、响应格式。
 *
 * 运行方式：
 *   npx jest --config apps/ss-data-server/jest.config.js --testPathPattern="device.e2e"
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { DeviceController } from '@ss-node/ss-device/device.controller';
import { DeviceService } from '@ss-node/ss-device/device.service';
import { DeviceDiagnosticService } from '@ss-node/ss-device/device-diagnostic.service';
import { DeviceDataService } from '@ss-node/ss-device/data/device-data.service';
import { DeviceSimulationService } from '@ss-node/ss-device/simulation/device-simulation.service';
import { DeviceGateway } from '@ss-node/ss-device/device.gateway';
import { DeviceImportExportService } from '@ss-node/ss-device/import-export/device-import-export.service';
import { DeviceControlService } from '@ss-node/ss-device/control/device-control.service';
import { JwtAuthGuard } from '@ss-node/ss-core/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@ss-node/ss-core/core/auth/guards/roles.guard';

describe('Device Management E2E', () => {
  let app: INestApplication;
  let deviceService: jest.Mocked<Partial<DeviceService>>;

  const projectId = 'e2e-proj-001';
  const projectIdB = 'e2e-proj-002';

  // ============================================================
  // 辅助工厂函数
  // ============================================================
  function makeGroup(overrides: Record<string, any> = {}) {
    return {
      id: overrides.id || 'grp-001',
      name: overrides.name || '测试分组',
      description: overrides.description || '',
      projectId: overrides.projectId || projectId,
      parentId: overrides.parentId || null,
      parent: overrides.parent || null,
      children: overrides.children || [],
      sortOrder: overrides.sortOrder ?? 0,
      createdAt: overrides.createdAt || new Date('2025-01-01'),
      updatedAt: overrides.updatedAt || new Date('2025-01-01'),
    };
  }

  function makeDevice(overrides: Record<string, any> = {}) {
    return {
      id: overrides.id || 'dev-001',
      deviceCode: overrides.deviceCode || overrides.tid || 'dev-001',
      deviceName: overrides.deviceName || overrides.name || '测试设备',
      nameAlias: overrides.nameAlias || null,
      description: overrides.description || '',
      type: overrides.type || 'modbus_tcp',
      config: overrides.config || {},
      status: overrides.status || 'offline',
      projectId: overrides.projectId || projectId,
      createdAt: overrides.createdAt || new Date('2025-01-01'),
      updatedAt: overrides.updatedAt || new Date('2025-01-01'),
      lastOnlineAt: overrides.lastOnlineAt || null,
      errorCount: overrides.errorCount || 0,
      lastErrorAt: overrides.lastErrorAt || null,
      lastErrorMsg: overrides.lastErrorMsg || '',
      templateId: overrides.templateId || 'tpl-001',
      templateVersion: overrides.templateVersion || '1.0.0',
      templateAppliedAt: overrides.templateAppliedAt || new Date('2025-01-01'),
      connection: overrides.connection || {},
      groupId: overrides.groupId || null,
      driver: overrides.driver || 'modbus_tcp',
      scanRate: overrides.scanRate ?? 1000,
      offlinePeriod: overrides.offlinePeriod ?? 30000,
      lastDataAt: overrides.lastDataAt || null,
      updatedBy: overrides.updatedBy || null,
    };
  }

  function makePaginatedResult(data: any[], total?: number) {
    return {
      data,
      pagination: {
        page: 1,
        pageSize: 20,
        total: total ?? data.length,
        totalPages: Math.ceil((total ?? data.length) / 20),
      },
    };
  }

  function _makeGroupTree(groups: any[] = [], devices: any[] = []) {
    return {
      projectId,
      projectName: projectId,
      groups,
      devices,
    };
  }

  beforeAll(async () => {
    // 创建 mock 服务
    deviceService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createGroup: jest.fn(),
      findAllGroups: jest.fn(),
      findOneGroup: jest.fn(),
      updateGroup: jest.fn(),
      removeGroup: jest.fn(),
      getGroupTree: jest.fn(),
      addTag: jest.fn(),
      addTags: jest.fn(),
      removeTag: jest.fn(),
      updateDataTag: jest.fn(),
      applyTemplate: jest.fn(),
      syncTemplateTags: jest.fn(),
    };

    const mockDiagnosticService = {
      runDiagnostic: jest.fn(),
      ping: jest.fn(),
      readTag: jest.fn(),
      writeTag: jest.fn(),
      scanAddresses: jest.fn(),
    };

    const mockDataService = {
      getDeviceLatestValues: jest.fn(),
      getTagHistory: jest.fn(),
      updateLatestValue: jest.fn(),
      exportProjectSnapshot: jest.fn(),
    };

    const mockSimulationService = {
      startSimulation: jest.fn(),
      stopSimulation: jest.fn(),
      isSimulating: jest.fn(),
    };

    const mockGateway = {
      sendToDevice: jest.fn(),
    };

    const mockImportExport = {
      exportToCsv: jest.fn(),
      exportToJson: jest.fn(),
      importFromCsv: jest.fn(),
      importFromJson: jest.fn(),
    };

    const mockControlService = {
      writeTagValue: jest.fn(),
      queryLogs: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        { provide: DeviceService, useValue: deviceService },
        { provide: DeviceDiagnosticService, useValue: mockDiagnosticService },
        { provide: DeviceDataService, useValue: mockDataService },
        { provide: DeviceSimulationService, useValue: mockSimulationService },
        { provide: DeviceGateway, useValue: mockGateway },
        { provide: DeviceImportExportService, useValue: mockImportExport },
        { provide: DeviceControlService, useValue: mockControlService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // 一、分组管理 E2E — 创建分组、多级分组、查询、更新、删除
  // ============================================================
  describe('分组管理', () => {
    describe('E2E-GROUP-001: 创建平级分组', () => {
      it('应成功创建分组并返回 201', async () => {
        const group = makeGroup({ id: 'grp-001', name: '一楼设备', description: '一楼所有设备' });
        deviceService.createGroup!.mockResolvedValue(group as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices/groups`)
          .send({ name: '一楼设备', description: '一楼所有设备', sortOrder: 0 })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('一楼设备');
        expect(res.body.projectId).toBe(projectId);
        expect(deviceService.createGroup).toHaveBeenCalledWith(
          expect.objectContaining({ name: '一楼设备' }),
          projectId,
        );
      });

      it('应成功创建带描述的分组', async () => {
        const group = makeGroup({ id: 'grp-002', name: '二楼设备', description: '二楼所有设备' });
        deviceService.createGroup!.mockResolvedValue(group as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices/groups`)
          .send({ name: '二楼设备', description: '二楼所有设备', sortOrder: 1 })
          .expect(201);

        expect(res.body.name).toBe('二楼设备');
        expect(res.body.description).toBe('二楼所有设备');
      });
    });

    describe('E2E-GROUP-002: 创建多级分组', () => {
      it('应成功创建子分组（二级）', async () => {
        const child = makeGroup({ id: 'grp-child', name: '车间1', parentId: 'grp-parent' });
        deviceService.createGroup!.mockResolvedValue(child as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices/groups`)
          .send({ name: '车间1', parentId: 'grp-parent', sortOrder: 0 })
          .expect(201);

        expect(res.body.name).toBe('车间1');
        expect(res.body.parentId).toBe('grp-parent');
        expect(deviceService.createGroup).toHaveBeenCalledWith(
          expect.objectContaining({ name: '车间1', parentId: 'grp-parent' }),
          projectId,
        );
      });

      it('应支持三级分组（厂区→车间→产线）', async () => {
        const l3 = makeGroup({ id: 'grp-l3', name: '产线A', parentId: 'grp-l2' });
        deviceService.createGroup!.mockResolvedValue(l3 as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices/groups`)
          .send({ name: '产线A', parentId: 'grp-l2', sortOrder: 0 })
          .expect(201);

        expect(res.body.parentId).toBe('grp-l2');
        expect(res.body.name).toBe('产线A');
      });
    });

    describe('E2E-GROUP-003: 查询所有分组', () => {
      it('应返回所有分组列表', async () => {
        const groups = [
          makeGroup({ id: 'grp-1', name: 'A组', sortOrder: 0 }),
          makeGroup({ id: 'grp-2', name: 'B组', sortOrder: 1 }),
        ];
        deviceService.findAllGroups!.mockResolvedValue(groups as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices/groups`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe('A组');
        expect(deviceService.findAllGroups).toHaveBeenCalledWith(projectId);
      });

      it('不同项目返回不同分组', async () => {
        const groupsB = [makeGroup({ id: 'grp-b', name: '项目B分组', projectId: projectIdB })];
        deviceService.findAllGroups!.mockResolvedValue(groupsB as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectIdB}/devices/groups`)
          .expect(200);

        expect(res.body[0].name).toBe('项目B分组');
        expect(deviceService.findAllGroups).toHaveBeenCalledWith(projectIdB);
      });
    });

    describe('E2E-GROUP-004: 查询单个分组', () => {
      it('应返回分组详情（含子分组）', async () => {
        const child = makeGroup({ id: 'grp-child', name: '子分组' });
        const parent = makeGroup({ id: 'grp-parent', name: '父分组', children: [child] });
        deviceService.findOneGroup!.mockResolvedValue(parent as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices/groups/grp-parent`)
          .expect(200);

        expect(res.body.name).toBe('父分组');
        expect(res.body.children).toBeDefined();
        expect(deviceService.findOneGroup).toHaveBeenCalledWith('grp-parent', projectId);
      });
    });

    describe('E2E-GROUP-005: 更新分组', () => {
      it('应成功更新分组名称', async () => {
        const updated = makeGroup({ id: 'grp-001', name: '一楼设备（已更新）' });
        deviceService.updateGroup!.mockResolvedValue(updated as any);

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/devices/groups/grp-001`)
          .send({ name: '一楼设备（已更新）' })
          .expect(200);

        expect(res.body.name).toBe('一楼设备（已更新）');
        expect(deviceService.updateGroup).toHaveBeenCalledWith(
          'grp-001',
          expect.objectContaining({ name: '一楼设备（已更新）' }),
          projectId,
        );
      });

      it('应成功更新分组排序', async () => {
        const updated = makeGroup({ id: 'grp-001', name: '分组', sortOrder: 99 });
        deviceService.updateGroup!.mockResolvedValue(updated as any);

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/devices/groups/grp-001`)
          .send({ sortOrder: 99 })
          .expect(200);

        expect(res.body.sortOrder).toBe(99);
      });

      it('应支持移动分组到新的父分组', async () => {
        const updated = makeGroup({ id: 'grp-002', name: '子分组', parentId: 'grp-003' });
        deviceService.updateGroup!.mockResolvedValue(updated as any);

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/devices/groups/grp-002`)
          .send({ parentId: 'grp-003' })
          .expect(200);

        expect(res.body.parentId).toBe('grp-003');
      });
    });

    describe('E2E-GROUP-006: 删除分组', () => {
      it('应成功删除分组（子分组上移）', async () => {
        deviceService.removeGroup!.mockResolvedValue(undefined);

        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/devices/groups/grp-parent`)
          .expect(200);

        expect(deviceService.removeGroup).toHaveBeenCalledWith('grp-parent', projectId);
      });
    });

    describe('E2E-GROUP-007: 获取分组树', () => {
      it('应返回项目-分组-设备三级树', async () => {
        const tree = {
          projectId,
          projectName: '测试项目',
          groups: [
            {
              group: { id: 'grp-1', name: '根分组', sortOrder: 0 },
              children: [],
              devices: [],
            },
          ],
        };
        deviceService.getGroupTree!.mockResolvedValue(tree as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices/groups/tree`)
          .expect(200);

        expect(res.body).toHaveProperty('projectId');
        expect(res.body).toHaveProperty('groups');
        expect(Array.isArray(res.body.groups)).toBe(true);
        expect(deviceService.getGroupTree).toHaveBeenCalledWith(projectId);
      });
    });
  });

  // ============================================================
  // 二、设备管理 E2E — 不同类型/模板/采集插件
  // ============================================================
  describe('设备管理 — 不同类型/模板/采集插件', () => {
    describe('E2E-DEV-001: 创建 Modbus TCP 设备', () => {
      it('应创建 modbus_tcp 驱动设备', async () => {
        const device = makeDevice({
          id: 'dev-modbus',
          deviceCode: 'modbus-tcp-001',
          deviceName: 'ModbusTCP设备',
          driver: 'modbus_tcp',
          type: 'modbus_tcp',
          connection: { host: '192.168.1.100', port: 502, unitId: 1 },
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'modbus-tcp-001',
            deviceName: 'ModbusTCP设备',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: { host: '192.168.1.100', port: 502, unitId: 1 },
          })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.deviceCode).toBe('modbus-tcp-001');
        expect(res.body.driver).toBe('modbus_tcp');
        expect(deviceService.create).toHaveBeenCalledWith(
          expect.objectContaining({ deviceCode: 'modbus-tcp-001', driver: 'modbus_tcp' }),
          projectId,
        );
      });
    });

    describe('E2E-DEV-002: 创建 Modbus RTU 设备', () => {
      it('应创建 modbus_rtu 驱动设备', async () => {
        const device = makeDevice({
          id: 'dev-rtu',
          deviceCode: 'modbus-rtu-001',
          deviceName: 'ModbusRTU设备',
          driver: 'modbus_rtu',
          type: 'modbus_rtu',
          connection: { serialPort: 'COM1', baudRate: 9600, unitId: 1 },
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'modbus-rtu-001',
            deviceName: 'ModbusRTU设备',
            templateId: 'tpl-modbus-rtu',
            driver: 'modbus_rtu',
            connection: { serialPort: 'COM1', baudRate: 9600, unitId: 1 },
          })
          .expect(201);

        expect(res.body.deviceCode).toBe('modbus-rtu-001');
        expect(res.body.driver).toBe('modbus_rtu');
      });
    });

    describe('E2E-DEV-003: 创建 OPC UA 设备', () => {
      it('应创建 opc_ua 驱动设备', async () => {
        const device = makeDevice({
          id: 'dev-opcua',
          deviceCode: 'opcua-001',
          deviceName: 'OPCUA设备',
          driver: 'opc_ua',
          type: 'opc_ua',
          connection: { endpoint: 'opc.tcp://192.168.1.100:4840', securityPolicy: 'None' },
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'opcua-001',
            deviceName: 'OPCUA设备',
            templateId: 'tpl-opcua',
            driver: 'opc_ua',
            connection: { endpoint: 'opc.tcp://192.168.1.100:4840', securityPolicy: 'None' },
          })
          .expect(201);

        expect(res.body.deviceCode).toBe('opcua-001');
        expect(res.body.driver).toBe('opc_ua');
      });
    });

    describe('E2E-DEV-004: 创建 MQTT 设备', () => {
      it('应创建 mqtt 驱动设备', async () => {
        const device = makeDevice({
          id: 'dev-mqtt',
          deviceCode: 'mqtt-001',
          deviceName: 'MQTT设备',
          driver: 'mqtt',
          type: 'mqtt',
          connection: { broker: 'mqtt://broker.example.com:1883', topic: 'sensors/#' },
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'mqtt-001',
            deviceName: 'MQTT设备',
            templateId: 'tpl-mqtt',
            driver: 'mqtt',
            connection: { broker: 'mqtt://broker.example.com:1883', topic: 'sensors/#' },
          })
          .expect(201);

        expect(res.body.deviceCode).toBe('mqtt-001');
        expect(res.body.driver).toBe('mqtt');
      });
    });

    describe('E2E-DEV-005: 创建 Siemens S7 设备', () => {
      it('应创建 siemens_s7 驱动设备', async () => {
        const device = makeDevice({
          id: 'dev-s7',
          deviceCode: 's7-001',
          deviceName: 'S7设备',
          driver: 'siemens_s7',
          type: 'siemens_s7',
          connection: { host: '192.168.1.100', rack: 0, slot: 1 },
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 's7-001',
            deviceName: 'S7设备',
            templateId: 'tpl-s7',
            driver: 'siemens_s7',
            connection: { host: '192.168.1.100', rack: 0, slot: 1 },
          })
          .expect(201);

        expect(res.body.deviceCode).toBe('s7-001');
        expect(res.body.driver).toBe('siemens_s7');
      });
    });

    describe('E2E-DEV-006: 创建 Virtual 虚拟设备', () => {
      it('应创建 virtual 驱动虚拟设备', async () => {
        const device = makeDevice({
          id: 'dev-virtual',
          deviceCode: 'virtual-001',
          deviceName: '虚拟设备',
          driver: 'virtual',
          type: 'virtual',
          connection: {},
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'virtual-001',
            deviceName: '虚拟设备',
            templateId: 'tpl-virtual',
            driver: 'virtual',
            connection: {},
          })
          .expect(201);

        expect(res.body.deviceCode).toBe('virtual-001');
        expect(res.body.driver).toBe('virtual');
      });
    });

    describe('E2E-DEV-007: 不同模板ID的设备', () => {
      it('不同设备可使用不同模板', async () => {
        const dev1 = makeDevice({
          id: 'dev-100',
          deviceCode: 'tpl-a',
          templateId: 'tpl-temp',
          deviceName: '温度设备',
        });
        const dev2 = makeDevice({
          id: 'dev-200',
          deviceCode: 'tpl-b',
          templateId: 'tpl-pressure',
          deviceName: '压力设备',
        });

        deviceService.create!.mockResolvedValueOnce(dev1 as any).mockResolvedValueOnce(dev2 as any);

        const r1 = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'tpl-a',
            deviceName: '温度设备',
            templateId: 'tpl-temp',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        const r2 = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'tpl-b',
            deviceName: '压力设备',
            templateId: 'tpl-pressure',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        expect(r1.body.templateId).toBe('tpl-temp');
        expect(r2.body.templateId).toBe('tpl-pressure');
      });
    });

    describe('E2E-DEV-008: 查询设备列表', () => {
      it('应返回分页设备列表', async () => {
        const devices = [
          makeDevice({ id: 'd1', name: '设备1' }),
          makeDevice({ id: 'd2', name: '设备2' }),
        ];
        deviceService.findAll!.mockResolvedValue(makePaginatedResult(devices) as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices`)
          .expect(200);

        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination).toBeDefined();
        expect(deviceService.findAll).toHaveBeenCalledWith(projectId, expect.any(Object));
      });

      it('应支持按 type 过滤', async () => {
        const devices = [makeDevice({ id: 'd1', type: 'modbus_tcp' })];
        deviceService.findAll!.mockResolvedValue(makePaginatedResult(devices) as any);

        const _res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices?type=modbus_tcp`)
          .expect(200);

        expect(deviceService.findAll).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({ type: 'modbus_tcp' }),
        );
      });

      it('应支持按 groupId 过滤', async () => {
        const devices = [makeDevice({ id: 'd1', groupId: 'grp-001' })];
        deviceService.findAll!.mockResolvedValue(makePaginatedResult(devices) as any);

        const _res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices?groupId=grp-001`)
          .expect(200);

        expect(deviceService.findAll).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({ groupId: 'grp-001' }),
        );
      });

      it('应支持搜索', async () => {
        deviceService.findAll!.mockResolvedValue(makePaginatedResult([]) as any);

        await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices?search=temp`)
          .expect(200);

        expect(deviceService.findAll).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({ search: 'temp' }),
        );
      });
    });

    describe('E2E-DEV-009: 查询单个设备', () => {
      it('应返回设备详情', async () => {
        const device = makeDevice({ id: 'dev-001', tid: 'modbus-tcp-001' });
        deviceService.findOne!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices/dev-001`)
          .expect(200);

        expect(res.body.deviceCode).toBe('modbus-tcp-001');
        expect(deviceService.findOne).toHaveBeenCalledWith('dev-001', projectId);
      });
    });

    describe('E2E-DEV-010: 更新设备', () => {
      it('应成功更新设备名称', async () => {
        const updated = makeDevice({ id: 'dev-001', deviceName: 'ModbusTCP设备（已更新）' });
        deviceService.update!.mockResolvedValue(updated as any);

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/devices/dev-001`)
          .send({ deviceName: 'ModbusTCP设备（已更新）' })
          .expect(200);

        expect(res.body.deviceName).toBe('ModbusTCP设备（已更新）');
        expect(deviceService.update).toHaveBeenCalledWith(
          'dev-001',
          expect.objectContaining({ deviceName: 'ModbusTCP设备（已更新）' }),
          projectId,
        );
      });
    });
  });

  // ============================================================
  // 三、分组与设备关联 E2E
  // ============================================================
  describe('分组与设备关联', () => {
    describe('E2E-LINK-001: 分组添加设备', () => {
      it('应创建设备并关联到指定分组', async () => {
        const device = makeDevice({
          id: 'grouped-dev',
          deviceCode: 'grouped-dev-001',
          deviceName: '生产区设备',
          groupId: 'grp-prod',
        });
        deviceService.create!.mockResolvedValue(device as any);

        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'grouped-dev-001',
            deviceName: '生产区设备',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: { host: '192.168.1.200', port: 502 },
            groupId: 'grp-prod',
          })
          .expect(201);

        expect(res.body.groupId).toBe('grp-prod');
        expect(deviceService.create).toHaveBeenCalledWith(
          expect.objectContaining({ groupId: 'grp-prod' }),
          projectId,
        );
      });
    });

    describe('E2E-LINK-002: 分组树中显示设备', () => {
      it('getGroupTree 应在分组节点下挂载设备', async () => {
        const tree = {
          projectId,
          projectName: '测试项目',
          groups: [
            {
              group: { id: 'grp-prod', name: '生产区', sortOrder: 0 },
              children: [],
              devices: [
                {
                  id: 'grouped-dev',
                  tid: 'grouped-dev-001',
                  name: '生产区设备',
                  type: 'modbus_tcp',
                  status: 'offline',
                },
              ],
            },
          ],
        };
        deviceService.getGroupTree!.mockResolvedValue(tree as any);

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices/groups/tree`)
          .expect(200);

        const targetGroup = res.body.groups.find((g: any) => g.group.id === 'grp-prod');
        expect(targetGroup).toBeDefined();
        expect(targetGroup.devices).toHaveLength(1);
        expect(targetGroup.devices[0].name).toBe('生产区设备');
      });
    });

    describe('E2E-LINK-003: 移除设备分组', () => {
      it('应支持将设备的分组设为 null', async () => {
        const updated = makeDevice({ id: 'grouped-dev', groupId: null });
        deviceService.update!.mockResolvedValue(updated as any);

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/devices/grouped-dev`)
          .send({ groupId: null })
          .expect(200);

        expect(res.body.groupId).toBeNull();
      });
    });
  });

  // ============================================================
  // 四、多项目设备隔离 E2E
  // ============================================================
  describe('多项目设备隔离', () => {
    describe('E2E-PROJ-001: 不同项目创建不同设备', () => {
      it('项目A和设备与项目B的设备应隔离', async () => {
        const devA = makeDevice({ id: 'dev-a', tid: 'cross-proj', name: '项目A设备', projectId });
        const devB = makeDevice({
          id: 'dev-b',
          deviceCode: 'cross-proj',
          deviceName: '项目B设备',
          projectId: projectIdB,
        });

        deviceService.create!.mockResolvedValueOnce(devA as any).mockResolvedValueOnce(devB as any);

        const resA = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'cross-proj',
            deviceName: '项目A设备',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        const resB = await request(app.getHttpServer())
          .post(`/projects/${projectIdB}/devices`)
          .send({
            deviceCode: 'cross-proj',
            deviceName: '项目B设备',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        expect(resA.body.projectId).toBe(projectId);
        expect(resB.body.projectId).toBe(projectIdB);
        expect(deviceService.create).toHaveBeenNthCalledWith(1, expect.any(Object), projectId);
        expect(deviceService.create).toHaveBeenNthCalledWith(2, expect.any(Object), projectIdB);
      });
    });

    describe('E2E-PROJ-002: 同一tid在不同项目可重复', () => {
      it('不同项目可以使用相同的 tid', async () => {
        const devA = makeDevice({ id: 'dev-a', tid: 'same-tid', projectId });
        const devB = makeDevice({ id: 'dev-b', tid: 'same-tid', projectId: projectIdB });

        deviceService.create!.mockResolvedValueOnce(devA as any).mockResolvedValueOnce(devB as any);

        const r1 = await request(app.getHttpServer())
          .post(`/projects/${projectId}/devices`)
          .send({
            deviceCode: 'same-tid',
            deviceName: '设备A',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        const r2 = await request(app.getHttpServer())
          .post(`/projects/${projectIdB}/devices`)
          .send({
            deviceCode: 'same-tid',
            deviceName: '设备B',
            templateId: 'tpl-modbus',
            driver: 'modbus_tcp',
            connection: {},
          })
          .expect(201);

        expect(r1.body.deviceCode).toBe('same-tid');
        expect(r2.body.deviceCode).toBe('same-tid');
        expect(r1.body.projectId).not.toBe(r2.body.projectId);
      });
    });

    describe('E2E-PROJ-003: 项目级设备列表查询', () => {
      it('findAll 应只返回指定项目的设备', async () => {
        const devices = [makeDevice({ id: 'a-1', projectId })];
        deviceService.findAll!.mockResolvedValue(makePaginatedResult(devices) as any);

        const _res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/devices`)
          .expect(200);

        expect(deviceService.findAll).toHaveBeenCalledWith(projectId, expect.any(Object));
      });
    });
  });

  // ============================================================
  // 五、删除管理 E2E
  // ============================================================
  describe('删除管理', () => {
    describe('E2E-DEL-001: 删除设备', () => {
      it('应成功删除设备', async () => {
        deviceService.remove!.mockResolvedValue(undefined);

        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/devices/dev-001`)
          .expect(200);

        expect(deviceService.remove).toHaveBeenCalledWith('dev-001', projectId);
      });
    });

    describe('E2E-DEL-002: 删除分组', () => {
      it('应成功删除分组', async () => {
        deviceService.removeGroup!.mockResolvedValue(undefined);

        await request(app.getHttpServer())
          .delete(`/projects/${projectId}/devices/groups/grp-001`)
          .expect(200);

        expect(deviceService.removeGroup).toHaveBeenCalledWith('grp-001', projectId);
      });
    });
  });
});
