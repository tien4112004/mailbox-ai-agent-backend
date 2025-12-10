import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSummaryColumnsToEmails1733840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'emails',
      new TableColumn({
        name: 'summary',
        type: 'text',
        isNullable: true,
        comment: 'AI-generated summary of the email content',
      }),
    );

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('emails', 'summary_generated_at');
    await queryRunner.dropColumn('emails', 'summary');
  }
}
