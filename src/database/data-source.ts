import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [
    join(__dirname, 'entities', '*.entity.{ts,js}'),
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: Number(process.env.DATABASE_MAX_CONNECTIONS),
    ssl: process.env.DATABASE_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
      ca: process.env.DATABASE_CA,
      key: process.env.DATABASE_KEY,
      cert: process.env.DATABASE_CERT,
    } : false,
  },
});
