# Deployment Guide

## Production Deployment

### Environment Configuration
1. Set production environment variables:
```env
NODE_ENV=production
DATABASE_HOST=your-production-db-host
DATABASE_PORT=5432
DATABASE_USERNAME=your-production-username
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=student_db_prod
JWT_SECRET=your-super-secure-production-jwt-secret
```

2. Disable Swagger in production:
```env
SWAGGER_ENABLED=false
```

### Docker Deployment

#### Build Docker Image
```bash
docker build -t student-api .
```

#### Run with Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=db
      - DATABASE_PORT=5432
      - DATABASE_USERNAME=postgres
      - DATABASE_PASSWORD=password
      - DATABASE_NAME=student_db
      - JWT_SECRET=production-jwt-secret
    depends_on:
      - db
  
  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=student_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Cloud Deployment Options

#### Heroku
1. Install Heroku CLI
2. Create app: `heroku create your-app-name`
3. Add PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
4. Set config vars:
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-jwt-secret
```
5. Deploy: `git push heroku main`

#### AWS (Docker on ECS)
1. Push image to ECR
2. Create ECS task definition
3. Configure RDS PostgreSQL instance
4. Set up Load Balancer
5. Deploy to ECS service

#### Railway
1. Connect GitHub repository
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy automatically on push

### Database Migration
For production deployments:
```bash
npm run typeorm migration:generate -- -n InitialMigration
npm run typeorm migration:run
```

### Health Monitoring
The API includes a health check endpoint at `/health` for monitoring and load balancer configuration.

### Security Considerations
1. Use strong JWT secrets
2. Enable HTTPS in production
3. Set up proper CORS configuration
4. Use environment variables for all secrets
5. Enable rate limiting
6. Set up proper database backups
7. Use connection pooling for database connections

### Performance Optimization
1. Enable gzip compression
2. Use caching for frequently accessed data
3. Optimize database queries
4. Set up database indexes
5. Use CDN for static assets
6. Monitor application performance
