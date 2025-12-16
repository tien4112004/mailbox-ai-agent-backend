# Email Search & Filter API Documentation

## Overview

The Email Search & Filter API provides powerful tools to find, filter, and organize emails. It includes:

- **Fuzzy Search**: Advanced text search with similarity matching across multiple fields
- **Folder Filtering**: Filter emails by folder/label
- **Pagination**: Navigate through large email lists efficiently
- **Field-Specific Search**: Search in specific email fields (subject, sender, body)
- **Threshold Tuning**: Adjust search sensitivity for precise results

### Key Features

- **PostgreSQL Full-Text Search with pg_trgm**: Uses fuzzy matching for intelligent search
- **Multi-Field Search**: Search subject, sender email, and body content
- **Configurable Similarity Threshold**: Fine-tune search sensitivity (0.0 to 1.0)
- **Gmail Folder Support**: Filter by any Gmail label (INBOX, SENT, DRAFTS, etc.)
- **Pagination**: Efficient handling of large email datasets with page tokens

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

# 1. GET EMAILS WITH FILTERS

## Endpoint

```http
GET /api/emails/list
```

## Description

Retrieve emails with optional filtering, searching, and pagination.

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `folder` | string | No | `inbox` | Gmail folder/label (e.g., INBOX, SENT, DRAFTS) |
| `search` | string | No | - | Gmail search query (uses Gmail's built-in search syntax) |
| `page` | number | No | `1` | Page number (1, 2, 3, ...) for pagination |
| `limit` | number | No | `20` | Number of emails per page (1-100) |

## Query Examples

### Basic Email List
```bash
GET /api/emails/list
Authorization: Bearer <token>
```

### Filter by Folder
```bash
GET /api/emails/list?folder=SENT
Authorization: Bearer <token>
```

### Pagination
```bash
GET /api/emails/list?page=2&limit=10
Authorization: Bearer <token>
```

### Gmail Search Query
```bash
GET /api/emails/list?search=from:john@example.com
Authorization: Bearer <token>
```

### Combine Filters
```bash
GET /api/emails/list?folder=INBOX&search=has:attachment&limit=20
Authorization: Bearer <token>
```

## Response

### Success (200 OK)

```json
{
  "emails": [
    {
      "id": "18f2a1b3c4d5e6f7",
      "threadId": "18f2a1b3c4d5e6f7",
      "subject": "Meeting Tomorrow",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "to": [
        {
          "name": "You",
          "email": "you@example.com"
        }
      ],
      "date": "2025-12-16T10:30:00.000Z",
      "snippet": "Hi, let's meet tomorrow at 10 AM...",
      "read": false,
      "starred": false,
      "labels": ["INBOX", "IMPORTANT"]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid folder or search parameters",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

# 2. FUZZY SEARCH (MULTIPLE FIELDS)

## Endpoint

```http
POST /api/emails/search/fuzzy
```

## Description

Advanced fuzzy search across multiple email fields (subject, sender, body) with similarity matching using PostgreSQL's `pg_trgm` extension.

## Request Body

```json
{
  "query": "marketing campaign",
  "fields": "subject,from_email,body",
  "limit": 20,
  "threshold": 0.3
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | **Yes** | - | Search query (e.g., "marketing", "john doe") |
| `fields` | string | No | `subject,from_email` | Comma-separated fields to search: `subject`, `from_email`, `body` |
| `limit` | number | No | `20` | Max results to return (1-100) |
| `threshold` | number | No | `0.3` | Similarity threshold (0.0-1.0). Higher = stricter matching |

## Examples

### Basic Fuzzy Search
```bash
curl -X POST http://localhost:3000/api/emails/search/fuzzy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "meeting"
  }'
```

### Search Multiple Fields
```bash
curl -X POST http://localhost:3000/api/emails/search/fuzzy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "john",
    "fields": "subject,from_email,body",
    "limit": 50
  }'
```

### Strict Matching (High Threshold)
```bash
curl -X POST http://localhost:3000/api/emails/search/fuzzy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "project deadline",
    "threshold": 0.7,
    "limit": 10
  }'
```

### Loose Matching (Low Threshold)
```bash
curl -X POST http://localhost:3000/api/emails/search/fuzzy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "projct",
    "threshold": 0.2,
    "limit": 20
  }'
```

## Response

### Success (200 OK)

```json
{
  "query": "marketing",
  "count": 5,
  "results": [
    {
      "id": "email-id-1",
      "subject": "Q4 Marketing Campaign",
      "from_email": "marketing@company.com",
      "body": "This is about our marketing strategy...",
      "preview": "This is about our marketing strategy...",
      "read": false,
      "starred": false,
      "similarity": 0.95,
      "createdAt": "2025-12-15T14:30:00Z"
    },
    {
      "id": "email-id-2",
      "subject": "Marketing Team Meeting",
      "from_email": "manager@company.com",
      "body": "Let's discuss the marketing plan...",
      "preview": "Let's discuss the marketing plan...",
      "read": true,
      "starred": true,
      "similarity": 0.87,
      "createdAt": "2025-12-14T10:15:00Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request - Empty Query
```json
{
  "statusCode": 400,
  "message": "Search query cannot be empty",
  "error": "Bad Request"
}
```

### 400 Bad Request - Invalid Fields
```json
{
  "statusCode": 400,
  "message": "Invalid fields. Must be one or more of: subject, from_email, body",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

# 3. FUZZY SEARCH (SINGLE FIELD)

## Endpoint

```http
POST /api/emails/search/fuzzy/:field
```

## Description

Search emails in a specific field with fine-tuned control over similarity matching.

## URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `field` | string | **Yes** | Field to search: `subject`, `from_email`, or `body` |

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | **Yes** | - | Search query |
| `limit` | number | No | `20` | Max results (1-100) |
| `threshold` | number | No | `0.3` | Similarity threshold (0.0-1.0) |

## Examples

### Search in Subject Field
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/subject?q=urgent&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Search in Sender Field
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/from_email?q=john@example.com&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Search in Body with High Threshold
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/body?q=contract&threshold=0.6&limit=15" \
  -H "Authorization: Bearer <token>"
```

### Search with Loose Matching
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/subject?q=aproximate+spelling&threshold=0.2" \
  -H "Authorization: Bearer <token>"
```

## Response

### Success (200 OK)

```json
{
  "field": "subject",
  "query": "urgent",
  "count": 3,
  "results": [
    {
      "id": "email-1",
      "subject": "URGENT: Project Update",
      "from_email": "boss@company.com",
      "body": "Please review the attached document...",
      "read": false,
      "starred": true,
      "similarity": 0.98,
      "createdAt": "2025-12-16T08:00:00Z"
    },
    {
      "id": "email-2",
      "subject": "Urgent Meeting at 3 PM",
      "from_email": "colleague@company.com",
      "body": "Let's meet to discuss...",
      "read": true,
      "starred": false,
      "similarity": 0.92,
      "createdAt": "2025-12-15T15:30:00Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request - Missing Query
```json
{
  "statusCode": 400,
  "message": "Query parameter 'q' is required",
  "error": "Bad Request"
}
```

### 400 Bad Request - Invalid Field
```json
{
  "statusCode": 400,
  "message": "Invalid field 'invalid_field'. Allowed fields: subject, from_email, body",
  "error": "Bad Request"
}
```

---

# 4. SIMILARITY THRESHOLD GUIDE

The `threshold` parameter controls how strict the search is.

| Threshold | Strictness | Use Case | Example |
|-----------|-----------|----------|---------|
| 0.1 | Very Loose | Typo tolerance, partial matches | "aproximate" matches "approximate" |
| 0.3 | Loose | Default, general search | "meting" matches "meeting" |
| 0.5 | Moderate | More precise results | "projct" may not match "project" |
| 0.7 | Strict | Exact-like matches | Only very similar text matches |
| 0.9 | Very Strict | Near-perfect matches | Only nearly identical text matches |

## Threshold Examples

### Find Similar but Not Exact
```bash
# threshold: 0.3 (default)
# Query: "programme"
# Matches: "program", "programming", "programmer"
```

### Find Exact Matches Only
```bash
# threshold: 0.9
# Query: "deadline"
# Matches: "deadlines" (very similar)
# Does NOT match: "due date"
```

---

# 5. COMBINED FILTERING & SEARCHING

You can combine multiple endpoints for advanced queries:

## Example 1: Filter Folder + Fuzzy Search

```bash
# Step 1: Get emails from INBOX
curl -X GET "http://localhost:3000/api/emails/list?folder=INBOX" \
  -H "Authorization: Bearer <token>"

# Step 2: Fuzzy search results
curl -X POST "http://localhost:3000/api/emails/search/fuzzy" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "project",
    "fields": "subject,body",
    "limit": 20,
    "threshold": 0.4
  }'
```

## Example 2: Find Recent Emails from Specific Sender

```bash
# Method 1: Using folder filter + Gmail search
curl -X GET "http://localhost:3000/api/emails/list?folder=INBOX&search=from:john@example.com" \
  -H "Authorization: Bearer <token>"

# Method 2: Using fuzzy search by field
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/from_email?q=john@example.com&limit=50" \
  -H "Authorization: Bearer <token>"
```

---

# 6. COMMON USE CASES

### Search for Emails About a Project
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Q4 marketing campaign",
    "fields": "subject,body",
    "limit": 30,
    "threshold": 0.4
  }'
```

### Find Emails from a Specific Person (Typo Tolerant)
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/from_email?q=johhn@company.com&threshold=0.6" \
  -H "Authorization: Bearer <token>"
```

### Search for Important Emails
```bash
curl -X GET "http://localhost:3000/api/emails/list?search=is:important" \
  -H "Authorization: Bearer <token>"
```

### Find Unread Emails with Attachments
```bash
curl -X GET "http://localhost:3000/api/emails/list?search=is:unread has:attachment" \
  -H "Authorization: Bearer <token>"
```

### Search Sent Folder by Subject
```bash
curl -X POST "http://localhost:3000/api/emails/search/fuzzy/subject?q=thank+you&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

# 7. PERFORMANCE NOTES

- **Fuzzy search uses PostgreSQL's `pg_trgm` extension** for efficient similarity matching
- **Index performance**: Searches are fast on indexed fields (subject, from_email)
- **Large datasets**: Limit results with `limit` parameter (default 20, max 100)
- **Pagination**: Simply use `page` parameter (1, 2, 3, ...) - no tokens needed!
- **Threshold tuning**: Higher threshold = faster search but fewer results

---

## Troubleshooting

### No Results Returned
- Lower the `threshold` value (more loose matching)
- Verify the search `query` is not empty
- Check that emails exist in the selected folder
- Try using `/emails/list` first to verify emails are in the database

### Search is Too Slow
- Reduce the `limit` parameter
- Increase the `threshold` for stricter (faster) matching
- Use field-specific search instead of multi-field
- Try folder filtering first to narrow down the search space

### Too Many False Positives
- Increase the `threshold` value (stricter matching)
- Limit `fields` to specific fields instead of all
- Use more specific search terms

### Page 2 Returns No Results
- Check `totalPages` in the pagination response
- Verify the page number doesn't exceed `totalPages`
- Check if emails exist in the selected folder

---

# 9. API LIMITS & CONSTRAINTS

| Constraint | Limit |
|-----------|-------|
| Max query length | No limit |
| Max results per request | 100 |
| Default results per request | 20 |
| Max fields per search | 3 (subject, from_email, body) |
| Min threshold | 0.0 |
| Max threshold | 1.0 |
| Max page size | 100 |

