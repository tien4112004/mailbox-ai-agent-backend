import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgm1735689600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_email_subject_trgm 
       ON email USING GIN (subject gin_trgm_ops)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_email_from_trgm 
       ON email USING GIN ("from" gin_trgm_ops)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_email_body_trgm 
       ON email USING GIN (body gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_email_subject_trgm');
    await queryRunner.query('DROP INDEX IF EXISTS idx_email_from_trgm');
    await queryRunner.query('DROP INDEX IF EXISTS idx_email_body_trgm');
    await queryRunner.query('DROP EXTENSION IF EXISTS pg_trgm');
  }
}
