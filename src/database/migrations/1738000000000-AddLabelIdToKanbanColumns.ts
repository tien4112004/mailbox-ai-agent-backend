import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLabelIdToKanbanColumns1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // add column if it doesn't exist
    const table = await queryRunner.getTable('kanban_columns');
    if (!table?.columns.some((c) => c.name === 'label_id')) {
      await queryRunner.query(`ALTER TABLE kanban_columns ADD COLUMN label_id varchar NULL;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE kanban_columns DROP COLUMN IF EXISTS label_id;`);
  }
}
