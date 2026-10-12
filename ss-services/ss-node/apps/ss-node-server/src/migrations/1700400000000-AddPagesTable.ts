// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPagesTable1700400000000 implements MigrationInterface {
  name = 'AddPagesTable1700400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'prj_pages',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'config', type: 'simple-json', isNullable: true },
          { name: 'order_index', type: 'integer', default: '0' },
          { name: 'project_id', type: 'varchar', length: '36' },
          { name: 'created_at', type: 'datetime', default: "datetime('now')" },
          { name: 'updated_at', type: 'datetime', default: "datetime('now')" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'prj_pages',
      new TableIndex({
        name: 'idx_prj_pages_project_id',
        columnNames: ['project_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('prj_pages');
  }
}
