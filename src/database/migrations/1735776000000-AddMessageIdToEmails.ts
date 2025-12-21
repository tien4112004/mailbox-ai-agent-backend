import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddMessageIdToEmails1735776000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add messageId column
    await queryRunner.addColumn(
      'emails',
      new TableColumn({
        name: 'message_id',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Create unique index on userId + messageId to prevent duplicate emails
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('emails', 'IDX_emails_user_id_message_id');

    // Drop column
    await queryRunner.dropColumn('emails', 'message_id');
  }
}
