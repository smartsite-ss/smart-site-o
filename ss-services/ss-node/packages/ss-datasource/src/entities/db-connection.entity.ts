// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DbType = 'mysql' | 'sqlite' | 'oracle' | 'postgresql' | 'mssql';

@Entity('prj_db_connections')
export class DbConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'simple-enum', enum: ['mysql', 'sqlite', 'oracle', 'postgresql', 'mssql'] })
  dbType: DbType;

  @Column({ nullable: true })
  host: string;

  @Column({ type: 'int', nullable: true })
  port: number;

  @Column({ nullable: true })
  database: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'text', nullable: true })
  options: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
