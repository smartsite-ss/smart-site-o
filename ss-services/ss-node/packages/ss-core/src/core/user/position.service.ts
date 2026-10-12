// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';

export interface CreatePositionDto {
  name: string;
  code: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdatePositionDto {
  name?: string;
  description?: string;
  sortOrder?: number;
}

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async findAll(): Promise<Position[]> {
    return this.positionRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findById(id: string): Promise<Position> {
    const position = await this.positionRepository.findOne({ where: { id } });
    if (!position) throw new NotFoundException('岗位不存在');
    return position;
  }

  async findByCode(code: string): Promise<Position | null> {
    return this.positionRepository.findOne({ where: { code } });
  }

  async create(dto: CreatePositionDto): Promise<Position> {
    const existing = await this.findByCode(dto.code);
    if (existing) throw new ForbiddenException('岗位编码已存在');
    const position = this.positionRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description || '',
      sortOrder: dto.sortOrder || 0,
    });
    return this.positionRepository.save(position);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<Position> {
    const position = await this.findById(id);
    if (dto.name !== undefined) position.name = dto.name;
    if (dto.description !== undefined) position.description = dto.description;
    if (dto.sortOrder !== undefined) position.sortOrder = dto.sortOrder;
    return this.positionRepository.save(position);
  }

  async delete(id: string): Promise<void> {
    const position = await this.findById(id);
    await this.positionRepository.remove(position);
  }
}
