import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmtpConfigTable1733900000000 implements MigrationInterface {
  name = 'CreateSmtpConfigTable1733900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_provider column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "email_provider" character varying NOT NULL DEFAULT 'gmail'
    `);

    // Create smtp_configs table
    await queryRunner.query(`
      CREATE TABLE "smtp_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "email_address" character varying NOT NULL,
        "display_name" character varying,
        "imap_host" character varying NOT NULL,
        "imap_port" integer NOT NULL DEFAULT 993,
        "imap_secure" boolean NOT NULL DEFAULT true,
        "imap_username" character varying NOT NULL,
        "imap_password" text NOT NULL,
        "smtp_host" character varying NOT NULL,
        "smtp_port" integer NOT NULL DEFAULT 587,
        "smtp_secure" boolean NOT NULL DEFAULT false,
        "smtp_username" character varying NOT NULL,
        "smtp_password" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_smtp_configs" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "smtp_configs"
      ADD CONSTRAINT "FK_smtp_configs_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // Create index on user_id
    await queryRunner.query(`
      CREATE INDEX "IDX_smtp_configs_user_id" ON "smtp_configs" ("user_id")
    `);

    // Create index on user_id and is_default
    await queryRunner.query(`
      CREATE INDEX "IDX_smtp_configs_user_default" ON "smtp_configs" ("user_id", "is_default")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_smtp_configs_user_default"`);
    await queryRunner.query(`DROP INDEX "IDX_smtp_configs_user_id"`);

    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "smtp_configs" DROP CONSTRAINT "FK_smtp_configs_user"`);

    // Drop smtp_configs table
    await queryRunner.query(`DROP TABLE "smtp_configs"`);

    // Drop email_provider column from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_provider"`);
  }
}
