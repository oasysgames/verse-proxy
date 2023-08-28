import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateBlockNumberCache1681439356727 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'block_number_cache',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          }),
          new TableColumn({
            name: 'name',
            type: 'varchar',
            isNullable: false,
          }),
          new TableColumn({
            name: 'value',
            type: 'varchar',
            isNullable: false,
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'bigint',
          }),
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_BlockNumberCache_Name',
            columnNames: ['name'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('block_number_cache');
  }
}
