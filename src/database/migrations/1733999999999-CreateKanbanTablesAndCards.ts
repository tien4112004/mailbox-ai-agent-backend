import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateKanbanTablesAndCards1702000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create kanban_columns table if it does not exist
    const existingKanbanColumns = await queryRunner.getTable('kanban_columns');
    if (!existingKanbanColumns) {
      await queryRunner.createTable(
        new Table({
          name: 'kanban_columns',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'name',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'order',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
            },
            {
              name: 'color',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'varchar',
              default: "'inbox'",
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'createdAt',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          indices: [
            {
              columnNames: ['user_id'],
              isUnique: false,
            },
          ],
        }),
        true,
      );
    }

    // Add foreign key for kanban_columns to users if missing
    const kanbanColumnsTableAfter = await queryRunner.getTable('kanban_columns');
    const hasUserFk = kanbanColumnsTableAfter?.foreignKeys.some((fk) => fk.columnNames.includes('user_id'));
    if (!hasUserFk) {
      await queryRunner.createForeignKey(
        'kanban_columns',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create kanban_cards table if it does not exist
    const existingKanbanCards = await queryRunner.getTable('kanban_cards');
    if (!existingKanbanCards) {
      await queryRunner.createTable(
        new Table({
          name: 'kanban_cards',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'emailId',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'columnId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'order',
              type: 'int',
              default: 0,
            },
            {
              name: 'notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          indices: [
            {
              columnNames: ['emailId'],
              isUnique: false,
            },
            {
              columnNames: ['columnId'],
              isUnique: false,
            },
          ],
        }),
        true,
      );
    }

    // Add foreign key for kanban_cards to kanban_columns if missing
    const kanbanCardsTableAfter = await queryRunner.getTable('kanban_cards');
    const hasColumnFk = kanbanCardsTableAfter?.foreignKeys.some((fk) => fk.columnNames.includes('columnId'));
    if (!hasColumnFk) {
      await queryRunner.createForeignKey(
        'kanban_cards',
        new TableForeignKey({
          columnNames: ['columnId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'kanban_columns',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Note: Foreign key to emails table will be added in a later migration
    // after the emails table is created
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop kanban_cards table with foreign keys
    const kanbanCardsTable = await queryRunner.getTable('kanban_cards');
    if (kanbanCardsTable) {
      await queryRunner.dropForeignKeys('kanban_cards', kanbanCardsTable.foreignKeys);
      await queryRunner.dropTable('kanban_cards');
    }

    // Drop kanban_columns table with foreign keys
    const kanbanColumnsTable = await queryRunner.getTable('kanban_columns');
    if (kanbanColumnsTable) {
      await queryRunner.dropForeignKeys('kanban_columns', kanbanColumnsTable.foreignKeys);
      await queryRunner.dropTable('kanban_columns');
    }
  }
}
