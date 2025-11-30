import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGmailTokensToUser1732995600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'gmail_access_token',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'gmail_refresh_token',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'gmail_token_expiry',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'gmail_token_expiry');
    await queryRunner.dropColumn('users', 'gmail_refresh_token');
    await queryRunner.dropColumn('users', 'gmail_access_token');
  }
}
