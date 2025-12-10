# Email Summarization API Documentation

## Overview

The Email Summarization API generates concise AI-powered summaries of emails using OpenAI GPT or Google Gemini APIs. It supports multiple summary lengths, tones, and AI providers.

## Base URL

```
/api/emails
```

## Authentication

All endpoints require authentication. Include the bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Generate Email Summary

Generate an AI-powered summary for a specific email.

**Endpoint:** `POST /:id/summary`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | UUID of the email |

**Request Body:**

```json
{
  "length": "medium",
  "tone": "formal",
  "provider": "openai",
  "customInstructions": "Focus on action items and deadlines"
}
```

**Request Parameters:**

| Field | Type | Options | Default | Description |
|-------|------|---------|---------|-------------|
| length | string | short, medium, long | medium | Summary length |
| tone | string | formal, casual, technical | formal | Summary tone/style |
| provider | string | openai, gemini | (default) | AI provider override |
| customInstructions | string | Any text | null | Additional instructions for AI |

**Available Summary Lengths:**

- **short** - 1-2 sentences, key points only
- **medium** - 2-3 sentences, balanced detail
- **long** - 4-5 sentences, comprehensive summary

**Available Tones:**

- **formal** - Professional business tone
- **casual** - Friendly, conversational tone
- **technical** - Technical jargon, detailed explanation

**Example Request:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "medium",
    "tone": "formal",
    "provider": "openai"
  }' \
  http://localhost:3000/api/emails/email-uuid-001/summary
```

**Response (200 OK):**

```json
{
  "id": "email-uuid-001",
  "subject": "Quarterly Budget Review and Planning",
  "summary": "The finance team is requesting the final budget proposals for Q1 2026. All departments need to submit their allocations by December 20th. The review meeting is scheduled for January 5th, 2026.",
  "length": "medium",
  "tone": "formal",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "generatedAt": "2025-12-10T11:15:00Z"
}
```

**Error Responses:**

- **404 Not Found** - Email doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Email not found",
  "error": "Not Found"
}
```

- **500 Internal Server Error** - AI API error:
```json
{
  "statusCode": 500,
  "message": "Failed to generate summary: OpenAI API error",
  "error": "Internal Server Error"
}
```

- **401 Unauthorized** - Invalid or missing token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## Summary Generation Flow

```
User Request
    ↓
Validate Email ID
    ↓
Fetch Email Content
    ↓
Prepare Prompt with Options
    ↓
Call AI Provider (OpenAI/Gemini)
    ↓
Parse Response
    ↓
Return Summary
```

---

## AI Provider Configuration

### OpenAI Configuration

**Required Environment Variables:**

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4, gpt-4-turbo-preview
```

**Supported Models:**

- gpt-3.5-turbo (faster, cheaper)
- gpt-4 (more powerful)
- gpt-4-turbo-preview (latest)

### Google Gemini Configuration

**Required Environment Variables:**

```bash
GEMINI_API_KEY=your-gemini-api-key
```

**Supported Models:**

- gemini-pro
- gemini-pro-vision

---

## Request Examples

### Example 1: Short Summary with Formal Tone

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "short",
    "tone": "formal"
  }' \
  http://localhost:3000/api/emails/email-uuid-001/summary
```

**Response:**

```json
{
  "id": "email-uuid-001",
  "subject": "Project Deadline Extension",
  "summary": "The project deadline has been extended by two weeks due to resource constraints.",
  "length": "short",
  "tone": "formal",
  "provider": "openai",
  "generatedAt": "2025-12-10T11:20:00Z"
}
```

---

### Example 2: Long Summary with Custom Instructions

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "long",
    "tone": "formal",
    "customInstructions": "Extract all action items, deadlines, and stakeholders involved"
  }' \
  http://localhost:3000/api/emails/email-uuid-002/summary
```

**Response:**

```json
{
  "id": "email-uuid-002",
  "subject": "Team Restructuring Announcement",
  "summary": "Management has announced a team restructuring effective January 15th. The sales department will be merged with business development under a new VP of Revenue. Key stakeholders include current department heads and affected employees. Action items: All staff must complete reorganization training by January 10th. Deadline: New role assignments will be finalized by January 12th. HR will schedule one-on-one meetings with affected employees.",
  "length": "long",
  "tone": "formal",
  "provider": "openai",
  "generatedAt": "2025-12-10T11:25:00Z"
}
```

---

### Example 3: Casual Tone with Medium Length

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "medium",
    "tone": "casual"
  }' \
  http://localhost:3000/api/emails/email-uuid-003/summary
```

**Response:**

