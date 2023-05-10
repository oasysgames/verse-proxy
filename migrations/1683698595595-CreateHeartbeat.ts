import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class CreateHeartbeat1683698595595 implements MigrationInterface {
  private tableName = 'heartbeats';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          new TableColumn({ name: 'id', type: 'serial', isPrimary: true }),
          new TableColumn({ name: 'created_at', type: 'bigint' }),
        ],
      }),
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: 'IDX_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.tableName, 'IDX_created_at');
    await queryRunner.dropTable(this.tableName);
  }
}
