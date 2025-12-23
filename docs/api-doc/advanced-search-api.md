# Advanced Search API Documentation

## Overview
The Advanced Search API provides powerful search capabilities with criteria parsing and autosuggestion features for the frontend.

## Endpoints

### 1. Advanced Search
**POST** `/api/emails/search/advanced`

Search emails using structured criteria with support for multiple filters.

#### Request Body
```json
{
  "query": "from:john@example.com subject:meeting has:attachment is:starred",
  "folder": "inbox",
  "page": 1,
  "limit": 20,
  "forceSync": false
}
```

#### Search Criteria Syntax

| Criterion      | Syntax                   | Example                 | Description                |
| -------------- | ------------------------ | ----------------------- | -------------------------- |
| From           | `from:EMAIL`             | `from:john@example.com` | Filter by sender email     |
| To             | `to:EMAIL`               | `to:jane@example.com`   | Filter by recipient email  |
| Subject        | `subject:TEXT`           | `subject:meeting`       | Filter by subject content  |
| Contains       | `contains:TEXT`          | `contains:urgent`       | Search in body and subject |
| Has Attachment | `has:attachment`         | `has:attachment`        | Emails with attachments    |
| Read Status    | `is:read` or `is:unread` | `is:unread`             | Filter by read status      |
| Starred        | `is:starred`             | `is:starred`            | Only starred emails        |
| Folder         | `folder:NAME`            | `folder:sent`           | Specific folder/label      |

#### Multiple Criteria
You can combine multiple criteria:
```
from:john@example.com to:jane@example.com subject:meeting has:attachment is:unread
```

#### Response
```json
{
  "emails": [
    {
      "id": "uuid-123",
      "subject": "Team Meeting Tomorrow",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "to": ["jane@example.com"],
      "date": "2025-12-23T10:30:00.000Z",
      "snippet": "Hi team, let's meet tomorrow...",
      "read": false,
      "starred": true,
      "folder": "INBOX",
      "attachments": [...]
    }
  ],
  "criteria": {
    "from": ["john@example.com"],
    "to": ["jane@example.com"],
    "subject": ["meeting"],
    "hasAttachment": true,
    "isStarred": true
  },
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 2. Sender Suggestions
**GET** `/api/emails/suggestions/senders?query=john&limit=10`

Get autocomplete suggestions for sender emails.

#### Query Parameters
- `query` (required): Partial text to search
- `limit` (optional): Maximum results (default: 10)

#### Response
```json
[
  {
    "email": "john@example.com",
    "name": "John Doe",
    "displayText": "John Doe <john@example.com>"
  },
  {
    "email": "john.smith@company.com",
    "name": "John Smith",
    "displayText": "John Smith <john.smith@company.com>"
  }
]
```

---

### 3. Recipient Suggestions
**GET** `/api/emails/suggestions/recipients?query=team&limit=10`

Get autocomplete suggestions for recipient emails.

#### Query Parameters
- `query` (required): Partial text to search
- `limit` (optional): Maximum results (default: 10)

#### Response
```json
[
  {
    "email": "team@example.com",
    "displayText": "team@example.com"
  },
  {
    "email": "teamlead@company.com",
    "displayText": "teamlead@company.com"
  }
]
```

---

### 4. Subject Suggestions
**GET** `/api/emails/suggestions/subjects?query=meeting&limit=10`

Get autocomplete suggestions for email subjects.

#### Query Parameters
- `query` (required): Partial text to search
- `limit` (optional): Maximum results (default: 10)

#### Response
```json
[
  {
    "subject": "Weekly Team Meeting",
    "displayText": "Weekly Team Meeting"
  },
  {
    "subject": "Meeting Notes - Q4 Planning",
    "displayText": "Meeting Notes - Q4 Planning"
  }
]
```

---

## Frontend Integration Examples

### Search Bar with Autocomplete

```typescript
// User types in search bar
const searchQuery = "from:john subject:meeting";

// Call advanced search
const response = await fetch('/api/emails/search/advanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: searchQuery,
    page: 1,
    limit: 20
  })
});

const { emails, criteria, pagination } = await response.json();
```

### Autocomplete for "from:" criterion

```typescript
// User types "from:jo"
const query = "jo";

const suggestions = await fetch(
  `/api/emails/suggestions/senders?query=${encodeURIComponent(query)}&limit=5`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
).then(r => r.json());

// Show dropdown with suggestions
// When user selects: replace "from:jo" with "from:john@example.com"
```

### Real-time Search Suggestions

```typescript
const [searchText, setSearchText] = useState('');
const [suggestions, setSuggestions] = useState([]);

// Debounced search
useEffect(() => {
  const timer = setTimeout(async () => {
    if (searchText.includes('from:')) {
      // Extract partial email after "from:"
      const match = searchText.match(/from:([^\s]*)/);
      if (match && match[1]) {
        const senders = await fetchSenderSuggestions(match[1]);
        setSuggestions(senders);
      }
    } else if (searchText.includes('subject:')) {
      // Similar logic for subjects
      const match = searchText.match(/subject:([^\s]*)/);
      if (match && match[1]) {
        const subjects = await fetchSubjectSuggestions(match[1]);
        setSuggestions(subjects);
      }
    }
  }, 300);

  return () => clearTimeout(timer);
}, [searchText]);
```

---

## Search Tips for Users

1. **Combine criteria**: `from:john@example.com subject:urgent is:unread`
2. **Use quotes for phrases**: `subject:"project update"`
3. **Multiple senders**: `from:john@example.com from:jane@example.com`
4. **Negative search**: Use the general search for excluding terms
5. **Autocomplete**: Start typing after `:` to see suggestions

---

## Performance Notes

- Suggestions are sorted by frequency (most used first)
- Database indexes optimize search performance
- Results are cached when `forceSync=false`
- Maximum 100 results per query to prevent timeout
