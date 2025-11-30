# Setup Guide

## Prerequisites
- Node.js 18.0.0 or higher
- PostgreSQL 12.0 or higher
- npm or yarn package manager

## Installation Steps

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd nestjs-student-api
npm install
```

### 2. Database Setup
1. Create a PostgreSQL database
2. Copy environment file:
```bash
cp .env.example .env
```
3. Update database configuration in `.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=student_db
```

### 3. JWT Configuration
Update JWT settings in `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

### 4. Start the Application

#### Development Mode
```bash
npm run start:dev
```

#### Production Mode
```bash
npm run build
npm run start:prod
```

### 5. Verify Installation
- API: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/health`

## Initial Data Setup

### 1. Seed Admin User
```bash
curl -X POST http://localhost:3000/api/auth/seed-admin
```
This creates an admin user with:
- Email: `admin@example.com`
- Password: `admin123`

### 2. Seed Mock Student Data
1. First, login to get a JWT token
2. Then call the seed endpoint:
```bash
curl -X GET http://localhost:3000/api/students/seed-mock-data \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Available Scripts
- `npm run start` - Start application
- `npm run start:dev` - Start in development mode (with hot reload)
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Docker Setup (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Troubleshooting

### Common Issues
1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **JWT Token Issues**
   - Check JWT_SECRET in `.env`
   - Verify token expiration time

3. **Port Already in Use**
   - Change PORT in `.env` file
   - Or stop the process using port 3000

### Environment Validation
The application validates all required environment variables on startup and will show specific error messages for missing configuration.
