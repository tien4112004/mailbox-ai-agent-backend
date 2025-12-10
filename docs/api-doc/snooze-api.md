# Email Snooze API Documentation

## Overview

The Email Snooze API provides endpoints to manage snoozed emails in the mailbox system. Users can snooze emails to temporarily hide them from their inbox and have them automatically reappear at a specified time.

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

### 1. Snooze an Email

Snooze an email until a specified time.

**Endpoint:** `POST /:gmailMessageId/snooze`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| gmailMessageId | string | Gmail's unique message ID |

**Request Body:**

```json
{
  "snoozeUntil": "2025-12-15T10:00:00Z",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "recurrencePattern": null
}
```

**Query Parameters:** None

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emailId": "abc123def456",
  "gmailMessageId": "abc123def456",
  "userId": "user_456",
  "status": "snoozed",
  "snoozeUntil": "2025-12-15T09:00:00Z",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "createdAt": "2025-12-09T10:00:00Z",
  "updatedAt": "2025-12-09T10:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Snooze time is in the past:
```json
{
  "statusCode": 400,
  "message": "Snooze time must be in the future",
  "error": "Bad Request"
}
```

---

### 2. Get Snoozed Emails

Retrieve a paginated list of currently snoozed emails for the user.

**Endpoint:** `GET /snoozed/list`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Number of results per page |

**Example Request:**

```
GET /snoozed/list?page=1&limit=20
```

**Response (200 OK):**

