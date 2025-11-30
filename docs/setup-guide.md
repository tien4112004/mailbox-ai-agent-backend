# Gmail Email Client Backend - Setup Guide

This document provides comprehensive setup instructions for the Gmail Email Client backend built with NestJS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Local Development Setup](#local-development-setup)
4. [Environment Variables](#environment-variables)
5. [API Endpoints](#api-endpoints)
6. [Token Management & Security](#token-management--security)
7. [Deployment](#deployment)
8. [Testing](#testing)

---

## Prerequisites

- **Node.js**: v18+ 
- **Docker & Docker Compose**: For local PostgreSQL database
- **Google Cloud Account**: For Gmail API credentials
- **npm** or **yarn**: Package manager

---

## Google Cloud Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" and give it a name (e.g., "Email Client")
3. Note the **Project ID**

### 2. Enable Gmail API

1. In your project, navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and press **Enable**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure OAuth consent screen if prompted:
   - **User Type**: External (for testing) or Internal (for organization)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add the following:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.labels`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
4. Create OAuth Client ID:
   - **Application type**: Web application
   - **Name**: Your backend app name
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/api/auth/google/gmail-callback` (for local dev)
     - `https://your-production-domain.com/api/auth/google/gmail-callback` (for production)
5. Save the **Client ID** and **Client Secret**

### 4. Add Test Users (Development Only)

If using External user type in development:

1. Go to **OAuth consent screen**
2. Scroll to **Test users**
3. Add email addresses that will test your app

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/mailbox-ai-agent-backend.git
cd mailbox-ai-agent-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) section).

### 4. Start Local Database

```bash
docker compose -f docker-compose.local.yml up -d
```

This starts a PostgreSQL database on `localhost:5432`.

### 5. Run Database Migrations

```bash
npm run migration:run
```

### 6. Start Development Server

```bash
npm run start:dev
```

The API will be available at: `http://localhost:3000/api`

Swagger documentation: `http://localhost:3000/docs`

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mailbox_db
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false

# JWT Configuration (for app authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRATION=7d

# Google OAuth & Gmail API
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/gmail-callback

# Application
PORT=3000
NODE_ENV=development
API_PREFIX=api
HOST=0.0.0.0

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Swagger
SWAGGER_ENABLED=true
SWAGGER_TITLE=Gmail Email Client API
SWAGGER_DESCRIPTION=Gmail Email Client API Documentation
SWAGGER_VERSION=1.0.0
SWAGGER_TAG=email-client-api
```

### Security Notes

- **Never commit** `.env` file to version control
- Use strong, random secrets for JWT keys in production
- Rotate secrets periodically
- Use environment-specific files (`.env.production`, `.env.staging`)

---

## API Endpoints

### Authentication Endpoints

#### 1. **Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "Password123"
}
```

#### 2. **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### 3. **Get Gmail OAuth URL**
```http
GET /api/auth/google/gmail-url

Response:
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Frontend flow:**
1. Call this endpoint to get OAuth URL
2. Redirect user to the URL
3. User authorizes Gmail access
4. Google redirects back with authorization code
5. Frontend sends code to callback endpoint

#### 4. **Gmail OAuth Callback**
```http
POST /api/auth/google/gmail-callback
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "role": "user"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### 5. **Refresh Token**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### 6. **Get Profile**
```http
GET /api/auth/profile
Authorization: Bearer {accessToken}
```

#### 7. **Logout**
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

---

### Email Endpoints

All email endpoints require JWT authentication (`Authorization: Bearer {accessToken}`).

#### 1. **Get Mailboxes (Gmail Labels)**
```http
GET /api/emails/mailboxes
Authorization: Bearer {accessToken}

Response:
[
  {
    "id": "INBOX",
    "name": "INBOX",
    "messagesTotal": 150,
    "messagesUnread": 23,
    "type": "system"
  },
  ...
]
```

#### 2. **List Emails**
```http
GET /api/emails/list?folder=INBOX&page=1&limit=20&search=meeting
Authorization: Bearer {accessToken}

Query Parameters:
- folder (optional): Gmail label ID (default: INBOX)
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 20)
- search (optional): Search query

Response:
{
  "emails": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "nextPageToken": "..."
  }
}
```

#### 3. **Get Email Detail**
```http
GET /api/emails/{emailId}
Authorization: Bearer {accessToken}

Response:
{
  "id": "message_id",
  "threadId": "thread_id",
  "subject": "Meeting Tomorrow",
  "from": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "to": ["recipient@example.com"],
  "cc": [],
  "bcc": [],
  "date": "2025-11-30T10:00:00Z",
  "snippet": "Preview text...",
  "body": "<html>...</html>",
  "htmlBody": "<html>...</html>",
  "textBody": "Plain text...",
  "read": false,
  "starred": false,
  "labelIds": ["INBOX", "IMPORTANT"],
  "attachments": [
    {
      "id": "attachment_id",
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 12345
    }
  ]
}
```

#### 4. **Send Email**
```http
POST /api/emails/send
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "to": ["recipient@example.com"],
  "subject": "Hello",
  "body": "<p>Email content in HTML</p>",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}

Response:
{
  "message": "Email sent successfully",
  "messageId": "sent_message_id",
  "threadId": "thread_id"
}
```

#### 5. **Reply to Email**
```http
POST /api/emails/{emailId}/reply
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "body": "<p>Reply content</p>",
  "cc": ["cc@example.com"],
  "replyAll": false
}

Response:
{
  "message": "Reply sent successfully",
  "messageId": "reply_message_id",
  "threadId": "thread_id"
}
```

#### 6. **Modify Email**
```http
POST /api/emails/{emailId}/modify
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "read": true,
  "starred": true,
  "trash": false,
  "addLabels": ["IMPORTANT"],
  "removeLabels": ["SPAM"]
}

Response:
{
  "message": "Email modified successfully"
}
```

#### 7. **Delete Email Permanently**
```http
POST /api/emails/{emailId}/delete
Authorization: Bearer {accessToken}

Response:
{
  "message": "Email deleted permanently"
}
```

#### 8. **Download Attachment**
```http
GET /api/emails/{messageId}/attachments/{attachmentId}
Authorization: Bearer {accessToken}

Response: Binary file data
```

---

## Token Management & Security

### Architecture

This implementation follows secure OAuth2 best practices:

1. **App Tokens (JWT)**:
   - **Access Token**: Short-lived (15 minutes), stored in memory on frontend
   - **Refresh Token**: Long-lived (7 days), stored securely server-side
   - Used for authenticating requests to our backend API

2. **Gmail Tokens**:
   - **Gmail Access Token**: Short-lived (1 hour), stored encrypted in database
   - **Gmail Refresh Token**: Long-lived, stored encrypted in database
   - Backend automatically refreshes Gmail tokens when expired
   - Frontend never sees Gmail tokens

### Token Flow

```
Frontend                Backend                    Google
   |                       |                          |
   |-- Get OAuth URL ----->|                          |
   |<--- OAuth URL --------|                          |
   |                       |                          |
   |-- Redirect to ------->|----------------------->  |
   |                       |                          |
   |<-- Code ------------- |<----- Redirect ---------|
   |                       |                          |
   |-- Send Code --------->|                          |
   |                       |-- Exchange Code -------->|
   |                       |<-- Gmail Tokens ---------|
   |                       |                          |
   |                       | (Store Gmail tokens      |
   |                       |  in database)            |
   |                       |                          |
   |<-- App Tokens --------|                          |
   |                       |                          |
```

### Token Storage

**Server-side (Database)**:
- Gmail access token (encrypted)
- Gmail refresh token (encrypted)
- Gmail token expiry timestamp
- User refresh token (hashed)

**Client-side**:
- App access token (in memory only)
- App refresh token (localStorage or httpOnly cookie - configurable)

### Automatic Token Refresh

The backend automatically handles Gmail token refresh:

```typescript
// In AuthService.getGmailTokens()
// Checks if token expires within 5 minutes
// Automatically refreshes if needed
// Returns fresh tokens to email service
```

### Security Considerations

1. **Gmail tokens never exposed to frontend**: All Gmail API calls proxied through backend
2. **App tokens are separate from Gmail tokens**: Compromised app token doesn't expose Gmail
3. **Refresh tokens are hashed**: Even if database is compromised, tokens can't be reused
4. **Token expiry enforced**: Automatic cleanup of expired sessions
5. **HTTPS required in production**: Prevents token interception
6. **CORS configured**: Only allows requests from trusted origins

---

## Deployment

### Environment-Specific Configuration

Create separate `.env` files for each environment:

- `.env.development`
- `.env.staging`  
- `.env.production`

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (32+ characters, random)
- [ ] Enable database SSL (`DATABASE_SSL_ENABLED=true`)
- [ ] Update `GOOGLE_REDIRECT_URI` to production URL
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set appropriate database connection limits
- [ ] Enable HTTPS on your server
- [ ] Configure proper logging and monitoring
- [ ] Set up database backups
- [ ] Add rate limiting middleware

### Deployment Platforms

#### Recommended Platforms:
- **Heroku**: Easy deployment, good for prototypes
- **Render**: Modern alternative to Heroku
- **Railway**: Developer-friendly with great DX
- **Google Cloud Run**: Serverless, auto-scaling
- **AWS Elastic Beanstalk**: Enterprise-ready
- **DigitalOcean App Platform**: Simple and cost-effective

### Example: Deploy to Render

1. Create account at [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment**: Add all environment variables
5. Create **PostgreSQL** database service
6. Update `DATABASE_HOST` to Render database URL
7. Deploy!

---

## Testing

### Manual Testing

1. **Test Gmail OAuth Flow**:
   ```bash
   # Get OAuth URL
   curl http://localhost:3000/api/auth/google/gmail-url
   
   # Visit URL in browser, authorize, get code
   # Exchange code for tokens
   curl -X POST http://localhost:3000/api/auth/google/gmail-callback \
     -H "Content-Type: application/json" \
     -d '{"code": "your_authorization_code"}'
   ```

2. **Test Email Listing**:
   ```bash
   curl http://localhost:3000/api/emails/list \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

3. **Test Token Expiry**:
   - Set `JWT_EXPIRATION=30s` in `.env`
   - Login and wait 30 seconds
   - Try API call - should get 401
   - Use refresh endpoint
   - Retry API call - should work

### Automated Testing

Run unit tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### "Invalid Google token" error
- **Cause**: Authorization code already used or expired
- **Solution**: Get a new authorization code (codes expire after first use)

#### "Gmail not connected" error  
- **Cause**: User hasn't completed Gmail OAuth flow
- **Solution**: Direct user to complete Gmail authorization

#### "Failed to refresh Gmail token" error
- **Cause**: Refresh token revoked or expired
- **Solution**: User must re-authorize Gmail access

#### Database connection errors
- **Cause**: PostgreSQL not running or wrong credentials
- **Solution**: Check Docker container running, verify DATABASE_* env vars

---

## API Documentation

Interactive API documentation is available at `/docs` when running the server:

**Local**: http://localhost:3000/docs

Try out all endpoints with the built-in Swagger UI!

---

## License

MIT

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review Swagger API docs at `/docs`
