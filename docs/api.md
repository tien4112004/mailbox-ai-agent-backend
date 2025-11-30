# Student API Documentation

## Overview
This is a NestJS-based Student Management API that provides comprehensive CRUD operations for managing students and user authentication.

## Features
- 🔐 JWT Authentication & Authorization
- 👥 User Management (Admin, Teacher, Student roles)
- 🎓 Student Management with full CRUD operations
- 📄 Comprehensive Swagger API Documentation
- 🗄️ PostgreSQL Database Integration with TypeORM
- 🔍 Advanced Search & Filtering
- 📊 Pagination Support
- 🛡️ Input Validation & Error Handling
- 🧪 Mock Data Seeding for Testing

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/seed-admin` - Seed admin user for testing

### Students
- `GET /api/students` - Get all students (with pagination & filters)
- `POST /api/students` - Create new student (requires auth)
- `GET /api/students/:id` - Get student by ID
- `PATCH /api/students/:id` - Update student (requires auth)
- `PATCH /api/students/:id/deactivate` - Deactivate student (requires auth)
- `DELETE /api/students/:id` - Delete student permanently (requires auth)
- `GET /api/students/seed-mock-data` - Seed mock student data (requires auth)

### Users
- `GET /api/users` - Get all users (requires auth)
- `POST /api/users` - Create new user (requires auth)
- `GET /api/users/:id` - Get user by ID (requires auth)
- `PATCH /api/users/:id` - Update user (requires auth)
- `DELETE /api/users/:id` - Delete user (requires auth)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your database settings
4. Run the application: `npm run start:dev`

### Testing the API
1. Start the application
2. Visit `http://localhost:3000/api/docs` for Swagger documentation
3. Seed admin user: `POST /api/auth/seed-admin`
4. Login with admin credentials: email: `admin@example.com`, password: `admin123`
5. Seed mock student data: `GET /api/students/seed-mock-data`

## Environment Variables
Check `.env.example` for all required environment variables.

## Database Schema
The API uses PostgreSQL with two main entities:
- **Users**: Authentication and user management
- **Students**: Student information and academic data

## Authentication
The API uses JWT tokens for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow a consistent format:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2024-01-15T10:00:00Z"
}
```
