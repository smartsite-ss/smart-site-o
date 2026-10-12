// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DbConnection } from '../entities/db-connection.entity';
import { CreateDbConnectionDto } from '../dto/create-db-connection.dto';
import { UpdateDbConnectionDto } from '../dto/update-db-connection.dto';
import { DbAdapterFactory } from '../adapters/db-adapter.factory';

@Injectable()
export class DbConnectionService {
  private readonly logger = new Logger(DbConnectionService.name);

  constructor(
    @InjectRepository(DbConnection)
    private readonly dbConnectionRepo: Repository<DbConnection>,
    private readonly adapterFactory: DbAdapterFactory,
  ) {}

  async create(projectId: string, dto: CreateDbConnectionDto): Promise<DbConnection> {
    const entity = this.dbConnectionRepo.create({ ...dto, projectId });
    return this.dbConnectionRepo.save(entity);
  }

  async findAll(projectId: string): Promise<DbConnection[]> {
    return this.dbConnectionRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async findOne(projectId: string, id: string): Promise<DbConnection> {
    const entity = await this.dbConnectionRepo.findOne({ where: { id, projectId } });
    if (!entity) throw new NotFoundException('Database connection not found');
    return entity;
  }

  async update(projectId: string, id: string, dto: UpdateDbConnectionDto): Promise<DbConnection> {
    const entity = await this.findOne(projectId, id);
    Object.assign(entity, dto);
    return this.dbConnectionRepo.save(entity);
  }

  async remove(projectId: string, id: string): Promise<void> {
    const entity = await this.findOne(projectId, id);
    await this.dbConnectionRepo.remove(entity);
  }

  async test(
    projectId: string,
    id: string,
  ): Promise<{ success: boolean; latency: number; error?: string }> {
    const entity = await this.findOne(projectId, id);
    const adapter = this.adapterFactory.getAdapter(entity.dbType);
    const config = this.toAdapterConfig(entity);
    return adapter.testConnection(config);
  }

  async getTables(projectId: string, id: string): Promise<string[]> {
    const entity = await this.findOne(projectId, id);
    const adapter = this.adapterFactory.getAdapter(entity.dbType);
    const config = this.toAdapterConfig(entity);
    return adapter.getTables(config);
  }

  async getColumns(
    projectId: string,
    id: string,
    tableName: string,
  ): Promise<{ name: string; type: string }[]> {
    const entity = await this.findOne(projectId, id);
    const adapter = this.adapterFactory.getAdapter(entity.dbType);
    const config = this.toAdapterConfig(entity);
    const cols = await adapter.getColumns(config, tableName);
    return cols.map((c) => ({ name: c.name, type: c.type }));
  }

  async executeQuery(projectId: string, id: string, sql: string): Promise<any[]> {
    const entity = await this.findOne(projectId, id);
    const adapter = this.adapterFactory.getAdapter(entity.dbType);
    const config = this.toAdapterConfig(entity);
    return adapter.executeQuery(config, sql);
  }

  private toAdapterConfig(entity: DbConnection): Record<string, any> {
    return {
      host: entity.host,
      port: entity.port,
      database: entity.database,
      username: entity.username,
      password: entity.password,
      options: entity.options ? JSON.parse(entity.options) : undefined,
    };
  }
}
