// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagGroup } from '../entities/tag-group.entity';

// 树节点类型：在 TagGroup 基础上增加层级和子节点
export interface TagGroupTreeNode extends TagGroup {
  level: number;
  children: TagGroupTreeNode[];
}

@Injectable()
export class TagGroupService {
  private readonly logger = new Logger(TagGroupService.name);

  constructor(
    @InjectRepository(TagGroup)
    private readonly groupRepo: Repository<TagGroup>,
  ) {}

  async create(
    projectId: string,
    name: string,
    parentId?: string,
    sortOrder?: number,
  ): Promise<TagGroup> {
    const group = this.groupRepo.create({
      projectId,
      name,
      parentId: parentId ?? null,
      sortOrder: sortOrder ?? 0,
    });

    this.logger.log(`Created tag group: ${name} [${group.id}]`);
    return this.groupRepo.save(group);
  }

  async findAll(projectId: string): Promise<TagGroup[]> {
    return this.groupRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findTree(projectId: string): Promise<TagGroupTreeNode[]> {
    const groups = await this.findAll(projectId);
    return this.buildTree(groups, null);
  }

  async findById(id: string): Promise<TagGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`标签分组不存在: ${id}`);
    }
    return group;
  }

  async update(
    id: string,
    dto: { name?: string; parentId?: string; sortOrder?: number },
  ): Promise<TagGroup> {
    const group = await this.findById(id);
    if (dto.name !== undefined) group.name = dto.name;
    if (dto.parentId !== undefined) group.parentId = dto.parentId;
    if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;

    this.logger.log(`Updated tag group: ${group.name} [${id}]`);
    return this.groupRepo.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findById(id);

    const children = await this.groupRepo.find({ where: { parentId: id } });
    for (const child of children) {
      child.parentId = group.parentId;
      await this.groupRepo.save(child);
    }

    await this.groupRepo.remove(group);
    this.logger.log(`Deleted tag group: ${group.name} [${id}]`);
  }

  private buildTree(
    groups: TagGroup[],
    parentId: string | null,
    depth: number = 0,
  ): TagGroupTreeNode[] {
    if (depth >= 3) return [];

    const children = groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return children.map((group) => ({
      ...group,
      level: depth,
      children: this.buildTree(groups, group.id, depth + 1),
    }));
  }
}
