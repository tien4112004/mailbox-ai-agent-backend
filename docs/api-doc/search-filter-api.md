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
### Search results (unified endpoint)
curl -X GET "http://localhost:3000/api/emails/search?query=project" \
  -H "Authorization: Bearer <token>"
```

## Authentication

All endpoints require authentication. Include the bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

### Using unified search to filter by sender
curl -X GET "http://localhost:3000/api/emails/search?query=john@example.com" \
  -H "Authorization: Bearer <token>"
# 1. GET EMAILS WITH FILTERS

## Endpoint

```http
GET /api/emails/list
```

## Description

Retrieve emails with optional filtering, searching, and pagination.

## Request Parameters
### Search for Emails About a Project
curl -X GET "http://localhost:3000/api/emails/search?query=Q4+marketing+campaign" \
  -H "Authorization: Bearer <token>"

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `folder` | string | No | `inbox` | Gmail folder/label (e.g., INBOX, SENT, DRAFTS) |
| `search` | string | No | - | Gmail search query (uses Gmail's built-in search syntax) |
| `page` | number | No | `1` | Page number (1, 2, 3, ...) for pagination |
| `limit` | number | No | `20` | Number of emails per page (1-100) |

## Query Examples

### Basic Email List
```bash
### Search Sent Folder by Subject
curl -X GET "http://localhost:3000/api/emails/search?query=thank+you" \
  -H "Authorization: Bearer <token>"
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
# 2. SEARCH (UNIFIED)

Use the single unified endpoint to run fuzzy/trigram text search and semantic (embedding) search where available. This replaces the previous `/api/emails/search/fuzzy` and `/api/emails/search/fuzzy/:field` endpoints.

## Endpoint

```http
GET /api/emails/search?query=your+search+terms
```

## Description

Run a combined search applying typo-tolerant fuzzy matching, trigram similarity, and semantic (vector) search when enabled. Results are merged and ranked by relevance.

## Request

Provide only the `query` as a query string parameter. Other options (`fields`, `limit`, `threshold`) can be provided in the request. Semantic (embedding) search is applied automatically when runtime availability (Gemini API key and model) is satisfied.

## Examples

```bash
curl -X POST http://localhost:3000/api/emails/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "meeting",
    "limit": 20
  }'
```

## Response

Returns an array of normalized email objects (same format as other email list endpoints):

```json
[
  {
    "id": "...",
    "subject": "Q4 Marketing Campaign",
    "from": { "name": "Marketing", "email": "marketing@company.com" },
    "to": ["you@example.com"],
    "date": "2025-12-15T14:30:00Z",
    "snippet": "This is about our marketing strategy...",
    "body": "This is about our marketing strategy...",
    "read": false,
    "starred": false,
    "folder": "INBOX",
    "attachments": []
  }
]
```

Notes:
- Old fuzzy and field-specific endpoints have been removed. Use `/api/emails/search` for all search needs.

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

# Step 2: Search results (unified endpoint)
curl -X POST "http://localhost:3000/api/emails/search" \
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

# Method 2: Using unified search to filter by sender
curl -X POST "http://localhost:3000/api/emails/search" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "john@example.com",
    "fields": "from_email",
    "limit": 50
  }'
```

---

# 6. COMMON USE CASES

### Search for Emails About a Project
```bash
curl -X POST "http://localhost:3000/api/emails/search" \
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
curl -X POST "http://localhost:3000/api/emails/search" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "johhn@company.com",
    "fields": "from_email",
    "threshold": 0.6
  }'
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
curl -X POST "http://localhost:3000/api/emails/search" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "thank you",
    "fields": "subject",
    "limit": 20
  }'
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

