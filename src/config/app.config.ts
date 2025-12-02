import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: '*',
    credentials: false,
  },
  swagger: {
    enabled:
      process.env.SWAGGER_ENABLED === 'true' ||
      process.env.NODE_ENV !== 'production',
    title: process.env.SWAGGER_TITLE || 'Student API',
    description:
      process.env.SWAGGER_DESCRIPTION || 'Student Management API Documentation',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    tag: process.env.SWAGGER_TAG || 'student-api',
  },
  stack: {
    url: process.env.STACK_URL || 'https://id.student360.asia',
    projectId: process.env.STACK_PROJECT_ID || '',
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY || '',
    publishableClientKey: process.env.STACK_SECRET_CLIENT_KEY || '',
    userInfoUrl:
      process.env.STACK_USER_INFO_URL ||
      'http://localhost:8102/api/v1/users/me',
    emailVerificationTemplate:
      process.env.STACK_EMAIL_VERIFICATION_TEMPLATE || 'email_verification',
    urlVerify:
      process.env.STACK_URL_VERIFY || 'http://localhost:3000/api/auth/verify',
    urlReset:
      process.env.STACK_URL_RESET || 'http://localhost:4000/auth/forgot',
  },
}));
