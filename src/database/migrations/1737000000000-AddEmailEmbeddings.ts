import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailEmbeddings1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgvector provides a vector column type for storing embeddings
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Add an embedding column with dimension 1536 (compatible with common embedding models)
    await queryRunner.query(
      "ALTER TABLE emails ADD COLUMN IF NOT EXISTS embedding vector(1536)",
    );

    // Create an ivfflat index to speed up approximate nearest neighbor searches
    // Note: lists can be tuned based on dataset size
    await queryRunner.query(
      "CREATE INDEX IF NOT EXISTS emails_embedding_ivfflat_idx ON emails USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS emails_embedding_ivfflat_idx');
    await queryRunner.query('ALTER TABLE emails DROP COLUMN IF EXISTS embedding');
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}
