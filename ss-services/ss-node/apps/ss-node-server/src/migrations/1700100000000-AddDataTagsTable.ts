// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddDataTagsTable1700100000000 implements MigrationInterface {
  name = 'AddDataTagsTable1700100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dev_data_tags',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'address', type: 'varchar', length: '500' },
          { name: 'data_type', type: 'varchar', length: '20', default: "'float32'" },
          { name: 'config', type: 'text', isNullable: true },
          { name: 'scale', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'offset', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'scan_rate', type: 'integer', default: '1000' },
          { name: 'enabled', type: 'boolean', default: '1' },
          { name: 'description', type: 'varchar', length: '50', isNullable: true },
          { name: 'unit', type: 'varchar', length: '50', isNullable: true },
          { name: 'decimal_places', type: 'integer', isNullable: true },
          { name: 'min_value', type: 'double', isNullable: true },
          { name: 'max_value', type: 'double', isNullable: true },
          { name: 'project_id', type: 'varchar', length: '36', isNullable: true },
          {
            name: 'display_format',
            type: 'varchar',
            length: '20',
            default: "'%.2f'",
            isNullable: true,
          },
          { name: 'eng_min_value', type: 'double', isNullable: true },
          { name: 'eng_max_value', type: 'double', isNullable: true },
          { name: 'timeout', type: 'integer', default: '5000', isNullable: true },
          { name: 'retry_count', type: 'integer', default: '3', isNullable: true },
          { name: 'deadband_mode', type: 'varchar', length: '20', default: "'none'" },
          { name: 'deadband_value', type: 'double', isNullable: true },
          { name: 'deadband_percent', type: 'double', isNullable: true },
          { name: 'deadband_time', type: 'integer', isNullable: true },
          { name: 'conversion_type', type: 'varchar', length: '20', default: "'none'" },
          { name: 'conversion_config', type: 'simple-json', isNullable: true },
          { name: 'alarm_high_high', type: 'double', isNullable: true },
          { name: 'alarm_high', type: 'double', isNullable: true },
          { name: 'alarm_low', type: 'double', isNullable: true },
          { name: 'alarm_low_low', type: 'double', isNullable: true },
          { name: 'alarm_deviation', type: 'double', isNullable: true },
          { name: 'alarm_enabled', type: 'boolean', default: '1' },
          { name: 'quality_check_enabled', type: 'boolean', default: '0' },
          { name: 'max_age', type: 'integer', isNullable: true },
          { name: 'archive_enabled', type: 'boolean', default: '0' },
          { name: 'archive_interval', type: 'integer', isNullable: true },
          { name: 'archive_deadband', type: 'double', isNullable: true },
          { name: 'retention_days', type: 'integer', isNullable: true },
          { name: 'priority', type: 'integer', default: '0' },
          { name: 'group_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'category', type: 'varchar', length: '100', isNullable: true },
          { name: 'tags', type: 'simple-json', isNullable: true },
          { name: 'simulation_enabled', type: 'boolean', default: '0' },
          { name: 'simulation_config', type: 'simple-json', isNullable: true },
          { name: 'device_id', type: 'varchar', length: '36' },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
          { name: 'updated_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'dev_data_tags',
      new TableIndex({
        name: 'idx_dev_data_tags_device_id',
        columnNames: ['device_id'],
      }),
    );

    await queryRunner.createIndex(
      'dev_data_tags',
      new TableIndex({
        name: 'idx_dev_data_tags_project_id',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'dev_data_tags',
      new TableIndex({
        name: 'idx_dev_data_tags_name',
        columnNames: ['name'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dev_data_tags');
  }
}