```json
{
  "snoozes": [
    {
      "id": "snooze_001",
      "emailId": "email_123",
      "gmailMessageId": "abc123def456",
      "userId": "user_456",
      "status": "SNOOZED",
      "snoozeUntil": "2025-12-15T10:00:00Z",
      "originalLabels": ["STARRED"],
      "originalFolder": "INBOX",
      "snoozeReason": "Follow up later",
      "isRecurring": false,
      "recurrencePattern": null,
      "createdAt": "2025-12-09T14:30:00Z",
      "updatedAt": "2025-12-09T14:30:00Z"
    },
    {
      "id": "snooze_002",
      "emailId": "email_124",
      "gmailMessageId": "xyz789uvw012",
      "userId": "user_456",
      "status": "SNOOZED",
      "snoozeUntil": "2025-12-20T14:00:00Z",
      "originalLabels": [],
      "originalFolder": "INBOX",
      "snoozeReason": "Respond tomorrow",
      "isRecurring": false,
      "recurrencePattern": null,
      "createdAt": "2025-12-08T09:15:00Z",
      "updatedAt": "2025-12-08T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. Get Upcoming Snoozed Emails

Get snoozed emails that will be resumed within a specified number of days.

**Endpoint:** `GET /snoozed/upcoming`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| daysAhead | number | 7 | Number of days to look ahead |

**Example Request:**

```
GET /snoozed/upcoming?daysAhead=3
```

**Response (200 OK):**

```json
[
  {
    "id": "snooze_001",
    "emailId": "email_123",
    "gmailMessageId": "abc123def456",
    "userId": "user_456",
    "status": "SNOOZED",
    "snoozeUntil": "2025-12-12T10:00:00Z",
    "originalLabels": ["STARRED"],
    "originalFolder": "INBOX",
    "snoozeReason": "Follow up later",
    "isRecurring": false,
    "recurrencePattern": null,
    "createdAt": "2025-12-09T14:30:00Z",
    "updatedAt": "2025-12-09T14:30:00Z"
  }
]
```

---

### 4. Get Snooze Count

Get the total count of currently snoozed emails for the user.

**Endpoint:** `GET /snoozed/count`

**Query Parameters:** None

**Response (200 OK):**

```json
{
  "count": 5
}
```

---

### 5. Get Snooze History

Retrieve a paginated history of all snoozes (active and past) for the user.

**Endpoint:** `GET /snoozed/history`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Number of results per page |

**Example Request:**

```
GET /snoozed/history?page=1&limit=20
```

**Response (200 OK):**

```json
{
  "snoozes": [
    {
      "id": "snooze_001",
      "emailId": "email_123",
      "gmailMessageId": "abc123def456",
      "userId": "user_456",
      "status": "RESUMED",
      "snoozeUntil": "2025-12-15T10:00:00Z",
      "originalLabels": ["STARRED"],
      "originalFolder": "INBOX",
      "snoozeReason": "Follow up later",
      "isRecurring": false,
      "recurrencePattern": null,
      "resumedAt": "2025-12-15T10:05:00Z",
      "createdAt": "2025-12-09T14:30:00Z",
      "updatedAt": "2025-12-15T10:05:00Z"
    },
    {
      "id": "snooze_002",
      "emailId": "email_124",
      "gmailMessageId": "xyz789uvw012",
      "userId": "user_456",
      "status": "CANCELLED",
      "snoozeUntil": "2025-12-20T14:00:00Z",
      "originalLabels": [],
      "originalFolder": "INBOX",
      "snoozeReason": "Respond tomorrow",
      "isRecurring": false,
      "recurrencePattern": null,
      "cancelledAt": "2025-12-14T16:45:00Z",
      "createdAt": "2025-12-08T09:15:00Z",
      "updatedAt": "2025-12-14T16:45:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 6. Get Snooze Details

Retrieve details of a specific snooze record.

**Endpoint:** `GET /snoozed/:snoozeId`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| snoozeId | string | The unique identifier of the snooze record |

**Example Request:**

```
GET /snoozed/snooze_001
```

**Response (200 OK):**

```json
{
  "id": "snooze_001",
  "emailId": "email_123",
  "gmailMessageId": "abc123def456",
  "userId": "user_456",
  "status": "SNOOZED",
  "snoozeUntil": "2025-12-15T10:00:00Z",
  "originalLabels": ["STARRED"],
  "originalFolder": "INBOX",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "recurrencePattern": null,
  "createdAt": "2025-12-09T14:30:00Z",
  "updatedAt": "2025-12-09T14:30:00Z"
}
```

**Error Response:**

- **404 Not Found** - Snooze record not found:
```json
{
  "statusCode": 404,
  "message": "Snooze record not found",
  "error": "Not Found"
}
```

---

### 7. Update Snooze Time

Update the snooze time for an existing snoozed email.

**Endpoint:** `PUT /snoozed/:snoozeId/time`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| snoozeId | string | The unique identifier of the snooze record |

**Request Body:**

```json
{
  "newSnoozeUntil": "2025-12-20T15:30:00Z"
}
```

**Response (200 OK):**

```json
{
  "id": "snooze_001",
  "emailId": "email_123",
  "gmailMessageId": "abc123def456",
  "userId": "user_456",
  "status": "SNOOZED",
  "snoozeUntil": "2025-12-20T15:30:00Z",
  "originalLabels": ["STARRED"],
  "originalFolder": "INBOX",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "recurrencePattern": null,
  "createdAt": "2025-12-09T14:30:00Z",
  "updatedAt": "2025-12-09T16:45:00Z"
}
```

**Error Responses:**

- **404 Not Found** - Snooze record not found:
```json
{
  "statusCode": 404,
  "message": "Snooze record not found",
  "error": "Not Found"
}
```

- **400 Bad Request** - New snooze time is in the past:
```json
{
  "statusCode": 400,
  "message": "New snooze time must be in the future",
  "error": "Bad Request"
}
```

---

### 8. Resume a Snoozed Email

Bring a snoozed email back to the inbox immediately.

**Endpoint:** `POST /snoozed/:snoozeId/resume`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| snoozeId | string | The unique identifier of the snooze record |

**Request Body:** Empty

**Example Request:**

```
POST /snoozed/snooze_001/resume
```

**Response (200 OK):**

```json
{
  "id": "snooze_001",
  "emailId": "email_123",
  "gmailMessageId": "abc123def456",
  "userId": "user_456",
  "status": "RESUMED",
  "snoozeUntil": "2025-12-15T10:00:00Z",
  "originalLabels": ["STARRED"],
  "originalFolder": "INBOX",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "recurrencePattern": null,
  "resumedAt": "2025-12-09T15:00:00Z",
  "createdAt": "2025-12-09T14:30:00Z",
  "updatedAt": "2025-12-09T15:00:00Z"
}
```

**Error Responses:**

- **404 Not Found** - Snooze record not found:
```json
{
  "statusCode": 404,
  "message": "Snooze record not found",
  "error": "Not Found"
}
```

- **400 Bad Request** - Cannot resume snooze with non-SNOOZED status:
```json
{
  "statusCode": 400,
  "message": "Cannot resume snooze with status: CANCELLED",
  "error": "Bad Request"
}
```

---

### 9. Cancel a Snooze

Cancel an existing snooze and restore the email to the inbox.

**Endpoint:** `POST /snoozed/:snoozeId/cancel`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| snoozeId | string | The unique identifier of the snooze record |

**Request Body:** Empty

**Example Request:**

```
POST /snoozed/snooze_001/cancel
```

**Response (200 OK):**

```json
{
  "id": "snooze_001",
  "emailId": "email_123",
  "gmailMessageId": "abc123def456",
  "userId": "user_456",
  "status": "CANCELLED",
  "snoozeUntil": "2025-12-15T10:00:00Z",
  "originalLabels": ["STARRED"],
  "originalFolder": "INBOX",
  "snoozeReason": "Follow up later",
  "isRecurring": false,
  "recurrencePattern": null,
  "cancelledAt": "2025-12-09T15:10:00Z",
  "createdAt": "2025-12-09T14:30:00Z",
  "updatedAt": "2025-12-09T15:10:00Z"
}
```

**Error Responses:**

- **404 Not Found** - Snooze record not found:
```json
{
  "statusCode": 404,
  "message": "Snooze record not found",
  "error": "Not Found"
}
```

- **400 Bad Request** - Cannot cancel snooze with non-SNOOZED status:
```json
{
  "statusCode": 400,
  "message": "Cannot cancel snooze with status: RESUMED",
  "error": "Bad Request"
}
```

---

## Data Models

### Snooze Entity

```typescript
{
  id: string;                    // Unique identifier
  emailId: string;               // Reference to the email
  gmailMessageId: string;        // Gmail's unique message ID
  userId: string;                // User who owns the snooze
  status: SnoozeStatus;          // SNOOZED | RESUMED | CANCELLED
  snoozeUntil: Date;             // When the email should be unsnoozed
  originalLabels: string[];      // Labels to restore when unsnoozed
  originalFolder: string;        // Folder to restore to
  snoozeReason?: string;         // User-provided reason for snoozin
  isRecurring: boolean;          // Whether this snooze recurs
  recurrencePattern?: string;    // DAILY | WEEKLY | MONTHLY
  resumedAt?: Date;              // When the snooze was resumed
  cancelledAt?: Date;            // When the snooze was cancelled
  createdAt: Date;               // When the snooze was created
  updatedAt: Date;               // Last update timestamp
}
```

### SnoozeStatus Enum

```typescript
enum SnoozeStatus {
  SNOOZED = 'SNOOZED',       // Email is currently snoozed
  RESUMED = 'RESUMED',       // Snooze has been completed/resumed
  CANCELLED = 'CANCELLED'    // Snooze was manually cancelled
}
```

---

## Common Use Cases

### 1. Snooze an Email for 3 Days

```bash
curl -X POST http://localhost:3000/api/emails/abc123def456/snooze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "snoozeUntil": "2025-12-12T10:00:00Z",
    "snoozeReason": "Follow up later"
  }'
```

### 2. Get All Snoozed Emails

```bash
curl -X GET http://localhost:3000/api/emails/snoozed/list \
  -H "Authorization: Bearer <token>"
```

### 3. Manually Resume a Snoozed Email

```bash
curl -X POST http://localhost:3000/api/emails/snoozed/snooze_001/resume \
  -H "Authorization: Bearer <token>"
```

### 4. Postpone a Snooze by Another Week

```bash
curl -X PUT http://localhost:3000/api/emails/snoozed/snooze_001/time \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newSnoozeUntil": "2025-12-22T10:00:00Z"
  }'
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (authentication failed) |
| 404 | Not Found (snooze record doesn't exist) |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently, there are no rate limits implemented. This may be added in future versions.

---

## Pagination

List endpoints support pagination through query parameters:

- `page`: Page number (1-indexed)
- `limit`: Number of items per page (default: 20, max: 100)

The response includes a `pagination` object with:

```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Recurring Snoozes (Future Enhancement)

The API supports recurring snoozes through the `isRecurring` and `recurrencePattern` fields. Currently supported patterns:

- `DAILY`: Repeat every day
- `WEEKLY`: Repeat every week
- `MONTHLY`: Repeat every month

When a recurring snooze is resumed, a new snooze is automatically created for the next occurrence.

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- The snooze time must always be in the future
- Original email labels and folder information is preserved and restored when unsnoozed
- Gmail API is used to manage email labels under the hood
