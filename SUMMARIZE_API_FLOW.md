# Email Summarize API Flow

## Endpoint
```
POST /api/emails/:id/summary
```

## Request Format

```json
{
  "length": "medium|short|long",           // Optional, default: "medium"
  "tone": "formal|casual|professional",    // Optional, default: "formal"
  "customInstructions": "string",          // Optional, custom instructions
  "provider": "openai|gemini"              // Optional, override default provider
}
```

## Step-by-Step Flow

### 1. **Frontend Calls API**
```
POST /api/emails/44c66dc4-24c2-4892-a433-cf3689156cc6/summary
Body: {
  "length": "medium",
  "tone": "professional",
  "provider": "gemini"  // Optional
}
```

### 2. **Controller Receives Request**
📍 `emails.controller.ts` - `generateEmailSummary()`
```typescript
@Post(':id/summary')
async generateEmailSummary(
  @Request() req,
  @Param('id') emailId: string,
  @Body() dto: SummarizeEmailDto,
)
```
- Extracts user ID from JWT token
- Validates request body (SummarizeEmailDto)
- Calls `emailsService.generateEmailSummary()`

### 3. **Service Fetches Email**
📍 `emails.service.ts` - `generateEmailSummary()`
```typescript
const email = await this.getEmailById(userId, emailId);
```
**What happens:**
- Detects if ID is UUID (database) or Gmail ID
- **If UUID**: Queries PostgreSQL database
- **If Gmail ID**: Calls Gmail API
- Returns **normalized email format** with all fields

### 4. **Prepare Email Content**
```typescript
const emailContent = {
  subject: email.subject,
  from: email.from?.email,
  body: email.body,
  date: email.date,
};
```

### 5. **Summary Service Processes Request**
📍 `summary.service.ts` - `generateSummary()`
```typescript
const provider = this.providerFactory.getProvider(providerOverride);
const summary = await provider.generateSummary(emailContent, options);
```

**Provider Logic:**
- Uses requested provider (if specified)
- Falls back to default provider (OpenAI by default)
- If default not available, uses first available provider

### 6. **AI Provider Generates Summary**

#### **Option A: OpenAI** 🤖
📍 `openai.adapter.ts`
```
Email Content 
    ↓
OpenAI API (gpt-3.5-turbo or gpt-4)
    ↓
Generated Summary
```

**Prompt:**
- Considers email subject, sender, body
- Applies requested length (short/medium/long)
- Applies requested tone (formal/casual/professional)
- Includes any custom instructions

#### **Option B: Gemini** 🧠
📍 `gemini.adapter.ts`
```
Email Content 
    ↓
Google Gemini API (gemini-pro)
    ↓
Generated Summary
```

### 7. **Return Response**

**Success (HTTP 200):**
```json
{
  "id": "44c66dc4-24c2-4892-a433-cf3689156cc6",
  "subject": "[JIRA] Implement Mindmap Generation",
  "from": {
    "name": "Lý Trọng Tín",
    "email": "jira@phanttien.atlassian.net"
  },
  "summary": "Lý Trọng Tín updated the JIRA ticket DATN-318. The status changed from 'In Progress' to 'Code Review' and then to 'Merged To Main'. The ticket is now resolved as 'Done'.",
  "length": "medium",
  "tone": "professional",
  "provider": "gemini"
}
```

**Error (HTTP 500):**
```json
{
  "code": 500,
  "message": "Failed to generate summary: API key not configured",
  "error": "The server encountered an error while processing your request"
}
```

## Configuration Required

### Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...              # Required for OpenAI
OPENAI_MODEL=gpt-3.5-turbo         # Optional, defaults to gpt-3.5-turbo

# Gemini Configuration
GEMINI_API_KEY=AIza...             # Required for Gemini
GEMINI_MODEL=gemini-pro            # Optional, defaults to gemini-pro

# Default Provider
SUMMARY_PROVIDER=openai            # Optional, defaults to openai
```

## Performance Notes

⏱️ **Time Complexity:**
- Database email: ~50-100ms (DB query) + AI API time
- Gmail email: ~200-300ms (Gmail API) + AI API time
- AI generation: 1-5 seconds (depends on provider and email size)

**Total Expected Response Time:** 2-10 seconds

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Email doesn't exist | Check email ID is correct |
| 400 Bad Request | Invalid DTO | Check length/tone/provider enums |
| 500 No Provider | No API keys configured | Set OPENAI_API_KEY or GEMINI_API_KEY |
| 500 API Error | Provider API failed | Check API limits, quotas, or network |

## Key Points

✅ **Automatic Format Normalization** - Works with both DB and Gmail emails  
✅ **Provider Flexibility** - Switch between OpenAI and Gemini  
✅ **Customizable Output** - Control length, tone, and additional instructions  
✅ **Smart Fallback** - Uses first available provider if default unavailable  
✅ **Error Handling** - Comprehensive error messages with context  

## Example Requests

### Using Default Provider (OpenAI)
```bash
curl -X POST http://localhost:3000/api/emails/44c66dc4-24c2-4892-a433-cf3689156cc6/summary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "short",
    "tone": "casual"
  }'
```

### Using Specific Provider (Gemini)
```bash
curl -X POST http://localhost:3000/api/emails/44c66dc4-24c2-4892-a433-cf3689156cc6/summary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "medium",
    "tone": "professional",
    "provider": "gemini",
    "customInstructions": "Focus on action items only"
  }'
```

### Using Gmail Email ID
```bash
curl -X POST http://localhost:3000/api/emails/19b020a2331b14f4/summary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "long"
  }'
```
