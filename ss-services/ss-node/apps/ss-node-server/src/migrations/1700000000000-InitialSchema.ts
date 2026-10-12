// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'username', type: 'varchar', length: '100', isUnique: true },
          { name: 'password', type: 'varchar', length: '255' },
          { name: 'role', type: 'varchar', length: '50', default: "'operator'" },
          { name: 'is_active', type: 'boolean', default: '1' },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
          { name: 'updated_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'dev_devices',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'type', type: 'varchar', length: '30' },
          { name: 'config', type: 'text' },
          { name: 'status', type: 'varchar', length: '20', default: "'offline'" },
          { name: 'projectId', type: 'varchar', length: '36' },
          { name: 'last_online_at', type: 'datetime', isNullable: true },
          { name: 'error_count', type: 'integer', default: '0' },
          { name: 'last_error_at', type: 'datetime', isNullable: true },
          { name: 'last_error_msg', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: "datetime('now')" },
          { name: 'updatedAt', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'alm_alarm_rules',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'projectId', type: 'varchar', length: '36' },
          { name: 'tagId', type: 'varchar', length: '36' },
          { name: 'level', type: 'varchar', length: '30', default: "'warning'" },
          { name: 'condition', type: 'varchar', length: '30' },
          { name: 'conditionValue', type: 'varchar', length: '100' },
          { name: 'debounce_ms', type: 'integer', default: '0' },
          { name: 'enabled', type: 'boolean', default: '1' },
          { name: 'createdAt', type: 'datetime', default: "datetime('now')" },
          { name: 'updatedAt', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'alm_alarm_records',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'ruleId', type: 'varchar', length: '36' },
          { name: 'tagId', type: 'varchar', length: '36' },
          { name: 'projectId', type: 'varchar', length: '36' },
          { name: 'value', type: 'decimal', isNullable: true },
          { name: 'limit', type: 'decimal', isNullable: true },
          { name: 'message', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '30', default: "'triggered'" },
          { name: 'triggeredAt', type: 'datetime', default: "datetime('now')" },
          { name: 'acknowledgedAt', type: 'datetime', isNullable: true },
          { name: 'acknowledgedBy', type: 'varchar', length: '36', isNullable: true },
          { name: 'clearedAt', type: 'datetime', isNullable: true },
          { name: 'clearedBy', type: 'varchar', length: '36', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: "datetime('now')" },
          { name: 'updatedAt', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('alm_alarm_records');
    await queryRunner.dropTable('alm_alarm_rules');
    await queryRunner.dropTable('dev_devices');
    await queryRunner.dropTable('sys_users');
  }
}
