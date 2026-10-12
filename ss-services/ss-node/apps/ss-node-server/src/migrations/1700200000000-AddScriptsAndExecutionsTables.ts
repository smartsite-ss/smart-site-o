// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddScriptsAndExecutionsTables1700200000000 implements MigrationInterface {
  name = 'AddScriptsAndExecutionsTables1700200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'prj_scripts',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'code', type: 'text' },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
          { name: 'trigger_type', type: 'varchar', length: '20' },
          { name: 'trigger_config', type: 'text', isNullable: true },
          { name: 'allow_network', type: 'boolean', default: '0' },
          { name: 'allow_file_system', type: 'boolean', default: '0' },
          { name: 'timeout_ms', type: 'integer', default: '5000' },
          { name: 'memory_limit_mb', type: 'integer', default: '128' },
          { name: 'project_id', type: 'varchar', length: '36' },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
          { name: 'updated_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'prj_script_executions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'script_id', type: 'varchar', length: '36' },
          { name: 'trigger', type: 'varchar', length: '20' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'result', type: 'text', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'duration_ms', type: 'integer', default: '0' },
          { name: 'memory_used_mb', type: 'integer', default: '0' },
          { name: 'started_at', type: 'datetime', isNullable: true },
          { name: 'finished_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'prj_script_executions',
      new TableIndex({
        name: 'idx_prj_script_executions_script_id',
        columnNames: ['script_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('prj_script_executions');
    await queryRunner.dropTable('prj_scripts');
  }
}