```json
{
  "id": "email-uuid-003",
  "subject": "Team Lunch Announcement",
  "summary": "Hey team! Our monthly team lunch is coming up next Friday at noon. It's at that Italian place everyone loves downtown. Just let Sarah know if you're coming or have any dietary restrictions!",
  "length": "medium",
  "tone": "casual",
  "provider": "openai",
  "generatedAt": "2025-12-10T11:30:00Z"
}
```

---

### Example 4: Technical Tone for Engineering Email

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length": "medium",
    "tone": "technical",
    "customInstructions": "Focus on technical requirements, dependencies, and implementation details"
  }' \
  http://localhost:3000/api/emails/email-uuid-004/summary
```

**Response:**

```json
{
  "id": "email-uuid-004",
  "subject": "API Migration to Microservices",
  "summary": "The legacy monolithic API will be migrated to a microservices architecture using Docker and Kubernetes. Key services include authentication (Node.js), billing (Python/FastAPI), and notifications (Go). Database migration from PostgreSQL single instance to distributed setup with read replicas. Dependencies: Kong API Gateway for routing, Redis for caching. Timeline: POC in January, gradual rollout throughout Q1 2026.",
  "length": "medium",
  "tone": "technical",
  "provider": "openai",
  "generatedAt": "2025-12-10T11:35:00Z"
}
```

---

## Integration Examples

### Example 1: Summarize Email and Move to Done

```bash
# Step 1: Generate summary
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length":"short","tone":"formal"}' \
  http://localhost:3000/api/emails/email-123/summary

# Step 2: Move to Done column (requires Kanban API)
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailId":"email-123",
    "fromColumnId":"col-inbox",
    "toColumnId":"col-done",
    "order":0
  }' \
  http://localhost:3000/api/emails/kanban/cards/move
```

---

### Example 2: Get All Emails and Summarize with Custom Instructions

```bash
# Step 1: Get all emails
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/emails

# Step 2: For each email, generate summary with custom instructions
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "length":"long",
    "customInstructions":"Extract all action items, deadlines, and required approvals"
  }' \
  http://localhost:3000/api/emails/email-123/summary
```

---

### Example 3: Batch Summarization with Different Providers

```bash
# Using OpenAI (default)
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length":"medium","provider":"openai"}' \
  http://localhost:3000/api/emails/email-123/summary

# Using Gemini (alternative)
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length":"medium","provider":"gemini"}' \
  http://localhost:3000/api/emails/email-456/summary
```

---

## Rate Limiting & Best Practices

1. **Batch Operations**: Summarize emails in batches to optimize API usage
2. **Caching**: Cache summaries to avoid regenerating for the same email with same parameters
3. **Rate Limits**:
   - OpenAI: Subject to your API usage limits (typically 3,000 requests/minute for standard accounts)
   - Gemini: Subject to your API quota
4. **Timeout**: Summary generation may take 2-5 seconds depending on email length and AI provider
5. **Cost Optimization**:
   - Use "short" length for quick previews
   - Use "medium" length for most use cases
   - Use "long" length for detailed analysis only when needed
   - Consider using cheaper models (gpt-3.5-turbo) for routine summaries

---

## Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Summary generated successfully |
| 400 | Bad Request | Invalid parameters (length, tone, etc.) |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Email ID doesn't exist |
| 500 | Server Error | AI provider API error or timeout |

---

## Error Handling

### Common Error Scenarios

**Missing Required Token:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"length":"medium"}' \
  http://localhost:3000/api/emails/email-123/summary
```

**Response:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

**Invalid Email ID:**

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -d '{"length":"medium"}' \
  http://localhost:3000/api/emails/invalid-id/summary
```

**Response:**

```json
{
  "statusCode": 404,
  "message": "Email not found",
  "error": "Not Found"
}
```

---

**AI Provider Timeout:**

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -d '{"length":"medium","provider":"openai"}' \
  http://localhost:3000/api/emails/email-with-large-body/summary
```

**Response:**

```json
{
  "statusCode": 500,
  "message": "Failed to generate summary: Request timeout after 30 seconds",
  "error": "Internal Server Error"
}
```

---

## Testing with Mock Data

For development/testing without real emails:

```bash
# Use mock header to get sample emails
curl -H "Authorization: Bearer TOKEN" \
  -H "Mock: true" \
  http://localhost:3000/api/emails/list

# Then summarize the mock email IDs
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"length":"medium"}' \
  http://localhost:3000/api/emails/mock-email-001/summary
```

---

## Performance Tips

1. **Parallel Requests**: Make multiple summary requests in parallel for different emails
2. **Length Strategy**: Start with "short" summaries for initial processing, expand to "medium"/"long" as needed
3. **Provider Selection**: Test both OpenAI and Gemini to find the best balance for your use case
4. **Caching Implementation**: Implement client-side caching to avoid re-summarizing the same email

---
