# API Quick Reference

Base URL (local): `http://localhost:3000/api`

## Authentication

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePass123"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "user" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Get Gmail OAuth URL
```http
GET /auth/google/gmail-url

Response:
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Gmail OAuth Callback
```http
POST /auth/google/gmail-callback
Content-Type: application/json

{
  "code": "4/0AeaYSHBx..."
}

Response:
{
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}

Response:
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Get Profile
```http
GET /auth/profile
Authorization: Bearer {accessToken}

Response:
{
  "id": "...",
  "email": "...",
  "name": "...",
  "role": "user",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {accessToken}

Response:
{
  "message": "Logged out successfully"
}
```

---

## Emails

All endpoints require: `Authorization: Bearer {accessToken}`

### Get Mailboxes
```http
GET /emails/mailboxes

Response:
[
  {
    "id": "INBOX",
    "name": "INBOX",
    "messagesTotal": 150,
    "messagesUnread": 23,
    "type": "system"
  },
  {
    "id": "SENT",
    "name": "SENT",
    "messagesTotal": 89,
    "messagesUnread": 0,
    "type": "system"
  }
]
```

### List Emails
```http
GET /emails/list?folder=INBOX&page=1&limit=20&search=important

Query Parameters:
- folder (optional): Gmail label ID, default: INBOX
- page (optional): Page number, default: 1
- limit (optional): Items per page, default: 20
- search (optional): Gmail search query

Response:
{
  "emails": [
    {
      "id": "18c5f2a3b9d4e7f8",
      "threadId": "18c5f2a3b9d4e7f8",
      "subject": "Important Meeting",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "to": ["you@gmail.com"],
      "cc": [],
      "bcc": [],
      "date": "2025-11-30T10:30:00Z",
      "snippet": "Let's discuss the project...",
      "read": false,
      "starred": true,
      "labelIds": ["INBOX", "IMPORTANT"],
      "attachments": []
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "nextPageToken": "..."
  }
}
```

### Get Email Detail
```http
GET /emails/{emailId}

Response:
{
  "id": "18c5f2a3b9d4e7f8",
  "threadId": "18c5f2a3b9d4e7f8",
  "subject": "Important Meeting",
  "from": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "to": ["you@gmail.com"],
  "cc": ["team@example.com"],
  "bcc": [],
  "date": "2025-11-30T10:30:00Z",
  "snippet": "Let's discuss the project updates...",
  "body": "<html><body><p>Full HTML content...</p></body></html>",
  "htmlBody": "<html>...</html>",
  "textBody": "Plain text version...",
  "read": true,
  "starred": false,
  "labelIds": ["INBOX", "IMPORTANT"],
  "attachments": [
    {
      "id": "ANGjdJ8wYz...",
      "filename": "proposal.pdf",
      "mimeType": "application/pdf",
      "size": 245678
    }
  ],
  "internalDate": "1701342600000"
}
```

### Send Email
```http
POST /emails/send
Content-Type: application/json

{
  "to": ["recipient@example.com"],
  "subject": "Project Update",
  "body": "<p>Here's the latest update...</p>",
  "cc": ["team@example.com"],
  "bcc": ["archive@example.com"]
}

Response:
{
  "message": "Email sent successfully",
  "messageId": "18c5f2a3b9d4e7f8",
  "threadId": "18c5f2a3b9d4e7f8"
}
```

### Reply to Email
```http
POST /emails/{emailId}/reply
Content-Type: application/json

{
  "body": "<p>Thanks for your message. I'll review this...</p>",
  "cc": ["additional@example.com"],
  "replyAll": false
}

Response:
{
  "message": "Reply sent successfully",
  "messageId": "18c5f3a4b0d5e8f9",
  "threadId": "18c5f2a3b9d4e7f8"
}
```

### Modify Email
```http
POST /emails/{emailId}/modify
Content-Type: application/json

# Mark as read and starred
{
  "read": true,
  "starred": true
}

# Move to trash
{
  "trash": true
}

# Add/remove labels
{
  "addLabels": ["IMPORTANT"],
  "removeLabels": ["SPAM"]
}

Response:
{
  "message": "Email modified successfully"
}
```

### Delete Email
```http
POST /emails/{emailId}/delete

Response:
{
  "message": "Email deleted permanently"
}
```

### Download Attachment
```http
GET /emails/{messageId}/attachments/{attachmentId}

Response: Binary file data
Content-Type: application/octet-stream
```

### Legacy Endpoints (Backward Compatibility)

```http
# Get emails by folder
GET /emails/mailboxes/{folderId}/emails?page=1&limit=20

# Mark as read
POST /emails/{emailId}/read

# Toggle star
POST /emails/{emailId}/star
```

---

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid input data",
  "errors": [
    {
      "field": "email",
      "error_code": "INVALID_EMAIL",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Invalid credentials"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Email not found"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```

---

## Gmail Search Query Syntax

Use in `search` parameter of `/emails/list`:

- `from:john@example.com` - Emails from specific sender
- `to:me` - Emails to you
- `subject:meeting` - Subject contains "meeting"
- `has:attachment` - Emails with attachments
- `is:unread` - Unread emails
- `is:starred` - Starred emails
- `is:important` - Important emails
- `in:inbox` - Emails in inbox
- `after:2025/11/01` - Emails after date
- `before:2025/12/01` - Emails before date
- `newer_than:7d` - Emails from last 7 days
- `older_than:1m` - Emails older than 1 month
- `label:work` - Emails with "work" label
- Combine: `from:john is:unread has:attachment`

---

## Testing with cURL

### Complete OAuth Flow

```bash
# 1. Get OAuth URL
curl http://localhost:3000/api/auth/google/gmail-url

# 2. Visit the URL in browser, authorize, copy the code from redirect

# 3. Exchange code for tokens
curl -X POST http://localhost:3000/api/auth/google/gmail-callback \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_AUTH_CODE_HERE"}'

# Save the accessToken from response

# 4. List emails
curl http://localhost:3000/api/emails/list \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 5. Get email detail
curl http://localhost:3000/api/emails/EMAIL_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 6. Send email
curl -X POST http://localhost:3000/api/emails/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["recipient@example.com"],
    "subject": "Test Email",
    "body": "<p>This is a test</p>"
  }'
```

---

## Postman Collection

Import this JSON to Postman for testing:

```json
{
  "info": {
    "name": "Gmail Email Client API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "accessToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Get Gmail OAuth URL",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/auth/google/gmail-url"
          }
        },
        {
          "name": "Gmail OAuth Callback",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/google/gmail-callback",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\"code\": \"YOUR_CODE_HERE\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Emails",
      "item": [
        {
          "name": "Get Mailboxes",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/emails/mailboxes",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}]
          }
        },
        {
          "name": "List Emails",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/emails/list?folder=INBOX&limit=20",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}]
          }
        }
      ]
    }
  ]
}
```

---

## Rate Limits

Gmail API has the following rate limits:

- **250 quota units per user per second**
- **1 billion quota units per day**

Common operations:
- List messages: 5 units
- Get message: 5 units
- Send message: 100 units
- Modify message: 5 units

The backend automatically handles rate limit errors and retries when appropriate.

---

## Interactive Documentation

Visit `http://localhost:3000/docs` for interactive Swagger UI where you can:
- View all endpoints
- Test endpoints directly
- See request/response schemas
- Authenticate and store tokens
