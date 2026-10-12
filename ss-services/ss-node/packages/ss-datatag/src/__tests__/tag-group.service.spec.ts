// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TagGroupService } from '../group/tag-group.service';
import { TagGroup } from '../entities/tag-group.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

function makeGroup(overrides: Partial<TagGroup> = {}): TagGroup {
  return {
    id: 'group-001',
    projectId: 'project-001',
    name: 'Test Group',
    parentId: null,
    sortOrder: 0,
    ...overrides,
  } as TagGroup;
}

describe('TagGroupService', () => {
  let service: TagGroupService;
  let mockRepo: jest.Mocked<Partial<Repository<TagGroup>>>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    service = new TagGroupService(mockRepo as any);
  });

  // ==================== create ====================
  describe('create', () => {
    it('TC-TG-001: should create a group with required fields', async () => {
      const created = makeGroup({ id: 'group-001', name: 'Root Group' });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create('project-001', 'Root Group');

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith({
        projectId: 'project-001',
        name: 'Root Group',
        parentId: null,
        sortOrder: 0,
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
    });

    it('TC-TG-002: should create a group with parentId', async () => {
      const created = makeGroup({ id: 'group-002', name: 'Child Group', parentId: 'group-001' });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create('project-001', 'Child Group', 'group-001');

      expect(result.parentId).toBe('group-001');
      expect(mockRepo.create).toHaveBeenCalledWith({
        projectId: 'project-001',
        name: 'Child Group',
        parentId: 'group-001',
        sortOrder: 0,
      });
    });

    it('TC-TG-003: should create a group with custom sortOrder', async () => {
      const created = makeGroup({ id: 'group-003', name: 'Ordered Group', sortOrder: 5 });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create('project-001', 'Ordered Group', undefined, 5);

      expect(result.sortOrder).toBe(5);
      expect(mockRepo.create).toHaveBeenCalledWith({
        projectId: 'project-001',
        name: 'Ordered Group',
        parentId: null,
        sortOrder: 5,
      });
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('TC-TG-010: should return all groups for a project ordered by sortOrder', async () => {
      const groups = [
        makeGroup({ id: 'g1', name: 'A', sortOrder: 0 }),
        makeGroup({ id: 'g2', name: 'B', sortOrder: 1 }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findAll('project-001');

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        order: { sortOrder: 'ASC' },
      });
    });

    it('TC-TG-011: should return empty array for project with no groups', async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== findTree ====================
  describe('findTree', () => {
    it('TC-TG-020: should build a flat tree with root-level groups', async () => {
      const groups = [
        makeGroup({ id: 'g1', name: 'Root 1', parentId: null, sortOrder: 0 }),
        makeGroup({ id: 'g2', name: 'Root 2', parentId: null, sortOrder: 1 }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Root 1');
      expect(result[0].children).toEqual([]);
      expect(result[1].name).toBe('Root 2');
      expect(result[0].level).toBe(0);
    });

    it('TC-TG-021: should build a nested tree with parent-child relationships', async () => {
      const groups = [
        makeGroup({ id: 'g1', name: 'Parent', parentId: null, sortOrder: 0 }),
        makeGroup({ id: 'g2', name: 'Child', parentId: 'g1', sortOrder: 0 }),
        makeGroup({ id: 'g3', name: 'Grandchild', parentId: 'g2', sortOrder: 0 }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Parent');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Child');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('Grandchild');
    });

    it('TC-TG-022: should limit tree depth to 3 levels', async () => {
      const groups = [
        makeGroup({ id: 'g1', name: 'L1', parentId: null }),
        makeGroup({ id: 'g2', name: 'L2', parentId: 'g1' }),
        makeGroup({ id: 'g3', name: 'L3', parentId: 'g2' }),
        makeGroup({ id: 'g4', name: 'L4', parentId: 'g3' }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result).toHaveLength(1);
      const l3 = result[0].children[0].children[0];
      expect(l3.name).toBe('L3');
      expect(l3.children).toEqual([]); // L4 excluded due to depth limit
    });

    it('TC-TG-023: should handle multiple root groups with children', async () => {
      const groups = [
        makeGroup({ id: 'r1', name: 'Root 1', parentId: null, sortOrder: 0 }),
        makeGroup({ id: 'r2', name: 'Root 2', parentId: null, sortOrder: 1 }),
        makeGroup({ id: 'c1', name: 'Child 1', parentId: 'r1', sortOrder: 0 }),
        makeGroup({ id: 'c2', name: 'Child 2', parentId: 'r1', sortOrder: 1 }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result).toHaveLength(2);
      expect(result[0].children).toHaveLength(2);
      expect(result[1].children).toHaveLength(0);
    });

    it('TC-TG-024: should sort children by sortOrder', async () => {
      const groups = [
        makeGroup({ id: 'r1', name: 'Root', parentId: null, sortOrder: 0 }),
        makeGroup({ id: 'c2', name: 'Child B', parentId: 'r1', sortOrder: 2 }),
        makeGroup({ id: 'c1', name: 'Child A', parentId: 'r1', sortOrder: 1 }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result[0].children[0].name).toBe('Child A');
      expect(result[0].children[1].name).toBe('Child B');
    });

    it('TC-TG-025: should return empty array for empty project', async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findTree('project-001');

      expect(result).toEqual([]);
    });
  });

  // ==================== findById ====================
  describe('findById', () => {
    it('TC-TG-030: should return group by id', async () => {
      const group = makeGroup({ id: 'group-001', name: 'Target' });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(group);

      const result = await service.findById('group-001');

      expect(result).toEqual(group);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'group-001' } });
    });

    it('TC-TG-031: should throw NotFoundException when group not found', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('TC-TG-040: should update group name', async () => {
      const group = makeGroup({ id: 'group-001', name: 'Old Name' });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(group);
      (mockRepo.save as jest.Mock).mockResolvedValue({ ...group, name: 'New Name' });

      const result = await service.update('group-001', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-TG-041: should update group parentId', async () => {
      const group = makeGroup({ id: 'group-001', parentId: null });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(group);
      (mockRepo.save as jest.Mock).mockResolvedValue({ ...group, parentId: 'group-000' });

      const result = await service.update('group-001', { parentId: 'group-000' });

      expect(result.parentId).toBe('group-000');
    });

    it('TC-TG-042: should update group sortOrder', async () => {
      const group = makeGroup({ id: 'group-001', sortOrder: 0 });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(group);
      (mockRepo.save as jest.Mock).mockResolvedValue({ ...group, sortOrder: 10 });

      const result = await service.update('group-001', { sortOrder: 10 });

      expect(result.sortOrder).toBe(10);
    });

    it('TC-TG-043: should only update provided fields', async () => {
      const group = makeGroup({
        id: 'group-001',
        name: 'Keep Name',
        parentId: 'parent-001',
        sortOrder: 5,
      });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(group);

      const saved = { ...group, name: 'New Name' };
      (mockRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.update('group-001', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.parentId).toBe('parent-001');
      expect(result.sortOrder).toBe(5);
    });

    it('TC-TG-044: should throw NotFoundException when updating non-existent group', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    it('TC-TG-050: should remove group and reassign children to parent', async () => {
      const group = makeGroup({ id: 'group-001', parentId: 'root-001' });
      const children = [
        makeGroup({ id: 'child-001', parentId: 'group-001' }),
        makeGroup({ id: 'child-002', parentId: 'group-001' }),
      ];

      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce(group);
      (mockRepo.find as jest.Mock).mockResolvedValue(children);

      await service.remove('group-001');

      // Children should be reassigned to grandparent
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'root-001' }));
      expect(mockRepo.save).toHaveBeenCalledTimes(2); // Once for each child
      expect(mockRepo.remove).toHaveBeenCalledWith(group);
    });

    it('TC-TG-051: should remove group with no children', async () => {
      const group = makeGroup({ id: 'group-001', parentId: null });
      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce(group);
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      await service.remove('group-001');

      expect(mockRepo.remove).toHaveBeenCalledWith(group);
      // No children to reassign
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-TG-052: should reassign children to null when parent is root level', async () => {
      const group = makeGroup({ id: 'group-001', parentId: null });
      const children = [makeGroup({ id: 'child-001', parentId: 'group-001' })];

      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce(group);
      (mockRepo.find as jest.Mock).mockResolvedValue(children);

      await service.remove('group-001');

      // Children should be reassigned to null (become root level)
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ parentId: null }));
    });

    it('TC-TG-053: should throw NotFoundException when removing non-existent group', async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-TG-060: should handle create with empty name', async () => {
      const created = makeGroup({ id: 'group-001', name: '' });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create('project-001', '');

      expect(result.name).toBe('');
    });

    it('TC-TG-061: should handle tree with null parentId groups only', async () => {
      const groups = [
        makeGroup({ id: 'g1', name: 'A', parentId: null }),
        makeGroup({ id: 'g2', name: 'B', parentId: null }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(groups);

      const result = await service.findTree('project-001');

      expect(result).toHaveLength(2);
      expect(result.every((g) => g.children.length === 0)).toBe(true);
    });
  });
});
