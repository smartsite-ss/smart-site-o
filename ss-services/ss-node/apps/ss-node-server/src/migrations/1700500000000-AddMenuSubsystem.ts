// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddMenuSubsystem1700500000000 implements MigrationInterface {
  name = 'AddMenuSubsystem1700500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sys_menus',
      new TableColumn({
        name: 'subsystem',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'sys_menus',
      new TableIndex({
        name: 'idx_sys_menus_subsystem',
        columnNames: ['subsystem'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sys_menus', 'idx_sys_menus_subsystem');
    await queryRunner.dropColumn('sys_menus', 'subsystem');
  }
}
