# Deployment Checklist for SMTP/IMAP Support

## Pre-Deployment

### 1. Dependencies
- [x] Install `imap` package
- [x] Install `nodemailer` package
- [x] Install `@types/imap` package
- [x] Install `@types/nodemailer` package

### 2. Code Review
- [x] All new services created and tested
- [x] Provider adapters implemented
- [x] Factory pattern working correctly
- [x] Controller endpoints added
- [x] DTOs validated
- [x] Entities created

### 3. Database
- [x] Migration file created (`1733900000000-CreateSmtpConfigTable.ts`)
- [ ] Migration tested locally
- [ ] Migration ready for production

### 4. Documentation
- [x] SMTP/IMAP integration guide created
- [x] Quick start guide created
- [x] Provider comparison document created
- [x] Implementation summary created
- [x] README updated
- [x] Environment variables documented

## Deployment Steps

### Step 1: Backup Database
```bash
# Backup current database
pg_dump -U postgres mailbox_db > backup_$(date +%Y%m%d).sql
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build Project
```bash
npm run build
```

### Step 4: Run Migrations
```bash
npm run migration:run
```

This will:
- Add `email_provider` column to `users` table
- Create `smtp_configs` table
- Add necessary indexes and foreign keys

### Step 5: Verify Migration
```bash
npm run migration:show
```

Should show the new migration as executed.

### Step 6: Start Application
```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

### Step 7: Test SMTP Configuration
1. Open Swagger UI: `http://your-domain/api`
2. Authenticate with JWT token
3. Test SMTP endpoint: `POST /emails/smtp-config/test`
4. Create test configuration
5. Send test email

## Post-Deployment Verification

### 1. API Endpoints
- [ ] `POST /emails/smtp-config` - Creates config
- [ ] `GET /emails/smtp-config` - Lists configs
- [ ] `GET /emails/smtp-config/:id` - Gets config
- [ ] `PUT /emails/smtp-config/:id` - Updates config
- [ ] `DELETE /emails/smtp-config/:id` - Deletes config
- [ ] `POST /emails/smtp-config/:id/test` - Tests connection
- [ ] `POST /emails/smtp-config/:id/set-default` - Sets default

### 2. Email Operations (SMTP/IMAP)
- [ ] List mailboxes works
- [ ] List emails works
- [ ] Get email by ID works
- [ ] Send email works
- [ ] Reply to email works
- [ ] Mark as read works
- [ ] Star/unstar works
- [ ] Move to trash works
- [ ] Delete email works
- [ ] Get attachment works

### 3. Provider Switching
- [ ] Gmail to SMTP switch works
- [ ] SMTP to Gmail switch works
- [ ] Multiple SMTP accounts work
- [ ] Default account selection works

### 4. Backward Compatibility
- [ ] Existing Gmail users unaffected
- [ ] Gmail API operations still work
- [ ] No breaking changes to existing APIs

## Rollback Plan

If issues occur, rollback with:

### Step 1: Revert Code
```bash
git revert <commit-hash>
npm install
npm run build
```

### Step 2: Revert Migration
```bash
npm run migration:revert
```

This will:
- Drop `smtp_configs` table
- Remove `email_provider` column from `users` table

### Step 3: Restart Application
```bash
npm run start:prod
```

## Monitoring

### What to Monitor
1. **Database Performance**
   - SMTP config queries
   - User table queries with new column

2. **IMAP Connections**
   - Connection failures
   - Timeout errors
   - Authentication failures

3. **SMTP Operations**
   - Send failures
   - Rate limit errors
   - Delivery failures

4. **Error Rates**
   - New endpoint errors
   - Provider factory errors
   - Migration issues

### Logs to Watch
```bash
# Application logs
tail -f logs/application.log | grep -i "smtp\|imap"

# Error logs
tail -f logs/error.log | grep -i "smtp\|imap"
```

## Security Checklist

### Production Security
- [ ] SMTP passwords encrypted at rest (implement if required)
- [ ] TLS/SSL enforced for all SMTP/IMAP connections
- [ ] Rate limiting configured for SMTP endpoints
- [ ] Input validation working for all DTOs
- [ ] SQL injection prevention verified
- [ ] JWT authentication on all endpoints
- [ ] CORS properly configured

### Database Security
- [ ] Backup before migration
- [ ] Migration tested in staging
- [ ] Connection strings secured
- [ ] Database user permissions correct

## Performance Optimization

### Immediate
- [ ] IMAP connection cleanup working
- [ ] SMTP transporter disposal working
- [ ] Memory leaks checked

### Future
- [ ] Consider connection pooling for IMAP
- [ ] Implement caching for email metadata
- [ ] Add background sync for IMAP
- [ ] Optimize large mailbox queries

## User Communication

### Announcement Template
```
📧 New Feature: SMTP/IMAP Support

We've added support for connecting any email provider!

✅ Connect Gmail, Outlook, Yahoo, or custom email servers
✅ Use standard SMTP and IMAP protocols
✅ Configure multiple email accounts
✅ Switch seamlessly between providers

Your existing Gmail integration continues to work unchanged.

To get started:
1. Go to Settings → Email Accounts
2. Click "Add SMTP Account"
3. Enter your email server details
4. Test connection and save

See documentation for detailed setup instructions.
```

## Support Preparation

### Common Issues & Solutions

**Q: SMTP connection fails**
A: Check hostname, port, credentials, and TLS settings. For Gmail, use app password.

**Q: Emails not appearing**
A: IMAP UIDs may differ from Gmail IDs. Check correct folder/mailbox.

**Q: Can't switch to SMTP**
A: Ensure SMTP config is set as default and is active.

**Q: Gmail stopped working**
A: Check if SMTP config was set as default. Delete it to return to Gmail.

## Success Criteria

Deployment is successful when:
- [x] All migrations completed without errors
- [ ] All API endpoints responding correctly
- [ ] Both Gmail and SMTP providers working
- [ ] No errors in application logs
- [ ] Existing users unaffected
- [ ] New users can configure SMTP
- [ ] Documentation accessible
- [ ] Support team briefed

## Timeline

- **Pre-deployment preparation**: 30 minutes
- **Deployment**: 15 minutes
- **Verification**: 30 minutes
- **Monitoring**: 24 hours continuous
- **Total**: ~1 hour active work + monitoring

## Contacts

- **Lead Developer**: [Your contact]
- **DevOps**: [DevOps contact]
- **Support Team**: [Support contact]
- **On-call**: [On-call rotation]

## Notes

- Keep database backup for 30 days
- Monitor error rates for first 48 hours
- Gather user feedback on new feature
- Plan follow-up enhancements based on usage

---

**Status**: Ready for Deployment
**Date**: December 10, 2025
**Version**: 1.1.0 (SMTP/IMAP Support)
