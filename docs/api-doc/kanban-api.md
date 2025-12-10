# Kanban Board API Documentation

## Overview

The Kanban Board API provides a visual workflow management system with customizable columns for organizing emails. It supports both the Kanban Interface Visualization and Workflow Management (Drag-and-Drop) features.

### Default Columns

| Column | Status | Color | Purpose |
|--------|--------|-------|---------|
| Inbox | inbox | #3B82F6 (Blue) | Primary entry point for new emails |
| To Do | todo | #F59E0B (Amber) | Emails that need attention |
| In Progress | in-progress | #8B5CF6 (Purple) | Actively being worked on |
| Done | done | #10B981 (Green) | Completed emails |
| Snoozed | snoozed | #6B7280 (Gray) | Temporarily hidden emails |

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

# FEATURE I: KANBAN INTERFACE VISUALIZATION

## Overview

The Kanban Interface provides a visual workflow management system with customizable columns for organizing emails.

---

## Endpoints

### 1. Get Kanban Board

Retrieve the complete Kanban board with all columns and cards.

**Endpoint:** `GET /kanban/board`

**Query Parameters:** None

**Example Request:**

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/emails/kanban/board
```

**Response (200 OK):**

```json
[
  {
    "id": "col-inbox-uuid",
    "name": "Inbox",
    "order": 0,
    "status": "inbox",
    "color": "#3B82F6",
    "isActive": true,
    "createdAt": "2025-12-10T00:00:00Z",
    "updatedAt": "2025-12-10T00:00:00Z",
    "cards": [
      {
        "id": "card-001",
        "emailId": "email-uuid-001",
        "columnId": "col-inbox-uuid",
        "order": 0,
        "notes": "Follow up needed",
        "createdAt": "2025-12-10T08:30:00Z",
        "updatedAt": "2025-12-10T08:30:00Z",
        "email": {
          "id": "email-uuid-001",
          "subject": "Project Update - Q4 Review",
          "body": "Full email content...",
          "preview": "Let's discuss the quarterly results and roadmap for next year...",
          "fromName": "John Doe",
          "fromEmail": "john.doe@company.com",
          "toEmail": ["you@company.com"],
          "read": false,
          "starred": true,
          "folder": "inbox",
          "summary": "John wants to discuss Q4 results and next year's roadmap."
        }
      },
      {
        "id": "card-002",
        "emailId": "email-uuid-002",
        "columnId": "col-inbox-uuid",
        "order": 1,
        "notes": null,
        "email": {
          "id": "email-uuid-002",
          "subject": "Team Meeting Tomorrow",
          "preview": "Don't forget about our team meeting tomorrow at 10 AM...",
          "fromName": "Jane Smith",
          "fromEmail": "jane.smith@company.com",
          "summary": "Reminder about team meeting scheduled for tomorrow at 10 AM."
        }
      }
    ]
  },
  {
    "id": "col-todo-uuid",
    "name": "To Do",
    "order": 1,
    "status": "todo",
    "color": "#F59E0B",
    "isActive": true,
    "cards": [
      {
        "id": "card-003",
        "emailId": "email-uuid-003",
        "columnId": "col-todo-uuid",
        "order": 0,
        "notes": "Complete by Friday",
        "email": {
          "id": "email-uuid-003",
          "subject": "Design Review Needed",
          "preview": "Please review the attached designs for the new dashboard...",
          "fromName": "Mike Johnson",
          "fromEmail": "mike.johnson@company.com",
          "summary": "Mike needs design review for the new dashboard by Friday."
        }
      }
    ]
  }
]
```

**Error Responses:**

- **401 Unauthorized** - Invalid or missing token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

### 2. Create Kanban Column

Create a new custom Kanban column.

**Endpoint:** `POST /kanban/columns`

**Request Body:**

```json
{
  "name": "Urgent",
  "order": 5,
  "status": "urgent",
  "color": "#EF4444",
  "isActive": true
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Column name |
| order | number | Yes | Column position (0-indexed) |
| status | string | No | Custom status identifier |
| color | string | No | Hex color code for visual representation |
| isActive | boolean | No | Column visibility status (default: true) |

**Response (201 Created):**

```json
{
  "id": "col-urgent-uuid",
  "name": "Urgent",
  "order": 5,
  "status": "urgent",
  "color": "#EF4444",
  "isActive": true,
  "userId": "user-uuid",
  "createdAt": "2025-12-10T10:15:00Z",
  "updatedAt": "2025-12-10T10:15:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Missing required field:
```json
{
  "statusCode": 400,
  "message": "name should not be empty",
  "error": "Bad Request"
}
```

---

### 3. Update Kanban Column

Update an existing Kanban column.

**Endpoint:** `PUT /kanban/columns/:columnId`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| columnId | string | UUID of the column |

**Request Body:**

```json
{
  "name": "High Priority",
  "color": "#DC2626",
  "isActive": true
}
```

**Response (200 OK):**

```json
{
  "id": "col-urgent-uuid",
  "name": "High Priority",
  "order": 5,
  "status": "urgent",
  "color": "#DC2626",
  "isActive": true,
  "userId": "user-uuid",
  "createdAt": "2025-12-10T10:15:00Z",
  "updatedAt": "2025-12-10T10:25:00Z"
}
```

**Error Responses:**

- **404 Not Found** - Column doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Kanban column not found",
  "error": "Not Found"
}
```

---

### 4. Delete Kanban Column

Delete a Kanban column (cascades to remove all cards).

**Endpoint:** `DELETE /kanban/columns/:columnId`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| columnId | string | UUID of the column |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Column deleted successfully"
}
```

**Error Responses:**

- **404 Not Found** - Column doesn't exist:
```json
{
  "statusCode": 404,
  "message": "Kanban column not found",
  "error": "Not Found"
}
```

---

### 5. Get Column Cards

Get all cards (emails) in a specific column.

**Endpoint:** `GET /kanban/columns/:columnId/cards`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| columnId | string | UUID of the column |

**Response (200 OK):**

```json
[
  {
    "id": "card-001",
    "emailId": "email-uuid-001",
    "columnId": "col-todo-uuid",
    "order": 0,
    "notes": "Complete by Friday",
    "createdAt": "2025-12-10T08:30:00Z",
    "updatedAt": "2025-12-10T08:30:00Z",
    "email": {
      "id": "email-uuid-001",
      "subject": "Design Review Needed",
      "preview": "Please review the attached designs...",
      "fromName": "Mike Johnson",
      "fromEmail": "mike.johnson@company.com",
      "summary": "Mike needs design review for the new dashboard by Friday."
    }
  }
]
```

---

---

# FEATURE II: WORKFLOW MANAGEMENT (DRAG-AND-DROP)

## Overview

The Workflow Management system enables real-time drag-and-drop operations to move emails between columns, with immediate database updates and UI synchronization.

---

## Endpoints

### 1. Move Card (Drag-and-Drop)

Move an email card from one column to another with optional reordering.

**Endpoint:** `POST /kanban/cards/move`

**Request Body:**

```json
{
  "emailId": "email-uuid-001",
  "fromColumnId": "col-inbox-uuid",
  "toColumnId": "col-done-uuid",
  "order": 0
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| emailId | string | Yes | UUID of the email |
| fromColumnId | string | Yes | Source column UUID |
| toColumnId | string | Yes | Destination column UUID |
| order | number | No | Position in destination column (default: 0) |

**Example Request:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "email-uuid-001",
    "fromColumnId": "col-inbox-uuid",
    "toColumnId": "col-done-uuid",
    "order": 0
  }' \
  http://localhost:3000/api/emails/kanban/cards/move
