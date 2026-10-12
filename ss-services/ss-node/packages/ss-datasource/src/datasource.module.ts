// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbConnection } from './entities/db-connection.entity';
import { DbConnectionService } from './services/db-connection.service';
import { DbConnectionController } from './controllers/db-connection.controller';
import { DbAdapterFactory } from './adapters/db-adapter.factory';
import { MysqlAdapter } from './adapters/mysql.adapter';
import { SqliteAdapter } from './adapters/sqlite.adapter';
import { OracleAdapter } from './adapters/oracle.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([DbConnection])],
  controllers: [DbConnectionController],
  providers: [DbConnectionService, DbAdapterFactory, MysqlAdapter, SqliteAdapter, OracleAdapter],
  exports: [DbConnectionService],
})
export class DataSourceModule {}
