// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ProjectRepositoryService } from '../services/project-repository.service';
import { ProjectDatabaseService } from '@ss-node/ss-core';

describe('ProjectRepositoryService', () => {
  let service: ProjectRepositoryService;
  let mockDbService: Partial<ProjectDatabaseService>;
  let mockConfigService: Partial<ConfigService>;

  const mockDataSource = {
    getRepository: jest.fn(),
    isInitialized: true,
    destroy: jest.fn(),
  } as unknown as DataSource;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'PROJECT_DB_MODE') return 'isolated';
        if (key === 'PROJECTS_DIR') return './data/projects';
        return undefined;
      }),
    };

    mockDbService = {
      getMode: jest.fn().mockReturnValue('isolated'),
      getLoadedSystemDb: jest.fn().mockReturnValue(mockDataSource),
      getConnection: jest.fn().mockReturnValue({ system: mockDataSource }),
      loadProjectDatabases: jest.fn().mockResolvedValue({ system: mockDataSource }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectRepositoryService,
        { provide: ProjectDatabaseService, useValue: mockDbService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProjectRepositoryService>(ProjectRepositoryService);
    jest.clearAllMocks();
  });

  describe('TC-REPO-001: getMode', () => {
    it('should delegate to ProjectDatabaseService.getMode', () => {
      expect(service.getMode()).toBe('isolated');
      expect(mockDbService.getMode).toHaveBeenCalled();
    });

    it('should return unified when db service returns unified', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');
      expect(service.getMode()).toBe('unified');
    });
  });

  describe('TC-REPO-002: getRepository in isolated mode', () => {
    it('should return repository from project system.db', () => {
      const mockRepo = { find: jest.fn() };
      (mockDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

      const FakeEntity = class {};
      const repo = service.getRepository(FakeEntity, 'test-project');

      expect(repo).toBe(mockRepo);
      expect(mockDbService.getLoadedSystemDb).toHaveBeenCalledWith('test-project');
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(FakeEntity);
    });

    it('should throw if system.db not loaded in isolated mode', () => {
      (mockDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(undefined);

      const FakeEntity = class {};
      expect(() => service.getRepository(FakeEntity, 'not-loaded')).toThrow('system.db not loaded');
    });
  });

  describe('TC-REPO-003: getRepository in unified mode', () => {
    it('should return repository from global DataSource', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      const mockGlobalDs = { getRepository: jest.fn().mockReturnValue({ find: jest.fn() }) } as any;
      service.setGlobalDataSource(mockGlobalDs);

      const FakeEntity = class {};
      const _repo = service.getRepository(FakeEntity, 'any-project');

      expect(mockGlobalDs.getRepository).toHaveBeenCalledWith(FakeEntity);
    });

    it('should throw if global DataSource not set in unified mode', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      const FakeEntity = class {};
      expect(() => service.getRepository(FakeEntity, 'any-project')).toThrow(
        'Global DataSource not set',
      );
    });
  });

  describe('TC-REPO-004: getRepositoryOrFallback', () => {
    it('should return project repo in isolated mode', () => {
      const mockRepo = { find: jest.fn() };
      (mockDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

      const FakeEntity = class {};
      const fallbackRepo = { find: jest.fn() } as any;
      const repo = service.getRepositoryOrFallback(FakeEntity, 'test-project', fallbackRepo);

      expect(repo).toBe(mockRepo);
    });

    it('should return fallback repo in unified mode', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      const FakeEntity = class {};
      const fallbackRepo = { find: jest.fn() } as any;
      const repo = service.getRepositoryOrFallback(FakeEntity, 'any-project', fallbackRepo);

      expect(repo).toBe(fallbackRepo);
    });
  });

  describe('TC-REPO-006: ensureProjectLoaded', () => {
    it('should load project if not loaded in isolated mode', async () => {
      (mockDbService.getConnection as jest.Mock).mockReturnValue(undefined);

      await service.ensureProjectLoaded('new-project');
      expect(mockDbService.loadProjectDatabases).toHaveBeenCalledWith('new-project');
    });

    it('should skip loading if already loaded', async () => {
      (mockDbService.getConnection as jest.Mock).mockReturnValue({ system: mockDataSource });

      await service.ensureProjectLoaded('loaded-project');

      expect(mockDbService.loadProjectDatabases).not.toHaveBeenCalled();
    });

    it('should skip in unified mode', async () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      await service.ensureProjectLoaded('any-project');

      expect(mockDbService.loadProjectDatabases).not.toHaveBeenCalled();
    });
  });

  describe('TC-REPO-007: getSystemDataSource', () => {
    it('should return system DataSource in isolated mode', () => {
      const ds = service.getSystemDataSource('test-project');
      expect(ds).toBe(mockDataSource);
    });

    it('should return global DataSource in unified mode', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      const mockGlobalDs = { getRepository: jest.fn() } as any;
      service.setGlobalDataSource(mockGlobalDs);

      const ds = service.getSystemDataSource('any-project');
      expect(ds).toBe(mockGlobalDs);
    });

    it('should throw if system.db not loaded in isolated mode', () => {
      (mockDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(undefined);

      expect(() => service.getSystemDataSource('not-loaded')).toThrow('system.db not loaded');
    });

    it('should throw if global DataSource not set in unified mode', () => {
      (mockDbService.getMode as jest.Mock).mockReturnValue('unified');

      expect(() => service.getSystemDataSource('any-project')).toThrow('Global DataSource not set');
    });
  });
});
