// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  PositionService,
  CreatePositionDto,
  UpdatePositionDto,
} from '../core/user/position.service';
import { Position } from '../core/user/entities/position.entity';

describe('PositionService', () => {
  let service: PositionService;
  let positionRepo: jest.Mocked<Repository<Position>>;

  const mockPosition: Position = {
    id: 'pos-1',
    name: '工程师',
    code: 'engineer',
    description: '工程师岗位',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        { provide: getRepositoryToken(Position), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get<PositionService>(PositionService);
    positionRepo = module.get(getRepositoryToken(Position));
  });

  // ──────── findAll / findById / findByCode ────────

  describe('findAll', () => {
    it('should return all positions sorted by sortOrder', async () => {
      positionRepo.find.mockResolvedValue([mockPosition]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(positionRepo.find).toHaveBeenCalledWith({ order: { sortOrder: 'ASC' } });
    });

    it('should return empty array when no positions', async () => {
      positionRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return position by id', async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);
      const result = await service.findById('pos-1');
      expect(result.id).toBe('pos-1');
      expect(positionRepo.findOne).toHaveBeenCalledWith({ where: { id: 'pos-1' } });
    });

    it('should throw NotFoundException when position not found', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return position by code', async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);
      const result = await service.findByCode('engineer');
      expect(result?.code).toBe('engineer');
    });

    it('should return null when code not found', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      const result = await service.findByCode('unknown');
      expect(result).toBeNull();
    });
  });

  // ──────── create ────────

  describe('create', () => {
    const dto: CreatePositionDto = {
      name: '厂长',
      code: 'manager',
      description: '厂长岗位',
      sortOrder: 0,
    };

    it('should create a new position successfully', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue({ ...dto } as Position);
      positionRepo.save.mockResolvedValue({ ...dto, id: 'new-id' } as Position);

      const result = await service.create(dto);
      expect(result.id).toBe('new-id');
      expect(positionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '厂长',
          code: 'manager',
          sortOrder: 0,
        }),
      );
    });

    it('should throw ForbiddenException when code already exists', async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);
      await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should default description to empty string when not provided', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue({} as Position);
      positionRepo.save.mockResolvedValue({ id: 'x' } as Position);

      await service.create({ name: 'A', code: 'a' });
      expect(positionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '',
        }),
      );
    });

    it('should default sortOrder to 0 when not provided', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue({} as Position);
      positionRepo.save.mockResolvedValue({ id: 'x' } as Position);

      await service.create({ name: 'A', code: 'a' });
      expect(positionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 0,
        }),
      );
    });
  });

  // ──────── update ────────

  describe('update', () => {
    const dto: UpdatePositionDto = {
      name: '高级工程师',
      description: '更新描述',
    };

    it('should update position fields', async () => {
      const existing = { ...mockPosition };
      positionRepo.findOne.mockResolvedValue(existing);
      positionRepo.save.mockResolvedValue({ ...existing, ...dto });

      const result = await service.update('pos-1', dto);
      expect(result.name).toBe('高级工程师');
      expect(result.description).toBe('更新描述');
    });

    it('should only update provided fields (code not updatable)', async () => {
      const existing = { ...mockPosition };
      positionRepo.findOne.mockResolvedValue(existing);
      positionRepo.save.mockResolvedValue({ ...existing, name: '新名' });

      await service.update('pos-1', { name: '新名' });
      // code 不在 UpdatePositionDto 中，不会被修改
      expect(existing.code).toBe(mockPosition.code);
      expect(existing.description).toBe(mockPosition.description);
    });

    it('should throw NotFoundException when position not found', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      await expect(service.update('not-exist', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should update sortOrder when provided', async () => {
      const existing = { ...mockPosition };
      positionRepo.findOne.mockResolvedValue(existing);
      positionRepo.save.mockResolvedValue({ ...existing, sortOrder: 10 });

      await service.update('pos-1', { sortOrder: 10 });
      expect(existing.sortOrder).toBe(10);
    });
  });

  // ──────── delete ────────

  describe('delete', () => {
    it('should delete a position', async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);
      await service.delete('pos-1');
      expect(positionRepo.remove).toHaveBeenCalledWith(mockPosition);
    });

    it('should throw NotFoundException when position not found', async () => {
      positionRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('not-exist')).rejects.toThrow(NotFoundException);
    });
  });
});

/** 创建模拟 Repository */
function createMockRepo<T>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((dto) => dto),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn(),
    manager: {} as any,
    metadata: {} as any,
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    preload: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    merge: jest.fn(),
    findOneOrFail: jest.fn(),
    findByIds: jest.fn(),
    exist: jest.fn(),
    clear: jest.fn(),
    sum: jest.fn(),
    average: jest.fn(),
    minimum: jest.fn(),
    maximum: jest.fn(),
    target: {} as any,
    hasId: jest.fn(),
    getId: jest.fn(),
    extend: jest.fn(),
  } as any;
}
