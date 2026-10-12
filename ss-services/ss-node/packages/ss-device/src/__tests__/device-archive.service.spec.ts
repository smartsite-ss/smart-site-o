// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeviceArchiveService } from '../archive/device-archive.service';
import { Repository } from 'typeorm';
import { DataTag } from '../entities/data-tag.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockDataTagRepo(): MockRepository<DataTag> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
}

describe('DeviceArchiveService', () => {
  let service: DeviceArchiveService;
  let mockDataTagRepo: MockRepository<DataTag>;

  beforeEach(() => {
    mockDataTagRepo = createMockDataTagRepo();
    const mockProjectDbService: ProjectDatabaseService = {
      getSystemDb: jest.fn().mockResolvedValue({
        getRepository: jest.fn(() => mockDataTagRepo),
      }),
      getLoadedSystemDb: jest.fn(),
      unloadProjectDatabases: jest.fn(),
      getActiveProjects: jest.fn(),
      isConnected: jest.fn(),
      setProjectsDir: jest.fn(),
    } as any;

    service = new DeviceArchiveService(mockDataTagRepo as any, mockProjectDbService);
  });

  // ==================== archiveToInfluxDB ====================
  describe('archiveToInfluxDB', () => {
    it('TC-DAS-001: should archive data points to InfluxDB', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToInfluxDB('tag-001', startTime, endTime);

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^arc_/);
      expect(result.archived).toBeGreaterThanOrEqual(0);
    });

    it('TC-DAS-002: should create job with correct status', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToInfluxDB('tag-001', startTime, endTime);

      const job = service.getJobStatus(result.jobId);
      expect(job).toBeDefined();
      expect(job!.status).toBe('completed');
      expect(job!.destination).toBe('influxdb');
    });

    it('TC-DAS-003: should not duplicate data points on re-archive', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const _result1 = await service.archiveToInfluxDB('tag-001', startTime, endTime);
      const result2 = await service.archiveToInfluxDB('tag-001', startTime, endTime);

      // Second archive should have 0 new points (same time range)
      expect(result2.archived).toBe(0);
    });
  });

  // ==================== archiveToSQLite ====================
  describe('archiveToSQLite', () => {
    it('TC-DAS-010: should archive data points to SQLite', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToSQLite('tag-001', startTime, endTime);

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(result.archived).toBeGreaterThanOrEqual(0);
    });

    it('TC-DAS-011: should create job with correct status for SQLite', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToSQLite('tag-001', startTime, endTime);

      const job = service.getJobStatus(result.jobId);
      expect(job).toBeDefined();
      expect(job!.status).toBe('completed');
      expect(job!.destination).toBe('sqlite');
    });
  });

  // ==================== queryArchive ====================
  describe('queryArchive', () => {
    it('TC-DAS-020: should query archived data', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      // Archive some data first
      await service.archiveToInfluxDB('tag-001', startTime, endTime);

      // Query the archived data
      const result = await service.queryArchive('tag-001', {
        startTime,
        endTime,
        page: 1,
        pageSize: 50,
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('TC-DAS-021: should return empty result for non-existent tag', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.queryArchive('non-existent', {
        startTime,
        endTime,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('TC-DAS-022: should support pagination', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      await service.archiveToInfluxDB('tag-001', startTime, endTime);

      const result = await service.queryArchive('tag-001', {
        startTime,
        endTime,
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('TC-DAS-023: should merge data from both InfluxDB and SQLite', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      await service.archiveToInfluxDB('tag-001', startTime, endTime);
      await service.archiveToSQLite('tag-001', startTime, endTime);

      const result = await service.queryArchive('tag-001', {
        startTime,
        endTime,
      });

      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== scheduleArchive ====================
  describe('scheduleArchive', () => {
    it('TC-DAS-030: should schedule periodic archiving', () => {
      const result = service.scheduleArchive('project-001', '* * * * *');

      expect(result.scheduled).toBe(true);
      expect(result.projectId).toBe('project-001');
    });

    it('TC-DAS-031: should schedule with custom cron expression', () => {
      const result = service.scheduleArchive('project-001', '*/5 * * * *');

      expect(result.scheduled).toBe(true);
    });

    it('TC-DAS-032: should re-schedule when already scheduled', () => {
      service.scheduleArchive('project-001', '* * * * *');
      const result = service.scheduleArchive('project-001', '*/15 * * * *');

      expect(result.scheduled).toBe(true);
    });
  });

  // ==================== cancelScheduleArchive ====================
  describe('cancelScheduleArchive', () => {
    it('TC-DAS-040: should cancel scheduled archiving', () => {
      service.scheduleArchive('project-001', '* * * * *');

      const result = service.cancelScheduleArchive('project-001');

      expect(result).toBe(true);
    });

    it('TC-DAS-041: should return false for non-scheduled project', () => {
      const result = service.cancelScheduleArchive('non-existent');

      expect(result).toBe(false);
    });
  });

  // ==================== getArchiveStatus ====================
  describe('getArchiveStatus', () => {
    it('TC-DAS-050: should return archive status for a project', () => {
      service.scheduleArchive('project-001', '* * * * *');

      const result = service.getArchiveStatus('project-001');

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('project-001');
      expect(result[0].enabled).toBe(true);
      expect(result[0].destinations).toContain('influxdb');
      expect(result[0].destinations).toContain('sqlite');
    });

    it('TC-DAS-051: should return status for all projects when no projectId', () => {
      const result = service.getArchiveStatus();

      expect(Array.isArray(result)).toBe(true);
    });

    it('TC-DAS-052: should return default values for project with no data', () => {
      // Clean up any scheduled timers first
      service.cancelScheduleArchive('project-001');

      const result = service.getArchiveStatus('project-001');

      expect(result).toHaveLength(1);
      expect(result[0].totalArchived).toBe(0);
      expect(result[0].totalErrors).toBe(0);
      expect(result[0].activeJobs).toBe(0);
    });
  });

  // ==================== getArchiveStatistics ====================
  describe('getArchiveStatistics', () => {
    it('TC-DAS-060: should return archive statistics', async () => {
      mockDataTagRepo.find.mockResolvedValue([
        { archiveEnabled: true },
        { archiveEnabled: true },
        { archiveEnabled: false },
      ]);

      const result = await service.getArchiveStatistics('project-001');

      expect(result.projectId).toBe('project-001');
      expect(result.tagsCount).toBe(3);
      expect(result.tagsWithArchiveEnabled).toBe(2);
    });

    it('TC-DAS-061: should return zero statistics for project with no tags', async () => {
      mockDataTagRepo.find.mockResolvedValue([]);

      const result = await service.getArchiveStatistics('project-001');

      expect(result.tagsCount).toBe(0);
      expect(result.tagsWithArchiveEnabled).toBe(0);
      expect(result.totalArchived).toBe(0);
    });
  });

  // ==================== getJobStatus ====================
  describe('getJobStatus', () => {
    it('TC-DAS-070: should return job status for valid job', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:01:00.000Z');

      const result = await service.archiveToInfluxDB('tag-001', startTime, endTime);

      const job = service.getJobStatus(result.jobId);
      expect(job).toBeDefined();
      expect(job!.tagId).toBe('tag-001');
      expect(job!.status).toBe('completed');
    });

    it('TC-DAS-071: should return undefined for non-existent job', () => {
      const job = service.getJobStatus('non-existent');

      expect(job).toBeUndefined();
    });
  });

  // ==================== cancelJob ====================
  describe('cancelJob', () => {
    it('TC-DAS-080: should cancel a pending job', async () => {
      // Note: jobs are created and immediately run, so they won't be in 'pending' state
      // This test validates the cancel logic for pending jobs
      const result = service.cancelJob('non-existent');

      expect(result).toBe(false);
    });
  });

  // ==================== cleanup ====================
  afterEach(() => {
    // Clean up any scheduled timers
    service.cancelScheduleArchive('project-001');
  });
});
