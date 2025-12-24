import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSummaryColumnsToEmails1733840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add summary columns if they don't already exist
    const emailsTable = await queryRunner.getTable('emails');
    const hasSummary = emailsTable?.columns.some((c) => c.name === 'summary');
    const hasSummaryGeneratedAt = emailsTable?.columns.some((c) => c.name === 'summary_generated_at');

    if (!hasSummary) {
      await queryRunner.addColumn(
        'emails',
        new TableColumn({
          name: 'summary',
          type: 'text',
          isNullable: true,
          comment: 'AI-generated summary of the email content',
        }),
      );
    }

    if (!hasSummaryGeneratedAt) {
      await queryRunner.addColumn(
        'emails',
        new TableColumn({
          name: 'summary_generated_at',
          type: 'timestamp',
          isNullable: true,
          comment: 'Timestamp when the summary was generated',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emailsTable = await queryRunner.getTable('emails');
    if (emailsTable?.columns.some((c) => c.name === 'summary_generated_at')) {
      await queryRunner.dropColumn('emails', 'summary_generated_at');
    }

    if (emailsTable?.columns.some((c) => c.name === 'summary')) {
      await queryRunner.dropColumn('emails', 'summary');
    }
  }
}
