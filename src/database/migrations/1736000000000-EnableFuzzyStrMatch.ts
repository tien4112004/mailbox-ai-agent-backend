import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableFuzzyStrMatch1736000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // fuzzystrmatch provides levenshtein(text, text) for edit-distance matching
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS fuzzystrmatch');
  }
}
