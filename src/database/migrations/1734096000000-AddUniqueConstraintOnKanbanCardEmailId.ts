import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class AddUniqueConstraintOnKanbanCardEmailId1734096000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove duplicate cards keeping only the first one for each email
    // MIN() does not work with uuid type in Postgres, so use ROW_NUMBER() window
    // function to identify duplicates and remove those with rn > 1.
    await queryRunner.query(`
      DELETE FROM kanban_cards WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY "emailId" ORDER BY id) AS rn
          FROM kanban_cards
        ) t WHERE t.rn > 1
      );
    `);
    // Now add the unique constraint if it does not exist
    const exists = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conrelid = 'kanban_cards'::regclass AND conname = 'UQ_kanban_cards_emailId'`,
    );
    if (exists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE kanban_cards ADD CONSTRAINT "UQ_kanban_cards_emailId" UNIQUE ("emailId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE kanban_cards DROP CONSTRAINT IF EXISTS "UQ_kanban_cards_emailId"`,
    );
  }
}
