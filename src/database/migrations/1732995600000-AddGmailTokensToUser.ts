import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGmailTokensToUser1732995600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add gmail token columns if they do not already exist (idempotent)
    const usersTable = await queryRunner.getTable('users');
    const hasAccess = usersTable?.columns.some((c) => c.name === 'gmail_access_token');
    const hasRefresh = usersTable?.columns.some((c) => c.name === 'gmail_refresh_token');
    const hasExpiry = usersTable?.columns.some((c) => c.name === 'gmail_token_expiry');

    if (!hasAccess) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'gmail_access_token',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    if (!hasRefresh) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'gmail_refresh_token',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    if (!hasExpiry) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'gmail_token_expiry',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns only if they exist
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.columns.some((c) => c.name === 'gmail_token_expiry')) {
      await queryRunner.dropColumn('users', 'gmail_token_expiry');
    }

    if (usersTable?.columns.some((c) => c.name === 'gmail_refresh_token')) {
      await queryRunner.dropColumn('users', 'gmail_refresh_token');
    }

    if (usersTable?.columns.some((c) => c.name === 'gmail_access_token')) {
      await queryRunner.dropColumn('users', 'gmail_access_token');
    }
  }
}
