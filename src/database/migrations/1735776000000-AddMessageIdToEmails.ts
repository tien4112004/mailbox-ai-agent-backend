import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddMessageIdToEmails1735776000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add messageId column if missing
    const emailsTable = await queryRunner.getTable('emails');
    const hasMessageId = emailsTable?.columns.some((c) => c.name === 'message_id');
    if (!hasMessageId) {
      await queryRunner.addColumn(
        'emails',
        new TableColumn({
          name: 'message_id',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // Create unique index on userId + messageId to prevent duplicate emails if missing
    const hasIndex = emailsTable?.indices.some((idx) => idx.name === 'IDX_emails_user_id_message_id');
    if (!hasIndex) {
      await queryRunner.createIndex(
        'emails',
        new TableIndex({
          name: 'IDX_emails_user_id_message_id',
          columnNames: ['user_id', 'message_id'],
          isUnique: true,
          where: 'message_id IS NOT NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emailsTable = await queryRunner.getTable('emails');
    if (emailsTable?.indices.some((idx) => idx.name === 'IDX_emails_user_id_message_id')) {
      await queryRunner.dropIndex('emails', 'IDX_emails_user_id_message_id');
    }

    if (emailsTable?.columns.some((c) => c.name === 'message_id')) {
      await queryRunner.dropColumn('emails', 'message_id');
    }
  }
}
