# Gmail Email Client Backend

A production-ready NestJS backend for a Gmail email client with full OAuth2 integration and Gmail API support.

## 🚀 Features

- ✅ **Gmail API Integration**: Full Gmail access via OAuth2
- ✅ **Secure Authentication**: JWT-based auth + Google OAuth2
- ✅ **Complete Email Operations**: Read, send, reply, modify, delete
- ✅ **Attachment Support**: Download and handle email attachments
- ✅ **Automatic Token Refresh**: Server-side Gmail token management
- ✅ **RESTful API**: Clean, well-documented endpoints
- ✅ **TypeScript**: Full type safety throughout
- ✅ **Database**: PostgreSQL with TypeORM
- ✅ **Swagger Documentation**: Interactive API docs at `/docs`

## 📚 Documentation

- **[Setup Guide](docs/setup-guide.md)** - Complete setup instructions, Google Cloud configuration, deployment
- **[API Reference](docs/api-reference.md)** - Quick API endpoint reference and examples
- **[Implementation Summary](docs/implementation-summary.md)** - Detailed implementation overview and architecture

## Technologies Used

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeORM](https://typeorm.io/) - TypeScript ORM
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Google APIs](https://github.com/googleapis/google-api-nodejs-client) - Gmail API integration
- [Passport.js](http://www.passportjs.org/) - Authentication
- [Docker](https://www.docker.com/) - Containerization
- [Swagger](https://swagger.io/) - API documentation

## Getting Started

### Prerequisites

- Node.js v18+
- Docker & Docker Compose
- Google Cloud account (for Gmail API credentials)

### Quick Start

1. **Clone the repository**
   ```sh
   git clone https://github.com/tien4112004/mailbox-ai-agent-backend.git
   cd mailbox-ai-agent-backend
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Setup environment variables**
   ```sh
   cp .env.example .env
   # Edit .env with your credentials (see Setup Guide for details)
   ```

4. **Start local database**
   ```sh
   docker compose -f docker-compose.local.yml up -d
   ```

5. **Run migrations**
   ```sh
   npm run migration:run
   ```

6. **Start development server**
   ```sh
   npm run start:dev
   ```

7. **Access the application**
   - API: `http://localhost:3000/api`
   - Swagger Docs: `http://localhost:3000/docs`

## 🔐 Google Cloud Setup

See the [Setup Guide](docs/setup-guide.md#google-cloud-setup) for detailed instructions on:
- Creating a Google Cloud project
- Enabling Gmail API
- Setting up OAuth2 credentials
- Configuring authorized redirect URIs

## 📖 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google/gmail-url` - Get Gmail OAuth URL
- `POST /api/auth/google/gmail-callback` - Handle Gmail OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Emails
- `GET /api/emails/mailboxes` - List all mailboxes/labels
- `GET /api/emails/list` - List emails with pagination & filters
- `GET /api/emails/:id` - Get email detail
- `POST /api/emails/send` - Send new email
- `POST /api/emails/:id/reply` - Reply to email
- `POST /api/emails/:id/modify` - Modify email (read, star, labels)
- `POST /api/emails/:id/delete` - Delete email permanently
- `GET /api/emails/:messageId/attachments/:attachmentId` - Download attachment

See [API Reference](docs/api-reference.md) for detailed examples.

## 🔒 Security

This implementation follows OAuth2 best practices:

- **Server-side token storage**: Gmail tokens never exposed to frontend
- **Automatic token refresh**: Backend handles expired tokens transparently
- **Hashed refresh tokens**: Tokens stored securely in database
- **Separation of concerns**: App auth separate from Gmail auth
- **HTTPS ready**: Helmet.js security headers configured
- **CORS protection**: Configurable allowed origins

See [Setup Guide - Security](docs/setup-guide.md#token-management--security) for details.

## 🧪 Testing

```sh
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Production Deployment

### Build
```sh
npm run build
npm run start:prod
```

### Docker
```sh
docker compose -f docker-compose.production.yml up -d --build
```

See [Setup Guide - Deployment](docs/setup-guide.md#deployment) for platform-specific instructions.

## 🛠️ Development

```sh
# Start with watch mode
npm run start:dev

# Lint code
npm run lint

# Format code
npm run format

# Generate migration
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create src/database/migrations/MigrationName

# Revert migration
npm run migration:revert
```

## 📁 Project Structure

```
src/
├── modules/
│   ├── auth/           # Authentication & OAuth2
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── emails/         # Email operations
│       ├── emails.controller.ts
│       ├── emails.service.ts
│       ├── gmail.service.ts    # Gmail API wrapper
│       └── dto/
├── database/
│   ├── entities/       # TypeORM entities
│   ├── migrations/     # Database migrations
│   └── config/
├── common/             # Filters, interceptors, guards
├── config/             # App configuration
└── utils/              # Helpers and utilities
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

- [NestJS Documentation](https://docs.nestjs.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth2 Guide](https://developers.google.com/identity/protocols/oauth2)

## 📞 Support

For questions or issues:
- Check the [Setup Guide](docs/setup-guide.md)
- Review [API Reference](docs/api-reference.md)
- Open an issue on GitHub
- Check Swagger docs at `/docs`

---

**Note**: This is an educational project demonstrating Gmail API integration with OAuth2. Never commit sensitive credentials to version control.