```

**Response (200 OK):**

```json
{
  "id": "card-001",
  "emailId": "email-uuid-001",
  "columnId": "col-done-uuid",
  "order": 0,
  "notes": "Follow up needed",
  "createdAt": "2025-12-10T08:30:00Z",
  "updatedAt": "2025-12-10T10:45:00Z"
}
```

**Implementation Details:**

1. **Validation**: Backend verifies both columns belong to the user
2. **Email Verification**: Confirms email exists and belongs to the user
3. **Card Update**: Creates or updates the card's column association
4. **Order Management**: Updates card position within the target column
5. **Immediate Response**: Returns updated card without page refresh

**Error Responses:**

- **400 Bad Request** - Invalid column ID:
```json
{
  "statusCode": 400,
  "message": "Invalid column ID",
  "error": "Bad Request"
}
```

- **404 Not Found** - Email not found:
```json
{
  "statusCode": 404,
  "message": "Email not found",
  "error": "Not Found"
}
```

---

### 2. Add Card to Column

Add an email to a specific column as a new card.

**Endpoint:** `POST /kanban/cards/:emailId/add`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| emailId | string | UUID of the email |

**Request Body:**

```json
{
  "columnId": "col-todo-uuid",
  "order": 1
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| columnId | string | Yes | UUID of the column |
| order | number | No | Position in column (default: 0) |

**Response (201 Created):**

```json
{
  "id": "card-new-001",
  "emailId": "email-uuid-001",
  "columnId": "col-todo-uuid",
  "order": 1,
  "notes": null,
  "createdAt": "2025-12-10T10:50:00Z",
  "updatedAt": "2025-12-10T10:50:00Z"
}
```

---

### 3. Remove Card

Remove a card from the Kanban board.

**Endpoint:** `DELETE /kanban/cards/:cardId`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| cardId | string | UUID of the card |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Card removed successfully"
}
```

---

### 4. Update Card Notes

Add or update notes on a Kanban card.

**Endpoint:** `PUT /kanban/cards/:cardId/notes`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| cardId | string | UUID of the card |

**Request Body:**

```json
{
  "notes": "Follow up after meeting. Ask about project timeline."
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | Yes | Card notes/annotations |

**Response (200 OK):**

```json
{
  "id": "card-001",
  "emailId": "email-uuid-001",
  "columnId": "col-in-progress-uuid",
  "order": 2,
  "notes": "Follow up after meeting. Ask about project timeline.",
  "createdAt": "2025-12-10T08:30:00Z",
  "updatedAt": "2025-12-10T11:00:00Z"
}
```

---

### 5. Reorder Cards in Column

Reorder all cards within a specific column.

**Endpoint:** `POST /kanban/columns/:columnId/reorder`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| columnId | string | UUID of the column |

**Request Body:**

```json
{
  "cardIds": [
    "card-003",
    "card-001",
    "card-002"
  ]
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cardIds | string[] | Yes | Array of card UUIDs in new order |

**Response (200 OK):**

```json
[
  {
    "id": "card-003",
    "emailId": "email-uuid-003",
    "columnId": "col-todo-uuid",
    "order": 0,
    "updatedAt": "2025-12-10T11:05:00Z"
  },
  {
    "id": "card-001",
    "emailId": "email-uuid-001",
    "columnId": "col-todo-uuid",
    "order": 1,
    "updatedAt": "2025-12-10T11:05:00Z"
  },
  {
    "id": "card-002",
    "emailId": "email-uuid-002",
    "columnId": "col-todo-uuid",
    "order": 2,
    "updatedAt": "2025-12-10T11:05:00Z"
  }
]
```

---

## Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database error |

---

## Integration Examples

### Example 1: Get Board and Move Card

```bash
# Step 1: Get Kanban board
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/emails/kanban/board

# Step 2: Move card to another column
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailId":"email-123",
    "fromColumnId":"col-inbox",
    "toColumnId":"col-todo",
    "order":0
  }' \
  http://localhost:3000/api/emails/kanban/cards/move
```

### Example 2: Create Custom Column and Add Cards

```bash
# Step 1: Create new column
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Urgent",
    "order":5,
    "color":"#EF4444",
    "status":"urgent"
  }' \
  http://localhost:3000/api/emails/kanban/columns

# Step 2: Add cards to new column
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"columnId":"col-urgent-uuid","order":0}' \
  http://localhost:3000/api/emails/kanban/cards/email-123/add
```

---
