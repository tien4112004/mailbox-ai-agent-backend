import { IsInt, IsString, Max, Min, ValidateIf } from 'class-validator';
import { IsOptional } from 'class-validator';
import { IsBoolean } from 'class-validator';

import { registerAs } from '@nestjs/config';
import validateConfig from '@/utils/validations/validate-config';


class DatabaseConfig {
    @ValidateIf((envValues) => !!envValues.DATABASE_URL)
    @IsString()
    DATABASE_URL: string;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsString()
    DATABASE_TYPE: string;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsString()
    DATABASE_HOST: string;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsInt()
    @Min(0)
    @Max(65535)
    DATABASE_PORT: number;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsString()
    DATABASE_PASSWORD: string;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsString()
    DATABASE_NAME: string;

    @ValidateIf((envValues) => !envValues.DATABASE_URL)
    @IsString()
    DATABASE_USERNAME: string;

    @IsInt()
    @IsOptional()
    DATABASE_MAX_CONNECTIONS: number;

    @IsBoolean()
    @IsOptional()
    DATABASE_SSL_ENABLED: boolean;

    @IsBoolean()
    @IsOptional()
    DATABASE_REJECT_UNAUTHORIZED: boolean;

    @IsString()
    @IsOptional()
    DATABASE_CA: string;

    @IsString()
    @IsOptional()
    DATABASE_KEY: string;

    @IsString()
    @IsOptional()
    DATABASE_CERT: string;
}

export default registerAs('database', () => {
    validateConfig(process.env, DatabaseConfig);

    return {
        url: process.env.DATABASE_URL,
        type: process.env.DATABASE_TYPE,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432,
        password: process.env.DATABASE_PASSWORD,
        name: process.env.DATABASE_NAME,
        username: process.env.DATABASE_USERNAME,
        maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? Number(process.env.DATABASE_MAX_CONNECTIONS) : 100,
        sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
        rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
        ca: process.env.DATABASE_CA,
        key: process.env.DATABASE_KEY,
        cert: process.env.DATABASE_CERT,
    };
});
