import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddEmailForeignKeyToKanbanCards1735773700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key from kanban_cards.emailId to emails.id
    await queryRunner.createForeignKey(
      'kanban_cards',
      new TableForeignKey({
        columnNames: ['emailId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'emails',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key
    const table = await queryRunner.getTable('kanban_cards');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('emailId') !== -1 && fk.referencedTableName === 'emails',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('kanban_cards', foreignKey);
    }
  }
}
