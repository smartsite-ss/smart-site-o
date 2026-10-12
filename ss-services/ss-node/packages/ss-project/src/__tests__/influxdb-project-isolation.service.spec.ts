// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InfluxdbProjectIsolationService } from '../services/influxdb-project-isolation.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('InfluxdbProjectIsolationService', () => {
  let service: InfluxdbProjectIsolationService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'INFLUXDB_URL') return 'http://localhost:8086';
        if (key === 'INFLUXDB_TOKEN') return 'test-token';
        if (key === 'INFLUXDB_ORG') return 'test-org';
        if (key === 'INFLUXDB_RETENTION_HOURS') return 0;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfluxdbProjectIsolationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InfluxdbProjectIsolationService>(InfluxdbProjectIsolationService);
  });

  // ==================== TC-INFLUX-001: getBucketName ====================
  describe('TC-INFLUX-001: getBucketName', () => {
    it('should generate bucket name with project-{projectId} convention', () => {
      expect(service.getBucketName('project-123')).toBe('project-project-123');
      expect(service.getBucketName('abc')).toBe('project-abc');
      expect(service.getBucketName('test-project-1')).toBe('project-test-project-1');
    });
  });

  // ==================== TC-INFLUX-002: routeDataPoint ====================
  describe('TC-INFLUX-002: routeDataPoint', () => {
    it('should route data point to correct project bucket', () => {
      const route = service.routeDataPoint(
        'my-project',
        'temperature',
        { value: 25.5, unit: 'celsius' },
        { sensor: 'sensor-1' },
        '2024-01-01T00:00:00Z',
      );

      expect(route.bucket).toBe('project-my-project');
      expect(route.org).toBe('test-org');
      expect(route.measurement).toBe('temperature');
      expect(route.tags.projectId).toBe('my-project');
      expect(route.tags.sensor).toBe('sensor-1');
      expect(route.fields.value).toBe(25.5);
      expect(route.fields.unit).toBe('celsius');
      expect(route.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should route without optional tags and timestamp', () => {
      const route = service.routeDataPoint('proj-1', 'pressure', { value: 101.3 });

      expect(route.bucket).toBe('project-proj-1');
      expect(route.tags.projectId).toBe('proj-1');
      expect(route.timestamp).toBeUndefined();
    });
  });

  // ==================== TC-INFLUX-003: routeDataPoints ====================
  describe('TC-INFLUX-003: routeDataPoints', () => {
    it('should batch route multiple data points', () => {
      const routes = service.routeDataPoints('batch-project', [
        { measurement: 'temp', fields: { value: 20 } },
        { measurement: 'humidity', fields: { value: 60 }, tags: { room: 'a1' } },
        { measurement: 'pressure', fields: { value: 1013 }, timestamp: '2024-01-01T00:00:00Z' },
      ]);

      expect(routes.length).toBe(3);
      expect(routes[0].bucket).toBe('project-batch-project');
      expect(routes[0].measurement).toBe('temp');
      expect(routes[1].measurement).toBe('humidity');
      expect(routes[1].tags.room).toBe('a1');
      expect(routes[2].measurement).toBe('pressure');
      expect(routes[2].timestamp).toBe('2024-01-01T00:00:00Z');
    });
  });

  // ==================== TC-INFLUX-004: buildLineProtocol ====================
  describe('TC-INFLUX-004: buildLineProtocol', () => {
    it('should build valid line protocol string', () => {
      const route = service.routeDataPoint(
        'lp-project',
        'cpu',
        { usage: 75.5, active: true },
        { host: 'server-01', region: 'us-east' },
        '2024-01-01T00:00:00Z',
      );

      const lp = service.buildLineProtocol(route);

      expect(lp).toContain('cpu');
      expect(lp).toContain('host=server-01');
      expect(lp).toContain('region=us-east');
      expect(lp).toContain('usage=75.5');
      expect(lp).toContain('active=true');
    });

    it('should escape tag values with special characters', () => {
      const route = service.routeDataPoint(
        'esc-project',
        'measurement',
        { value: 1 },
        { 'tag with spaces': 'value with commas, and equals=sign' },
      );

      const lp = service.buildLineProtocol(route);

      // Tag keys are NOT escaped (only values are). The line protocol contains:
      // measurement,tag with spaces=value\ with\ commas\,\ and\ equals\=sign value=1
      expect(lp).toContain('tag with spaces');
      expect(lp).toContain('value\\ with\\ commas\\,\\ and\\ equals\\=sign');
    });

    it('should handle string fields', () => {
      const route = service.routeDataPoint('str-project', 'status', {
        message: 'hello world',
        code: 'OK',
      });

      const lp = service.buildLineProtocol(route);

      expect(lp).toContain('message="hello world"');
      expect(lp).toContain('code="OK"');
    });

    it('should handle boolean fields', () => {
      const route = service.routeDataPoint('bool-project', 'switch', { on: true, off: false });

      const lp = service.buildLineProtocol(route);

      expect(lp).toContain('on=true');
      expect(lp).toContain('off=false');
    });
  });

  // ==================== TC-INFLUX-005: Bucket registry ====================
  describe('TC-INFLUX-005: Bucket registry', () => {
    it('should return undefined for unregistered bucket', () => {
      expect(service.getBucketInfo('unknown')).toBeUndefined();
    });

    it('should return empty array when no buckets registered', () => {
      expect(service.getAllBuckets()).toEqual([]);
      expect(service.bucketCount).toBe(0);
    });
  });

  // ==================== TC-INFLUX-006: createProjectBucket ====================
  describe('TC-INFLUX-006: createProjectBucket', () => {
    it('should create bucket via InfluxDB API', async () => {
      // Mock sequence:
      // 1. getOrgId for findBucketByName → orgs
      // 2. findBucketByName → buckets: [] (not found)
      // 3. getOrgId for create → orgs
      // 4. create bucket → bucket info
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ buckets: [] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'bucket-456',
                name: 'project-create-test',
                createdAt: '2024-01-01T00:00:00Z',
              }),
            ),
        });

      const info = await service.createProjectBucket('create-test');

      expect(info.name).toBe('project-create-test');
      expect(info.projectId).toBe('create-test');
      expect(service.bucketCount).toBe(1);
    });

    it('should return existing bucket if already registered', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ buckets: [] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'bucket-1',
                name: 'project-cached',
                createdAt: '2024-01-01T00:00:00Z',
              }),
            ),
        });

      const first = await service.createProjectBucket('cached');
      const second = await service.createProjectBucket('cached');

      expect(first).toBe(second);
      expect(service.bucketCount).toBe(1);
    });
  });

  // ==================== TC-INFLUX-007: deleteProjectBucket ====================
  describe('TC-INFLUX-007: deleteProjectBucket', () => {
    it('should unregister bucket from registry', async () => {
      // Register first
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ buckets: [] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'bucket-del',
                name: 'project-delete-me',
                createdAt: '2024-01-01T00:00:00Z',
              }),
            ),
        });

      await service.createProjectBucket('delete-me');
      expect(service.bucketCount).toBe(1);

      // Delete
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                buckets: [
                  {
                    id: 'bucket-del',
                    name: 'project-delete-me',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
              }),
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: () => Promise.resolve(''),
        });

      await service.deleteProjectBucket('delete-me');

      expect(service.bucketCount).toBe(0);
      expect(service.getBucketInfo('delete-me')).toBeUndefined();
    });
  });

  // ==================== TC-INFLUX-008: onModuleDestroy ====================
  describe('TC-INFLUX-008: onModuleDestroy', () => {
    it('should clear bucket registry on destroy', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ buckets: [] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ orgs: [{ id: 'org-123' }] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'b1',
                name: 'project-destroy-test',
                createdAt: '2024-01-01T00:00:00Z',
              }),
            ),
        });

      await service.createProjectBucket('destroy-test');
      expect(service.bucketCount).toBe(1);

      service.onModuleDestroy();

      expect(service.bucketCount).toBe(0);
    });
  });
});
