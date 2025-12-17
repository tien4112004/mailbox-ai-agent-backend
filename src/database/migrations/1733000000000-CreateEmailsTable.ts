import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class CreateEmailsTable1735773600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'emails',
        columns: [
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          }),
          new TableColumn({
            name: 'subject',
            type: 'varchar',
          }),
          new TableColumn({
            name: 'body',
            type: 'text',
          }),
          new TableColumn({
            name: 'preview',
            type: 'text',
          }),
          new TableColumn({
            name: 'from_name',
            type: 'varchar',
          }),
          new TableColumn({
            name: 'from_email',
            type: 'varchar',
          }),
          new TableColumn({
            name: 'to_email',
            type: 'simple-array',
          }),
          new TableColumn({
            name: 'read',
            type: 'boolean',
            default: false,
          }),
          new TableColumn({
            name: 'starred',
            type: 'boolean',
            default: false,
          }),
          new TableColumn({
            name: 'folder',
            type: 'varchar',
            default: "'inbox'",
          }),
          new TableColumn({
            name: 'attachments',
            type: 'jsonb',
            isNullable: true,
          }),
          new TableColumn({
            name: 'thread_id',
            type: 'varchar',
            isNullable: true,
          }),
          new TableColumn({
            name: 'user_id',
            type: 'uuid',
          }),
          new TableColumn({
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          new TableColumn({
            name: 'summary',
            type: 'text',
            isNullable: true,
            comment: 'AI-generated summary of the email content',
          }),
          new TableColumn({
            name: 'summary_generated_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when the summary was generated',
          }),
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_emails_user_id_folder_createdAt',
            columnNames: ['user_id', 'folder', 'created_at'],
          },
          {
            name: 'IDX_emails_user_id_folder',
            columnNames: ['user_id', 'folder'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('emails');
  }
}
