import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class AddUniqueConstraintOnKanbanCardEmailId1734096000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, remove duplicate cards keeping only the first one for each email
    await queryRunner.query(`
      DELETE FROM kanban_cards 
      WHERE id NOT IN (
        SELECT MIN(id) FROM kanban_cards 
        GROUP BY "emailId"
      );
    `);

    // Now add the unique constraint
    await queryRunner.query(
      `ALTER TABLE kanban_cards ADD CONSTRAINT "UQ_kanban_cards_emailId" UNIQUE ("emailId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE kanban_cards DROP CONSTRAINT "UQ_kanban_cards_emailId"`,
    );
  }
}
