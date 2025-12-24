import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddKanbanIndexes1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate kanban cards (keep the first one, delete others)
    // This ensures the unique index can be created
    await queryRunner.query(`
      DELETE FROM kanban_cards kc1
      WHERE EXISTS (
        SELECT 1 FROM kanban_cards kc2
        WHERE kc1."emailId" = kc2."emailId"
        AND kc1."columnId" = kc2."columnId"
        AND kc1.id > kc2.id
      )
    `);
    // Add indexes to kanban_columns table if not exists
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kanban_columns_user_id_isActive" ON kanban_columns (user_id, "isActive")`,
    );

    // Add indexes to kanban_cards table if not exists
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kanban_cards_columnId_order" ON kanban_cards ("columnId", "order")`,
    );

    // Create unique index after removing duplicates
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_kanban_cards_emailId_columnId" ON kanban_cards ("emailId", "columnId")`,
    );

    // Add indexes to emails table if not exists
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_emails_user_id_folder_createdAt" ON emails (user_id, folder, created_at)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_emails_user_id_folder" ON emails (user_id, folder)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes if they exist
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kanban_columns_user_id_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kanban_cards_columnId_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kanban_cards_emailId_columnId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emails_user_id_folder_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_emails_user_id_folder"`);
  }
}

