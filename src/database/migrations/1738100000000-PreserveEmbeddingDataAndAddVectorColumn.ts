import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveEmbeddingDataAndAddVectorColumn1738100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure vector extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Inspect existing embedding column (if any)
    const colInfo: any = await queryRunner.query(
      `SELECT a.attname AS column_name, t.typname, a.atttypmod
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_type t ON a.atttypid = t.oid
       WHERE c.relname = 'emails' AND a.attname = 'embedding'`,
    );

    if (Array.isArray(colInfo) && colInfo.length > 0) {
      const row = colInfo[0];
      const typname = row.typname;
      const atttypmod = Number(row.atttypmod ?? 0);

      // If column exists but is not a properly-dimensioned vector, rename it to preserve data
      if (!(typname === 'vector' && atttypmod > 0)) {
        // Find a safe name for the preserved column
        let preservedName = 'embedding_old';
        const exists = await queryRunner.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = '${preservedName}'`,
        );
        if (Array.isArray(exists) && exists.length > 0) {
          // Find a unique suffix
          let i = 1;
          while (true) {
            const candidate = `${preservedName}_${i}`;
            const r = await queryRunner.query(
              `SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = '${candidate}'`,
            );
            if (!Array.isArray(r) || r.length === 0) {
              preservedName = candidate;
              break;
            }
            i += 1;
          }
        }

        await queryRunner.query(`ALTER TABLE emails RENAME COLUMN embedding TO "${preservedName}"`);
      }
    }

    // Add the new embedding vector column (empty) and create an index
    await queryRunner.query(`ALTER TABLE emails ADD COLUMN IF NOT EXISTS embedding vector(1536)`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS emails_embedding_ivfflat_idx ON emails USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the ivfflat index and the new embedding column, then restore the preserved column if present
    await queryRunner.query(`DROP INDEX IF EXISTS emails_embedding_ivfflat_idx`);

    // Find any preserved embedding_old column (choose the one with highest suffix if multiple)
    const preservedCols: any = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'emails' AND column_name ~ '^embedding_old(_[0-9]+)?$' ORDER BY column_name DESC`,
    );

    // Drop the new embedding column
    await queryRunner.query(`ALTER TABLE emails DROP COLUMN IF EXISTS embedding`);

    if (Array.isArray(preservedCols) && preservedCols.length > 0) {
      const toRestore = preservedCols[0].column_name;
      await queryRunner.query(`ALTER TABLE emails RENAME COLUMN "${toRestore}" TO embedding`);
    }
  }
}
