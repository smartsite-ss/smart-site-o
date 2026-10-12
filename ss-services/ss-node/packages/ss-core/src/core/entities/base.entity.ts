// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

/**
 * 基础实体 — 所有实体共享的字段
 * 包含 id、createdAt、updatedAt
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}

/**
 * 项目作用域实体 — 继承 BaseEntity，额外包含 projectId 字段
 * 适用于按项目隔离数据的业务实体（Device、DataTag、Alarm 等）
 */
export abstract class ProjectScopedEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  projectId: string;
}
