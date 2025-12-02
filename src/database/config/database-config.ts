import { IsString, ValidateIf } from 'class-validator';
import { IsOptional } from 'class-validator';
import { IsBoolean } from 'class-validator';

import { registerAs } from '@nestjs/config';
import validateConfig from '@/utils/validations/validate-config';


class DatabaseConfig {
    @IsString()
    DATABASE_URL: string;

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
        sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
        rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
        ca: process.env.DATABASE_CA,
        key: process.env.DATABASE_KEY,
        cert: process.env.DATABASE_CERT,
    };
});
