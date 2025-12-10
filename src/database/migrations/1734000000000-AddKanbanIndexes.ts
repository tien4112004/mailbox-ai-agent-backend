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

    // Add indexes to kanban_columns table
    await queryRunner.createIndex(
      'kanban_columns',
      new TableIndex({
        name: 'IDX_kanban_columns_user_id_isActive',
        columnNames: ['user_id', 'isActive'],
      }),
    );

    // Add indexes to kanban_cards table
    await queryRunner.createIndex(
      'kanban_cards',
      new TableIndex({
        name: 'IDX_kanban_cards_columnId_order',
        columnNames: ['columnId', 'order'],
      }),
    );

    // Create unique index after removing duplicates
    await queryRunner.createIndex(
      'kanban_cards',
      new TableIndex({
        name: 'IDX_kanban_cards_emailId_columnId',
        columnNames: ['emailId', 'columnId'],
        isUnique: true,
      }),
    );

    // Add indexes to emails table
    await queryRunner.createIndex(
      'emails',
      new TableIndex({
        name: 'IDX_emails_user_id_folder_createdAt',
        columnNames: ['user_id', 'folder', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'emails',
      new TableIndex({
        name: 'IDX_emails_user_id_folder',
        columnNames: ['user_id', 'folder'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('kanban_columns', 'IDX_kanban_columns_user_id_isActive');
    await queryRunner.dropIndex('kanban_cards', 'IDX_kanban_cards_columnId_order');
    await queryRunner.dropIndex('kanban_cards', 'IDX_kanban_cards_emailId_columnId');
    await queryRunner.dropIndex('emails', 'IDX_emails_user_id_folder_createdAt');
    await queryRunner.dropIndex('emails', 'IDX_emails_user_id_folder');
  }
}

