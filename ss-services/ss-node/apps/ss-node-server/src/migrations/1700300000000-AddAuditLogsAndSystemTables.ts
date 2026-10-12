// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class AddAuditLogsAndSystemTables1700300000000 implements MigrationInterface {
  name = 'AddAuditLogsAndSystemTables1700300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_operation_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'action', type: 'varchar', length: '100' },
          { name: 'resource', type: 'varchar', length: '100' },
          { name: 'resource_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'user_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'username', type: 'varchar', length: '100', isNullable: true },
          { name: 'ip', type: 'varchar', length: '45', isNullable: true },
          { name: 'user_agent', type: 'text', isNullable: true },
          { name: 'details', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'success'" },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_operation_logs',
      new TableIndex({
        name: 'idx_sys_operation_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'sys_operation_logs',
      new TableIndex({
        name: 'idx_sys_operation_logs_resource',
        columnNames: ['resource'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'sys_error_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'level', type: 'varchar', length: '20' },
          { name: 'message', type: 'text' },
          { name: 'stack', type: 'text', isNullable: true },
          { name: 'context', type: 'text', isNullable: true },
          { name: 'url', type: 'varchar', length: '500', isNullable: true },
          { name: 'method', type: 'varchar', length: '10', isNullable: true },
          { name: 'user_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'ip', type: 'varchar', length: '45', isNullable: true },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_error_logs',
      new TableIndex({
        name: 'idx_sys_error_logs_level',
        columnNames: ['level'],
      }),
    );

    await queryRunner.createIndex(
      'sys_error_logs',
      new TableIndex({
        name: 'idx_sys_error_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'sys_configs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'key', type: 'varchar', length: '200' },
          { name: 'value', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'varchar', length: '20', default: "'string'" },
          { name: 'updated_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'sys_configs',
      new TableUnique({
        name: 'uq_sys_configs_key',
        columnNames: ['key'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_configs');
    await queryRunner.dropTable('sys_error_logs');
    await queryRunner.dropTable('sys_operation_logs');
  }
}
