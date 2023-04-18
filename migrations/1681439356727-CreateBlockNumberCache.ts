import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

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
          }),
          new TableColumn({
            name: 'value',
            type: 'varchar',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('block_number_cache');
  }
}
