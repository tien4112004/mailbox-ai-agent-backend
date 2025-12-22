import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database-config';

export default registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => {
    const config = databaseConfig();
    
    return {
      type: 'postgres',
      url: config.url,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // Disable TypeORM query logging by default to avoid leaking SQL/parameters.
  // Enable explicitly for debugging with DB_LOG_QUERIES=true
  logging: process.env.DB_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : false,
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      migrationsRun: false,
      synchronize: process.env.NODE_ENV === 'development',
      extra: {
        max: 100,
        ssl: config.sslEnabled ? {
          rejectUnauthorized: config.rejectUnauthorized,
          ca: config.ca,
          key: config.key,
          cert: config.cert,
        } : false,
      },
    };
  },
);
