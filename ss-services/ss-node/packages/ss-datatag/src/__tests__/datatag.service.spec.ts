// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataTagService } from '../datatag.service';
import { DataTag } from '../entities/data-tag.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo(): MockRepository<DataTag> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };
}

function makeTag(overrides: Partial<DataTag> = {}): DataTag {
  return {
    id: 'tag-001',
    name: 'test-tag',
    address: '40001',
    dataType: 'float32' as any,
    deviceId: 'device-001',
    projectId: 'project-001',
    description: 'test description',
    unit: 'V',
    displayFormat: '%.2f',
    decimalPlaces: 2,
    minValue: 0,
    maxValue: 100,
    engMinValue: 0,
    engMaxValue: 100,
    scale: 1.0,
    offset: 0.0,
    scanRate: 1000,
    timeout: 5000,
    retryCount: 3,
    enabled: true,
    deadbandMode: 'none' as any,
    deadbandValue: null,
    deadbandPercent: null,
    deadbandTime: null,
    conversionType: 'none' as any,
    conversionConfig: null,
    alarmHighHigh: null,
    alarmHigh: null,
    alarmLow: null,
    alarmLowLow: null,
    alarmDeviation: null,
    alarmEnabled: true,
    qualityCheckEnabled: false,
    maxAge: null,
    archiveEnabled: false,
    archiveInterval: null,
    archiveDeadband: null,
    retentionDays: null,
    priority: 1,
    groupId: null,
    category: null,
    tags: null,
    simulationEnabled: false,
    simulationConfig: null,
    direction: 'read',
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DataTagService', () => {
  let service: DataTagService;
  let mockRepo: MockRepository<DataTag>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new DataTagService(mockRepo as any);
  });

  // ==================== create ====================
  describe('create', () => {
    const baseDto: any = {
      name: 'new-tag',
      address: '40002',
      dataType: 'float32',
      deviceId: 'device-001',
      projectId: 'project-001',
    };

    it('TC-DTS-001: should create a tag successfully', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(makeTag({ name: 'new-tag', address: '40002' }));
      mockRepo.save.mockResolvedValue(
        makeTag({ id: 'tag-002', name: 'new-tag', address: '40002' }),
      );

      const result = await service.create(baseDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('tag-002');
      expect(result.name).toBe('new-tag');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'new-tag', deviceId: 'device-001' },
      });
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-DTS-002: should throw BadRequestException when duplicate name+deviceId exists', async () => {
      mockRepo.findOne.mockResolvedValue(makeTag({ name: 'new-tag', deviceId: 'device-001' }));

      await expect(service.create(baseDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto)).rejects.toThrow('标签名称 "new-tag" 在此设备中已存在');
    });

    it('TC-DTS-003: should apply default values when optional fields are omitted', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const savedTag = makeTag({ id: 'tag-003', name: 'minimal-tag' });
      mockRepo.create.mockReturnValue(savedTag);
      mockRepo.save.mockResolvedValue(savedTag);

      await service.create(baseDto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scale: 1.0,
          offset: 0.0,
          scanRate: 1000,
          timeout: 5000,
          retryCount: 3,
          enabled: true,
          alarmEnabled: true,
          qualityCheckEnabled: false,
          archiveEnabled: false,
          simulationEnabled: false,
        }),
      );
    });

    it('TC-DTS-004: should handle string priority values', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const savedTag = makeTag({ id: 'tag-004' });
      mockRepo.create.mockReturnValue(savedTag);
      mockRepo.save.mockResolvedValue(savedTag);

      await service.create({ ...baseDto, priority: 'high' });

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ priority: 2 }));
    });

    it('TC-DTS-005: should handle unknown priority string as normal (1)', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const savedTag = makeTag({ id: 'tag-005' });
      mockRepo.create.mockReturnValue(savedTag);
      mockRepo.save.mockResolvedValue(savedTag);

      await service.create({ ...baseDto, priority: 'unknown_level' });

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ priority: 1 }));
    });

    it('TC-DTS-006: should handle numeric priority value', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const savedTag = makeTag({ id: 'tag-006' });
      mockRepo.create.mockReturnValue(savedTag);
      mockRepo.save.mockResolvedValue(savedTag);

      await service.create({ ...baseDto, priority: 0 });

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ priority: 0 }));
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('TC-DTS-010: should return paginated results with default page/pageSize', async () => {
      const tags = [makeTag({ id: 'tag-001' }), makeTag({ id: 'tag-002' })];
      mockRepo.findAndCount.mockResolvedValue([tags, 2]);

      const result = await service.findAll('project-001', {});

      expect(result).toEqual({
        data: tags,
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      });
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('TC-DTS-011: should apply custom pagination', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 50]);

      const result = await service.findAll('project-001', { page: 3, pageSize: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('TC-DTS-012: should filter by deviceId', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { deviceId: 'device-002' });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where).toEqual({ projectId: 'project-001', deviceId: 'device-002' });
    });

    it('TC-DTS-013: should filter by groupId', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { groupId: 'group-001' });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where).toEqual({ projectId: 'project-001', groupId: 'group-001' });
    });

    it('TC-DTS-014: should search by q keyword (name and address)', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { q: 'pressure' });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(Array.isArray(callArgs.where)).toBe(true);
      expect(callArgs.where).toHaveLength(2);
      expect(callArgs.where[0].name).toEqual(expect.objectContaining({ _type: 'like' }));
      expect(callArgs.where[1].address).toEqual(expect.objectContaining({ _type: 'like' }));
    });

    it('TC-DTS-015: should filter by dataType', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { dataType: 'int32' as any });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.dataType).toBe('int32');
    });

    it('TC-DTS-016: should filter by enabled=true', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { enabled: true });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.enabled).toBe(true);
    });

    it('TC-DTS-017: should filter by enabled=false', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { enabled: false });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.enabled).toBe(false);
    });

    it('TC-DTS-018: should combine q search with dataType filter', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', { q: 'temp', dataType: 'float32' as any });

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(Array.isArray(callArgs.where)).toBe(true);
      expect(callArgs.where).toHaveLength(2);
      expect(callArgs.where[0].dataType).toBe('float32');
      expect(callArgs.where[1].dataType).toBe('float32');
    });

    it('TC-DTS-019: should return empty array when no results', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll('project-001', {});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('TC-DTS-020: should order by createdAt DESC', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('project-001', {});

      const callArgs = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.order).toEqual({ createdAt: 'DESC' });
    });
  });

  // ==================== findByDevice ====================
  describe('findByDevice', () => {
    it('TC-DTS-030: should return tags for a device ordered by name ASC', async () => {
      const tags = [makeTag({ id: 'tag-001' }), makeTag({ id: 'tag-002' })];
      mockRepo.find.mockResolvedValue(tags);

      const result = await service.findByDevice('device-001');

      expect(result).toEqual(tags);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { deviceId: 'device-001' },
        order: { name: 'ASC' },
      });
    });

    it('TC-DTS-031: should return empty array when device has no tags', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findByDevice('empty-device');

      expect(result).toEqual([]);
    });
  });

  // ==================== findById ====================
  describe('findById', () => {
    it('TC-DTS-040: should return tag when found', async () => {
      const tag = makeTag({ id: 'tag-001' });
      mockRepo.findOne.mockResolvedValue(tag);

      const result = await service.findById('tag-001');

      expect(result).toEqual(tag);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tag-001' } });
    });

    it('TC-DTS-041: should throw NotFoundException when tag not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow('标签不存在: non-existent');
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('TC-DTS-050: should update tag fields successfully', async () => {
      const existingTag = makeTag({ id: 'tag-001', name: 'old-name' });
      mockRepo.findOne.mockResolvedValueOnce(existingTag); // findById
      mockRepo.findOne.mockResolvedValueOnce(null); // duplicate name check
      const updatedTag = { ...existingTag, name: 'new-name', description: 'updated' };
      mockRepo.save.mockResolvedValue(updatedTag);

      const result = await service.update('tag-001', { name: 'new-name', description: 'updated' });

      expect(result.name).toBe('new-name');
      expect(result.description).toBe('updated');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-DTS-051: should throw NotFoundException when updating non-existent tag', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'new-name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-DTS-052: should throw BadRequestException when new name conflicts', async () => {
      const existingTag = makeTag({ id: 'tag-001', name: 'old-name', deviceId: 'device-001' });
      mockRepo.findOne.mockResolvedValueOnce(existingTag); // findById
      mockRepo.findOne.mockResolvedValueOnce(makeTag({ id: 'tag-002', name: 'new-name' })); // duplicate check

      await expect(service.update('tag-001', { name: 'new-name' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-DTS-053: should not check duplicate when name is unchanged', async () => {
      const existingTag = makeTag({ id: 'tag-001', name: 'my-tag' });
      mockRepo.findOne.mockResolvedValueOnce(existingTag); // findById
      // expect no second findOne call for duplicate check
      mockRepo.save.mockResolvedValue(existingTag);

      await service.update('tag-001', { name: 'my-tag', description: 'changed' });

      // findOne should have been called only once (for findById)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('TC-DTS-054: should handle string priority in update', async () => {
      const existingTag = makeTag({ id: 'tag-001', priority: 0 });
      mockRepo.findOne.mockResolvedValueOnce(existingTag);
      mockRepo.findOne.mockResolvedValueOnce(null);
      mockRepo.save.mockResolvedValue({ ...existingTag, priority: 3 });

      const result = await service.update('tag-001', { priority: 'critical' as any });

      expect(result.priority).toBe(3);
    });

    it('TC-DTS-055: should update priority to 0 with string "low"', async () => {
      const existingTag = makeTag({ id: 'tag-001', priority: 2 });
      mockRepo.findOne.mockResolvedValueOnce(existingTag);
      mockRepo.findOne.mockResolvedValueOnce(null);
      mockRepo.save.mockResolvedValue({ ...existingTag, priority: 0 });

      const result = await service.update('tag-001', { priority: 'low' as any });

      expect(result.priority).toBe(0);
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    it('TC-DTS-060: should remove tag successfully', async () => {
      const tag = makeTag({ id: 'tag-001' });
      mockRepo.findOne.mockResolvedValue(tag);
      mockRepo.remove.mockResolvedValue(tag);

      await service.remove('tag-001');

      expect(mockRepo.remove).toHaveBeenCalledWith(tag);
    });

    it('TC-DTS-061: should throw NotFoundException when removing non-existent tag', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== batchCreate ====================
  describe('batchCreate', () => {
    it('TC-DTS-070: should create all tags successfully', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const tag1 = makeTag({ id: 'tag-001', name: 'tag1' });
      const tag2 = makeTag({ id: 'tag-002', name: 'tag2' });
      mockRepo.create.mockReturnValueOnce(tag1).mockReturnValueOnce(tag2);
      mockRepo.save.mockResolvedValueOnce(tag1).mockResolvedValueOnce(tag2);

      const dtos = [
        { name: 'tag1', address: '40001', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
        { name: 'tag2', address: '40002', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
      ];

      const result = await service.batchCreate(dtos as any);

      expect(result.success).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('TC-DTS-071: should handle partial failures', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(null) // first tag - no duplicate
        .mockResolvedValueOnce(makeTag({ id: 'existing', name: 'tag2', deviceId: 'd1' })); // second tag - duplicate
      const tag1 = makeTag({ id: 'tag-001', name: 'tag1' });
      mockRepo.create.mockReturnValue(tag1);
      mockRepo.save.mockResolvedValue(tag1);

      const dtos = [
        { name: 'tag1', address: '40001', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
        { name: 'tag2', address: '40002', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
      ];

      const result = await service.batchCreate(dtos as any);

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].message).toContain('tag2');
    });

    it('TC-DTS-072: should handle empty array', async () => {
      const result = await service.batchCreate([]);

      expect(result.success).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('TC-DTS-073: should handle all failures', async () => {
      mockRepo.findOne.mockResolvedValue(makeTag({ id: 'existing' }));

      const dtos = [
        { name: 'tag1', address: '40001', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
        { name: 'tag2', address: '40002', dataType: 'float32', deviceId: 'd1', projectId: 'p1' },
      ];

      const result = await service.batchCreate(dtos as any);

      expect(result.success).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ==================== batchDelete ====================
  describe('batchDelete', () => {
    it('TC-DTS-080: should delete tags and return affected count', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 3, raw: [] });

      const result = await service.batchDelete(['tag-001', 'tag-002', 'tag-003']);

      expect(result.deleted).toBe(3);
      expect(mockRepo.delete).toHaveBeenCalledWith(['tag-001', 'tag-002', 'tag-003']);
    });

    it('TC-DTS-081: should return 0 when no tags matched', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await service.batchDelete(['non-existent']);

      expect(result.deleted).toBe(0);
    });

    it('TC-DTS-082: should handle null/undefined affected count', async () => {
      mockRepo.delete.mockResolvedValue({ affected: null, raw: [] });

      const result = await service.batchDelete(['tag-001']);

      expect(result.deleted).toBe(0);
    });
  });

  // ==================== batchUpdate ====================
  describe('batchUpdate', () => {
    it('TC-DTS-090: should update all tags with the same dto', async () => {
      const tag1 = makeTag({ id: 'tag-001', name: 'tag1' });
      const tag2 = makeTag({ id: 'tag-002', name: 'tag2' });
      // findById for tag-001, then findById for tag-002 (no name in dto, so no duplicate check)
      mockRepo.findOne.mockResolvedValueOnce(tag1).mockResolvedValueOnce(tag2);
      mockRepo.save
        .mockResolvedValueOnce({ ...tag1, enabled: false })
        .mockResolvedValueOnce({ ...tag2, enabled: false });

      const result = await service.batchUpdate(['tag-001', 'tag-002'], { enabled: false } as any);

      expect(result).toHaveLength(2);
      expect(result[0].enabled).toBe(false);
      expect(result[1].enabled).toBe(false);
    });

    it('TC-DTS-091: should throw if one update fails (not found)', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null); // first tag not found

      await expect(
        service.batchUpdate(['non-existent', 'tag-002'], { enabled: false } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-DTS-092: should handle empty ids array', async () => {
      const result = await service.batchUpdate([], { enabled: false } as any);

      expect(result).toEqual([]);
    });
  });
});
