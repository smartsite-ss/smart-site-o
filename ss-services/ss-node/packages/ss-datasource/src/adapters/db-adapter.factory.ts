// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { DbAdapter } from './db-adapter.interface';
import { MysqlAdapter } from './mysql.adapter';
import { SqliteAdapter } from './sqlite.adapter';
import { OracleAdapter } from './oracle.adapter';
import { DbType } from '../entities/db-connection.entity';

@Injectable()
export class DbAdapterFactory {
  constructor(
    private readonly mysqlAdapter: MysqlAdapter,
    private readonly sqliteAdapter: SqliteAdapter,
    private readonly oracleAdapter: OracleAdapter,
  ) {}

  getAdapter(dbType: DbType): DbAdapter {
    switch (dbType) {
      case 'mysql':
        return this.mysqlAdapter;
      case 'sqlite':
        return this.sqliteAdapter;
      case 'oracle':
        return this.oracleAdapter;
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}
