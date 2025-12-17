import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

// Parse DATABASE_URL if provided, otherwise use individual env vars
const dbUrl = process.env.DATABASE_URL;
let dbConfig: any = {
  type: 'postgres',
};

if (dbUrl) {
  // Parse connection string
  const url = new URL(dbUrl);
  dbConfig.host = url.hostname;
  dbConfig.port = Number(url.port) || 5432;
  dbConfig.username = url.username;
  dbConfig.password = url.password;
  dbConfig.database = url.pathname.slice(1);
} else {
  // Use individual env vars
  dbConfig.host = process.env.DATABASE_HOST;
  dbConfig.port = Number(process.env.DATABASE_PORT);
  dbConfig.username = process.env.DATABASE_USERNAME;
  dbConfig.password = process.env.DATABASE_PASSWORD;
  dbConfig.database = process.env.DATABASE_NAME;
}

dbConfig.entities = [
  join(__dirname, 'entities', '*.entity.{ts,js}'),
];
dbConfig.migrations = [join(__dirname, 'migrations', '*.{ts,js}')];
dbConfig.migrationsTableName = 'migrations';
dbConfig.synchronize = false;
dbConfig.logging = process.env.NODE_ENV === 'development';
dbConfig.extra = {
  max: Number(process.env.DATABASE_MAX_CONNECTIONS) || 10,
  ssl: process.env.DATABASE_SSL_ENABLED === 'true' || dbUrl?.includes('sslmode') ? {
    rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
    ca: process.env.DATABASE_CA,
    key: process.env.DATABASE_KEY,
    cert: process.env.DATABASE_CERT,
  } : false,
};

export default new DataSource(dbConfig);
