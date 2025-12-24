import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSnoozesTable1733752800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create snoozes table if it does not exist
    const existingSnoozes = await queryRunner.getTable('snoozes');
    if (!existingSnoozes) {
      await queryRunner.createTable(
        new Table({
          name: 'snoozes',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'email_id',
              type: 'varchar',
            },
            {
              name: 'gmail_message_id',
              type: 'varchar',
            },
            {
              name: 'user_id',
              type: 'uuid',
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['active', 'snoozed', 'cancelled', 'resumed'],
              default: `'snoozed'`,
            },
            {
              name: 'snooze_until',
              type: 'timestamptz',
            },
            {
              name: 'original_labels',
              type: 'simple-array',
              isNullable: true,
            },
            {
              name: 'original_folder',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'snooze_reason',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'is_recurring',
              type: 'boolean',
              default: false,
            },
            {
              name: 'recurrence_pattern',
              type: 'varchar',
              isNullable: true,
              comment: 'DAILY, WEEKLY, MONTHLY',
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'resumed_at',
              type: 'timestamptz',
              isNullable: true,
            },
            {
              name: 'cancelled_at',
              type: 'timestamptz',
              isNullable: true,
            },
          ],
          indices: [
            {
              name: 'IDX_snoozes_user_id',
              columnNames: ['user_id'],
            },
            {
              name: 'IDX_snoozes_status',
              columnNames: ['status'],
            },
            {
              name: 'IDX_snoozes_snooze_until',
              columnNames: ['snooze_until'],
            },
            {
              name: 'IDX_snoozes_user_status',
              columnNames: ['user_id', 'status'],
            },
          ],
        }),
        true,
      );
    }

    // Add foreign key constraint if missing
    const snoozesTableAfter = await queryRunner.getTable('snoozes');
    const hasUserFk = snoozesTableAfter?.foreignKeys.some((fk) => fk.columnNames.includes('user_id'));
    if (!hasUserFk) {
      await queryRunner.createForeignKey(
        'snoozes',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const snoozesTable = await queryRunner.getTable('snoozes');
    if (snoozesTable) {
      // drop foreign keys first
      await queryRunner.dropForeignKeys('snoozes', snoozesTable.foreignKeys);
      await queryRunner.dropTable('snoozes');
    }
  }
}
