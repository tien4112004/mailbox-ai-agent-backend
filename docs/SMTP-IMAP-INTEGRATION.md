# SMTP/IMAP Integration Guide

This guide explains how to use the new SMTP/IMAP functionality alongside the existing Google Gmail API integration.

## Overview

The backend now supports two email provider types:
1. **Gmail** - Uses Google's Gmail API (OAuth2)
2. **SMTP/IMAP** - Uses standard SMTP and IMAP protocols for any email provider

## Architecture

### Provider Pattern
The system uses an adapter pattern to abstract email operations:
- `EmailProvider` interface - Common interface for all providers
- `GmailProviderAdapter` - Gmail API implementation
- `SmtpProviderAdapter` - SMTP/IMAP implementation
- `EmailProviderFactory` - Creates the appropriate provider based on user configuration

### Key Components

#### Services
- `ImapService` - Handles reading emails via IMAP protocol
- `SmtpService` - Handles sending emails via SMTP protocol
- `SmtpConfigService` - Manages SMTP/IMAP configurations
- `EmailProviderFactory` - Factory for creating email providers
- `EmailsService` - Main service that uses providers transparently

#### Entities
- `SmtpConfig` - Stores SMTP/IMAP server configurations per user
- `User` - Extended with `emailProvider` field ('gmail' or 'smtp')

## API Endpoints

### SMTP Configuration Management

#### Create SMTP Configuration
```http
POST /emails/smtp-config
Authorization: Bearer {token}
Content-Type: application/json

{
  "emailAddress": "user@example.com",
  "displayName": "John Doe",
  "imapHost": "imap.example.com",
  "imapPort": 993,
  "imapSecure": true,
  "imapUsername": "user@example.com",
  "imapPassword": "your-password",
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUsername": "user@example.com",
  "smtpPassword": "your-password",
  "isDefault": true
}
```

#### Get All SMTP Configurations
```http
GET /emails/smtp-config
Authorization: Bearer {token}
```

#### Get SMTP Configuration by ID
```http
GET /emails/smtp-config/{configId}
Authorization: Bearer {token}
```

#### Update SMTP Configuration
```http
PUT /emails/smtp-config/{configId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "Updated Name",
  "isActive": true
}
```

#### Delete SMTP Configuration
```http
DELETE /emails/smtp-config/{configId}
Authorization: Bearer {token}
```

#### Test SMTP Configuration
```http
POST /emails/smtp-config/{configId}/test
Authorization: Bearer {token}
```

#### Set Default Configuration
```http
POST /emails/smtp-config/{configId}/set-default
Authorization: Bearer {token}
```

## Common Email Provider Settings

### Gmail
```json
{
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapSecure": true,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false
}
```

### Outlook/Hotmail
```json
{
  "imapHost": "outlook.office365.com",
  "imapPort": 993,
  "imapSecure": true,
  "smtpHost": "smtp-mail.outlook.com",
  "smtpPort": 587,
  "smtpSecure": false
}
```

### Yahoo Mail
```json
{
  "imapHost": "imap.mail.yahoo.com",
  "imapPort": 993,
  "imapSecure": true,
  "smtpHost": "smtp.mail.yahoo.com",
  "smtpPort": 587,
  "smtpSecure": false
}
```

### Custom SMTP/IMAP Server
```json
{
  "imapHost": "mail.yourdomain.com",
  "imapPort": 993,
  "imapSecure": true,
  "smtpHost": "mail.yourdomain.com",
  "smtpPort": 587,
  "smtpSecure": false
}
```

## How It Works

### Provider Selection
The system automatically selects the appropriate provider based on the user's configuration:

1. When a user makes an email request, `EmailsService` calls `EmailProviderFactory.createProvider(userId)`
2. The factory checks the user's `emailProvider` field:
   - If `'smtp'`: Creates `SmtpProviderAdapter` with the user's active SMTP configuration
   - If `'gmail'`: Creates `GmailProviderAdapter` with the user's Gmail tokens
3. All subsequent email operations use the selected provider transparently

### Switching Between Providers

Users can switch between Gmail and SMTP by:
1. Setting an SMTP configuration as default (automatically switches to SMTP)
2. Deleting all SMTP configurations or unsetting defaults (falls back to Gmail)

### Supported Operations

Both providers support the same operations:
- ✅ List mailboxes/folders
- ✅ List emails with pagination
- ✅ Get email by ID
- ✅ Send email
- ✅ Reply to email
- ✅ Mark as read/unread
- ✅ Star/unstar
- ✅ Move to trash
- ✅ Delete permanently
- ✅ Get attachments
- ✅ Search emails

## Database Migration

Run the migration to create the SMTP configuration table:

```bash
npm run migration:run
```

The migration creates:
- `smtp_configs` table
- `email_provider` column in `users` table
- Necessary indexes and foreign keys

## Security Considerations

1. **Password Storage**: SMTP/IMAP passwords are stored in the database. Consider encrypting them in production.
2. **TLS/SSL**: Always use secure connections (TLS) when possible.
3. **App Passwords**: For providers like Gmail, use app-specific passwords instead of account passwords.
4. **Token Expiry**: SMTP passwords don't expire like OAuth tokens, but should be rotated regularly.

## Limitations

### IMAP Limitations
- Email IDs are IMAP UIDs (may change if mailbox is reorganized)
- Label operations are mapped to IMAP flags (limited compatibility)
- Thread detection is based on message IDs (less reliable than Gmail's threading)

### SMTP Limitations
- No draft saving (SMTP is send-only)
- No sent items tracking (unless IMAP moves to Sent folder)
- Limited delivery confirmation

## Troubleshooting

### Connection Errors
- Verify server hostnames and ports
- Check if TLS/SSL settings are correct
- Ensure firewall allows IMAP (993) and SMTP (587/465) ports

### Authentication Errors
- Verify username and password
- For Gmail: Enable "Less secure app access" or use App Passwords
- For Outlook: Enable IMAP access in settings
- Check if 2FA requires app-specific passwords

### Email Not Found
- IMAP UIDs may change - use message IDs for reliable tracking
- Check if email is in the correct folder

## Example Usage

### Setting Up SMTP for a New User

1. User creates SMTP configuration:
```javascript
POST /emails/smtp-config
{
  "emailAddress": "user@company.com",
  "imapHost": "mail.company.com",
  "imapPort": 993,
  "imapSecure": true,
  "imapUsername": "user@company.com",
  "imapPassword": "app-password",
  "smtpHost": "mail.company.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUsername": "user@company.com",
  "smtpPassword": "app-password",
  "isDefault": true
}
```

2. All email operations now use SMTP/IMAP:
```javascript
GET /emails?folder=INBOX&limit=20
POST /emails/send
POST /emails/:id/reply
```

3. Switch back to Gmail:
```javascript
DELETE /emails/smtp-config/{configId}
// System automatically falls back to Gmail
```

## Future Enhancements

- [ ] Password encryption at rest
- [ ] Support for OAuth2 with SMTP providers
- [ ] Automatic provider detection from email address
- [ ] Bulk import of SMTP configurations
- [ ] Connection pooling for IMAP
- [ ] Draft support via IMAP
- [ ] Enhanced threading support
