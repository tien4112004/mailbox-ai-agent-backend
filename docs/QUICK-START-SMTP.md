# Quick Start: Adding SMTP/IMAP Support

This guide shows how to quickly set up and test the new SMTP/IMAP functionality.

## Setup

### 1. Install Dependencies
Already done! The following packages are now installed:
- `imap` - IMAP client
- `nodemailer` - SMTP client  
- `@types/imap` - TypeScript types for IMAP
- `@types/nodemailer` - TypeScript types for Nodemailer

### 2. Run Database Migration
```bash
npm run migration:run
```

This creates:
- `smtp_configs` table for storing SMTP/IMAP configurations
- `email_provider` column in `users` table

### 3. Start the Server
```bash
npm run start:dev
```

## Testing SMTP/IMAP

### Method 1: Using Swagger UI

1. Navigate to `http://localhost:3000/api` (or your configured port)
2. Authorize with your JWT token
3. Use the new SMTP endpoints under the "emails" tag

### Method 2: Using cURL

#### Create SMTP Configuration
```bash
curl -X POST http://localhost:3000/emails/smtp-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailAddress": "your.email@gmail.com",
    "displayName": "Your Name",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapSecure": true,
    "imapUsername": "your.email@gmail.com",
    "imapPassword": "your-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUsername": "your.email@gmail.com",
    "smtpPassword": "your-app-password",
    "isDefault": true
  }'
```

#### Test Connection
```bash
curl -X POST http://localhost:3000/emails/smtp-config/{configId}/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Emails (Now using SMTP/IMAP)
```bash
curl -X GET "http://localhost:3000/emails?folder=INBOX&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Send Email via SMTP
```bash
curl -X POST http://localhost:3000/emails/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["recipient@example.com"],
    "subject": "Test Email via SMTP",
    "body": "<p>This email was sent via SMTP!</p>"
  }'
```

## Setting Up Gmail App Password

Since Gmail requires app-specific passwords for IMAP/SMTP:

1. Go to Google Account: https://myaccount.google.com/
2. Select Security
3. Under "Signing in to Google," select "2-Step Verification"
4. At the bottom, select "App passwords"
5. Generate a new app password for "Mail"
6. Use this password in your SMTP configuration

## Architecture Overview

```
User Request
    ↓
EmailsController
    ↓
EmailsService
    ↓
EmailProviderFactory.createProvider(userId)
    ↓
    ├─→ GmailProviderAdapter (if user.emailProvider === 'gmail')
    │       ↓
    │   GmailService (Google API)
    │
    └─→ SmtpProviderAdapter (if user.emailProvider === 'smtp')
            ↓
        ├─→ ImapService (for reading emails)
        └─→ SmtpService (for sending emails)
```

## Key Features

### Automatic Provider Switching
- Setting SMTP config as default → switches to SMTP
- Deleting SMTP config → falls back to Gmail

### Unified API
All existing endpoints work with both providers:
- `/emails` - List emails
- `/emails/:id` - Get email details
- `/emails/send` - Send email
- `/emails/:id/reply` - Reply to email
- `/emails/:id/modify` - Modify email (star, read, etc.)
- `/emails/mailboxes` - List folders/labels

### Multiple SMTP Accounts
Users can configure multiple SMTP accounts and switch between them.

## Troubleshooting

### "Failed to verify SMTP connection"
- Check hostname and port
- Verify credentials
- For Gmail: Use app-specific password
- Check firewall settings

### "No active SMTP configuration found"
- Create a config with `isDefault: true`
- Or use `POST /emails/smtp-config/{configId}/set-default`

### Emails not appearing
- IMAP uses UIDs which may differ from Gmail IDs
- Check the correct folder/mailbox
- Some IMAP servers have different folder names (e.g., "Trash" vs "Deleted Items")

## Next Steps

1. Add password encryption for production
2. Implement automatic email address to provider mapping
3. Add connection pooling for better performance
4. Implement OAuth2 for SMTP providers that support it

## Development Notes

### Adding New Email Operations

To add a new email operation:

1. Add method to `EmailProvider` interface
2. Implement in `GmailProviderAdapter`
3. Implement in `SmtpProviderAdapter`
4. Use in `EmailsService` via the provider

Example:
```typescript
// 1. Interface
interface EmailProvider {
  archiveEmail(emailId: string): Promise<void>;
}

// 2. Gmail implementation
class GmailProviderAdapter {
  async archiveEmail(emailId: string) {
    return this.gmailService.archiveEmail(
      this.accessToken,
      this.refreshToken,
      emailId
    );
  }
}

// 3. SMTP implementation
class SmtpProviderAdapter {
  async archiveEmail(emailId: string) {
    return this.imapService.moveEmail(
      this.config.imap,
      emailId,
      'Archive'
    );
  }
}

// 4. Use in service
class EmailsService {
  async archiveEmail(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    await provider.archiveEmail(emailId);
    return { message: 'Email archived' };
  }
}
```

## Testing Checklist

- [ ] Create SMTP configuration
- [ ] Test SMTP connection
- [ ] List mailboxes via IMAP
- [ ] List emails via IMAP
- [ ] Get email details via IMAP
- [ ] Send email via SMTP
- [ ] Reply to email via SMTP
- [ ] Mark email as read via IMAP
- [ ] Star/unstar email via IMAP
- [ ] Move to trash via IMAP
- [ ] Get attachment via IMAP
- [ ] Search emails via IMAP
- [ ] Switch between Gmail and SMTP providers
- [ ] Multiple SMTP accounts

## Resources

- [IMAP Protocol Documentation](https://tools.ietf.org/html/rfc3501)
- [SMTP Protocol Documentation](https://tools.ietf.org/html/rfc5321)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Node IMAP Documentation](https://github.com/mscdex/node-imap)
